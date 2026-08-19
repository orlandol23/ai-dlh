import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { progressRecords, type BlockchainStatus } from '../db/schema.js';
import { web3Service, NonRetryableBlockchainError } from './web3.service.js';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { captureException } from '../utils/sentry.js';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Exponential backoff schedule between send attempts.
 *
 * Attempt N failed → wait RETRY_BACKOFF_MS[N-1] before attempt N+1
 * (clamped to the last entry). With the default
 * BLOCKCHAIN_QUEUE_MAX_ATTEMPTS=5 a record is retried at
 * +1min, +5min, +30min, +30min before becoming `failed_permanent`.
 */
export const RETRY_BACKOFF_MS = [60_000, 300_000, 1_800_000] as const;

/** Backoff to apply after `attempt` (1-based) failed. */
export function backoffForAttempt(attempt: number): number {
  const idx = Math.min(Math.max(attempt, 1), RETRY_BACKOFF_MS.length) - 1;
  return RETRY_BACKOFF_MS[idx];
}

/** Statuses a worker is allowed to claim (plus stale `processing`). */
const CLAIMABLE_STATUSES: BlockchainStatus[] = ['pending', 'failed'];

/** Max records pulled per tick. Keeps a burst of submissions from
 * monopolizing one tick forever; leftovers are picked up next tick. */
const BATCH_SIZE = 10;

/** Shape of a queue candidate (progress record + owning module's topic). */
interface QueueCandidate {
  id: number;
  moduleId: number;
  score: number;
  blockchainStatus: string;
  blockchainAttempts: number;
  module: { topic: string } | null;
}

/**
 * In-process asynchronous worker that writes passing quiz completions
 * on-chain (roadmap Onda 2: "fila/retry para escrita on-chain").
 *
 * Flow:
 *  - `submitQuiz` only INSERTs the record with `blockchain_status='pending'`
 *    and returns immediately — the HTTP response no longer waits for the
 *    Sepolia confirmation (which can take minutes when gas spikes).
 *  - The endpoints that enqueue work also call `wake()`, so a fresh record
 *    is processed within milliseconds. Each poll claims records that are
 *    `pending`, `failed` past their `blockchain_next_attempt_at`, or stuck
 *    in `processing` longer than BLOCKCHAIN_STALE_LOCK_MS (crash recovery),
 *    and processes them sequentially. While the queue is busy the loop
 *    re-polls every BLOCKCHAIN_QUEUE_INTERVAL_MS; once empty it sleeps
 *    until the earliest scheduled retry / stale lock, or the
 *    BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS safety net when nothing is parked —
 *    an idle deployment must not keep waking a scale-to-zero database
 *    (see idleWaitMs for the billing arithmetic that forces this).
 *
 * Claim semantics (idempotency):
 *  - A record is claimed via a single conditional UPDATE
 *    (`... WHERE id = ? AND status IN ('pending','failed') ...` RETURNING)
 *    that also flips it to `processing` and increments the attempt
 *    counter. The UPDATE is atomic in Postgres, so even if two pollers
 *    select the same candidate, exactly one claim succeeds — the loser's
 *    WHERE no longer matches and it skips the record.
 *
 * Single-instance limitation (documented on purpose):
 *  - This worker is designed for the current single-server deployment
 *    (Railway, one container). The conditional-UPDATE claim is safe even
 *    with multiple instances, BUT the stale-lock reclaim is not: if an
 *    instance takes longer than BLOCKCHAIN_STALE_LOCK_MS to confirm a tx
 *    (default 10 min vs. tx timeout ~3 min, so there is headroom), another
 *    instance could reclaim the row and double-submit. Sequential sending
 *    per process is also what makes the fee-bump nonce strategy in
 *    web3.service safe. For horizontal scaling, move the claim to
 *    `FOR UPDATE SKIP LOCKED` in a transaction and elect a single worker
 *    (or use an external queue).
 */
export class BlockchainQueueService {
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private running = false;
  /** Set when wake() lands while a tick is in flight; the tick's finally
   * block consumes it and re-polls immediately instead of sleeping. */
  private wakeRequested = false;
  /** Current wait between polls. Grows while failing, snaps back on work. */
  private intervalMs = config.BLOCKCHAIN_QUEUE_INTERVAL_MS;

  /** Current poll interval in ms. Exposed for tests and diagnostics. */
  get currentIntervalMs(): number {
    return this.intervalMs;
  }

  /** Start the polling loop. No-op if already started. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalMs = config.BLOCKCHAIN_QUEUE_INTERVAL_MS;
    logger.info(
      `Blockchain queue worker started (interval ${config.BLOCKCHAIN_QUEUE_INTERVAL_MS}ms, ` +
        `idle safety net every ${config.BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS}ms, ` +
        `max ${config.BLOCKCHAIN_QUEUE_MAX_ATTEMPTS} attempts)`
    );
    // Drain anything left over from a previous run right away. This also
    // schedules the next poll, so start() never needs its own timer.
    void this.tick();
  }

  /** Stop the polling loop (graceful shutdown). */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.wakeRequested = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.intervalMs = config.BLOCKCHAIN_QUEUE_INTERVAL_MS;
    logger.info('Blockchain queue worker stopped');
  }

  /**
   * Poll now instead of waiting out the current sleep. Called by the
   * endpoints that enqueue work (submitQuiz, retryBlockchain), which is
   * what lets the idle loop sleep for hours without adding latency: new
   * work is pushed to the worker, never discovered by polling.
   *
   * Safe to call at any moment: while the worker sleeps the timer is
   * cancelled and a tick runs immediately; while a tick is in flight the
   * request is remembered and honoured right after it (so a record
   * inserted mid-tick is never left to the safety net); when the worker
   * is stopped it is a no-op (start() drains on boot anyway).
   */
  wake(): void {
    if (!this.running) return;
    this.intervalMs = config.BLOCKCHAIN_QUEUE_INTERVAL_MS;
    if (this.ticking) {
      this.wakeRequested = true;
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    void this.tick();
  }

  /**
   * Decide how long to sleep after an empty (successful) poll.
   *
   * The old behaviour — double the wait per empty poll up to a 30min
   * ceiling — still woke a scale-to-zero Postgres 48 times a day, and the
   * provider bills a full suspend-window minimum (~5min on Neon's free
   * plan) per wakeup: ~4h of billed compute per idle day, which is how the
   * monthly allowance kept evaporating with zero traffic even after the
   * poll rate was reduced. What matters is the NUMBER of wakeups, not the
   * number of queries.
   *
   * Since work now arrives via wake() (and a crash between insert and wake
   * restarts the process, whose boot drain picks the record up), an empty
   * queue needs no gradual ramp: sleep straight to the safety-net ceiling.
   * The only time-based reason to wake earlier is a record already parked
   * for the future — a `failed` row waiting out its retry backoff, or a
   * `processing` row that becomes reclaimable when its lock goes stale —
   * so sleep exactly until the earliest of those, never past the ceiling,
   * and never below the base interval.
   */
  private async idleWaitMs(): Promise<number> {
    const nextWorkAt = await this.nextScheduledWorkAt();
    if (nextWorkAt === null) return config.BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS;
    return Math.min(
      config.BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS,
      Math.max(config.BLOCKCHAIN_QUEUE_INTERVAL_MS, nextWorkAt.getTime() - Date.now())
    );
  }

  /**
   * Earliest future moment a currently-parked record becomes claimable,
   * or null when nothing is parked. Runs right after an empty poll, while
   * the database is awake anyway — it never causes a wakeup of its own.
   */
  private async nextScheduledWorkAt(): Promise<Date | null> {
    const [nextRetry, oldestProcessing] = await Promise.all([
      // `failed` rows always carry blockchain_next_attempt_at (set by
      // handleSendFailure when scheduling the retry).
      db.query.progressRecords.findFirst({
        where: eq(progressRecords.blockchainStatus, 'failed'),
        orderBy: [asc(progressRecords.blockchainNextAttemptAt)],
        columns: { blockchainNextAttemptAt: true },
      }),
      // In-flight rows become reclaimable (crash recovery) once their
      // lock is older than BLOCKCHAIN_STALE_LOCK_MS.
      db.query.progressRecords.findFirst({
        where: eq(progressRecords.blockchainStatus, 'processing'),
        orderBy: [asc(progressRecords.blockchainLockedAt)],
        columns: { blockchainLockedAt: true },
      }),
    ]);

    const candidates: number[] = [];
    if (nextRetry?.blockchainNextAttemptAt) {
      candidates.push(nextRetry.blockchainNextAttemptAt.getTime());
    }
    if (oldestProcessing?.blockchainLockedAt) {
      candidates.push(
        oldestProcessing.blockchainLockedAt.getTime() + config.BLOCKCHAIN_STALE_LOCK_MS
      );
    }
    return candidates.length > 0 ? new Date(Math.min(...candidates)) : null;
  }

  /** Schedule the next poll, unless the worker has been stopped. */
  private scheduleNext(): void {
    if (!this.running) return;
    // A wake() that landed mid-tick must not wait out an idle sleep —
    // there is a fresh record the finished tick's SELECT predates.
    const delayMs = this.wakeRequested ? 0 : this.intervalMs;
    this.wakeRequested = false;
    this.timer = setTimeout(() => {
      void this.tick();
    }, delayMs);
    // Don't keep the process alive just for the poller.
    this.timer.unref?.();
  }

  /**
   * One guarded tick — never overlaps with a previous tick still running,
   * and always schedules the next one, success or failure.
   */
  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    const previous = this.intervalMs;
    try {
      const processed = await this.processOnce();
      // Found work -> keep the fast cadence; the queue should drain at
      // full speed. Empty -> sleep until the next scheduled retry/stale
      // lock, or the safety-net ceiling when nothing is parked.
      this.intervalMs =
        processed > 0 ? config.BLOCKCHAIN_QUEUE_INTERVAL_MS : await this.idleWaitMs();
      if (this.intervalMs !== previous) {
        logger.debug(
          `Blockchain queue poll interval ${previous}ms -> ${this.intervalMs}ms ` +
            `(${processed} record(s) processed)`
        );
      }
    } catch (error) {
      // Never let a poll failure (e.g. DB hiccup) kill the loop. Back off
      // exponentially so a database that is down or over quota gets left
      // alone instead of hammered every base interval.
      logger.error('Blockchain queue tick failed', { error });
      captureException(error, { worker: 'blockchain-queue', stage: 'tick' });
      this.intervalMs = Math.min(previous * 2, config.BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS);
    } finally {
      this.ticking = false;
      this.scheduleNext();
    }
  }

  /**
   * Process up to BATCH_SIZE eligible records, sequentially.
   * Public for tests and for the manual drain on start().
   *
   * @returns how many records were picked up. The poll loop uses this to
   *          decide whether to keep the fast cadence or back off.
   */
  async processOnce(): Promise<number> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - config.BLOCKCHAIN_STALE_LOCK_MS);

    const candidates = (await db.query.progressRecords.findMany({
      where: or(
        and(
          inArray(progressRecords.blockchainStatus, CLAIMABLE_STATUSES),
          or(
            isNull(progressRecords.blockchainNextAttemptAt),
            lte(progressRecords.blockchainNextAttemptAt, now)
          )
        ),
        // Crash recovery: rows claimed by a worker that died mid-send.
        and(
          eq(progressRecords.blockchainStatus, 'processing'),
          lte(progressRecords.blockchainLockedAt, staleBefore)
        )
      ),
      orderBy: [asc(progressRecords.completedAt)],
      limit: BATCH_SIZE,
      columns: {
        id: true,
        moduleId: true,
        score: true,
        blockchainStatus: true,
        blockchainAttempts: true,
      },
      with: {
        module: { columns: { topic: true } },
      },
    })) as QueueCandidate[];

    for (const candidate of candidates) {
      // Sequential on purpose: one in-flight tx at a time keeps the nonce
      // strategy in web3.service simple and correct.
      await this.processCandidate(candidate, staleBefore);
    }

    return candidates.length;
  }

  /** Claim a single record and attempt the on-chain write. */
  private async processCandidate(
    candidate: QueueCandidate,
    staleBefore: Date
  ): Promise<void> {
    // Atomic claim: only succeeds if the row is still in a claimable
    // state. Increments the attempt counter at claim time so a crash
    // between claim and send still counts as a consumed attempt.
    const claimed = (await db
      .update(progressRecords)
      .set({
        blockchainStatus: 'processing',
        blockchainLockedAt: new Date(),
        blockchainAttempts: sql`${progressRecords.blockchainAttempts} + 1`,
      })
      .where(
        and(
          eq(progressRecords.id, candidate.id),
          or(
            inArray(progressRecords.blockchainStatus, CLAIMABLE_STATUSES),
            and(
              eq(progressRecords.blockchainStatus, 'processing'),
              lte(progressRecords.blockchainLockedAt, staleBefore)
            )
          )
        )
      )
      .returning({
        id: progressRecords.id,
        moduleId: progressRecords.moduleId,
        score: progressRecords.score,
        blockchainAttempts: progressRecords.blockchainAttempts,
      })) as Array<{
      id: number;
      moduleId: number;
      score: number;
      blockchainAttempts: number;
    }>;

    const record = claimed[0];
    if (!record) {
      // Someone else (another tick / instance) claimed it first.
      logger.debug(`Queue record ${candidate.id} already claimed — skipping`);
      return;
    }

    if (!candidate.module) {
      // Module row was deleted; the on-chain payload needs its topic and
      // can never be produced again. Permanent by construction.
      await this.markFailedPermanent(record.id, 'Owning module no longer exists');
      return;
    }

    try {
      const receipt = await web3Service.recordCompletion(
        record.moduleId,
        record.score,
        candidate.module.topic,
        config.BLOCKCHAIN_TX_TIMEOUT_MS
      );

      await db
        .update(progressRecords)
        .set({
          blockchainStatus: 'confirmed',
          transactionHash: receipt.hash,
          blockchainError: null,
          blockchainLockedAt: null,
          blockchainNextAttemptAt: null,
        })
        .where(eq(progressRecords.id, record.id));

      logger.info(
        `Queue record ${record.id} confirmed on-chain: ${receipt.hash} ` +
          `(attempt ${record.blockchainAttempts})`
      );
    } catch (error) {
      await this.handleSendFailure(record, error);
    }
  }

  /** Decide between scheduling a retry and giving up permanently. */
  private async handleSendFailure(
    record: { id: number; blockchainAttempts: number },
    error: unknown
  ): Promise<void> {
    const message = getErrorMessage(error);

    // Observability (C1): every failed send is reported with enough
    // context to find the row — the wallet address is public by design;
    // no key material ever leaves this process.
    captureException(error, {
      worker: 'blockchain-queue',
      recordId: record.id,
      attempt: record.blockchainAttempts,
    });

    if (error instanceof NonRetryableBlockchainError) {
      logger.error(
        `Queue record ${record.id} failed permanently (non-retryable): ${message}`
      );
      await this.markFailedPermanent(record.id, message);
      return;
    }

    if (record.blockchainAttempts >= config.BLOCKCHAIN_QUEUE_MAX_ATTEMPTS) {
      logger.error(
        `Queue record ${record.id} failed permanently after ` +
          `${record.blockchainAttempts} attempts: ${message}`
      );
      await this.markFailedPermanent(record.id, message);
      return;
    }

    const delayMs = backoffForAttempt(record.blockchainAttempts);
    const nextAttemptAt = new Date(Date.now() + delayMs);
    logger.warn(
      `Queue record ${record.id} attempt ${record.blockchainAttempts} failed; ` +
        `retrying in ${Math.round(delayMs / 1000)}s: ${message}`
    );

    await db
      .update(progressRecords)
      .set({
        blockchainStatus: 'failed',
        blockchainError: message,
        blockchainNextAttemptAt: nextAttemptAt,
        blockchainLockedAt: null,
      })
      .where(eq(progressRecords.id, record.id));
  }

  private async markFailedPermanent(recordId: number, message: string): Promise<void> {
    await db
      .update(progressRecords)
      .set({
        blockchainStatus: 'failed_permanent',
        blockchainError: message,
        blockchainNextAttemptAt: null,
        blockchainLockedAt: null,
      })
      .where(eq(progressRecords.id, recordId));
  }
}

// Singleton used by index.ts; tests instantiate their own.
export const blockchainQueueService = new BlockchainQueueService();
