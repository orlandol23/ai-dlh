/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Keeps one timestamp array per key (typically a userId) and counts how
 * many hits fall inside the window at check time — a true sliding window,
 * not fixed buckets, so a burst right before a bucket boundary can't
 * double the effective limit.
 *
 * In-memory on purpose: the server runs as a single Railway instance and
 * these limits protect expensive side effects (Gemini quota, custodial
 * wallet ETH), where "reset on redeploy" is an acceptable trade-off.
 * If the backend ever scales horizontally, swap the store for Redis.
 */

interface ConsumeResult {
  /** Whether the hit was allowed (and recorded). */
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window (only when blocked). */
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(options: { windowMs: number; max: number }) {
    this.windowMs = options.windowMs;
    this.max = options.max;

    // Periodically drop keys whose hits all fell out of the window so the
    // Map doesn't grow forever with one-off users. unref() keeps this
    // timer from holding the process open (matters for tests/shutdown).
    const sweeper = setInterval(() => this.sweep(), this.windowMs);
    if (typeof sweeper.unref === 'function') sweeper.unref();
  }

  /**
   * Record a hit for `key` if it is under the limit.
   * Returns whether the hit was allowed and, if not, when to retry.
   */
  consume(key: string): ConsumeResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.max) {
      // Oldest hit in the window defines when a slot frees up.
      const oldest = recent[0];
      this.hits.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private sweep(): void {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.hits) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= windowStart) {
        this.hits.delete(key);
      }
    }
  }
}
