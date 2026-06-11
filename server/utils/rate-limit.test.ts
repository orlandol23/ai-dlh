import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlidingWindowRateLimiter } from './rate-limit.js';

const WINDOW_MS = 60_000;
const MAX = 3;

let limiter: SlidingWindowRateLimiter;

beforeEach(() => {
  vi.useFakeTimers();
  limiter = new SlidingWindowRateLimiter({ windowMs: WINDOW_MS, max: MAX });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SlidingWindowRateLimiter — basic limiting', () => {
  it('allows exactly `max` hits inside one window and blocks the next', () => {
    for (let i = 0; i < MAX; i++) {
      expect(limiter.consume('user-1').allowed).toBe(true);
    }
    expect(limiter.consume('user-1').allowed).toBe(false);
  });

  it('reports retryAfterSeconds based on when the oldest hit leaves the window', () => {
    limiter.consume('user-1'); // oldest hit at t=0
    vi.advanceTimersByTime(10_000);
    limiter.consume('user-1');
    limiter.consume('user-1');

    const blocked = limiter.consume('user-1');
    expect(blocked.allowed).toBe(false);
    // Oldest hit (t=0) leaves the window at t=60s; we are at t=10s → ~50s.
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it('does not record blocked hits (denied requests cannot extend the lockout)', () => {
    for (let i = 0; i < MAX; i++) limiter.consume('user-1');

    // Hammering while blocked must not push the recovery point further out.
    for (let i = 0; i < 20; i++) {
      expect(limiter.consume('user-1').allowed).toBe(false);
    }

    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(limiter.consume('user-1').allowed).toBe(true);
  });
});

describe('SlidingWindowRateLimiter — sliding behavior', () => {
  it('frees one slot as soon as the oldest hit ages out (true sliding window)', () => {
    limiter.consume('user-1'); // t=0
    vi.advanceTimersByTime(30_000);
    limiter.consume('user-1'); // t=30s
    limiter.consume('user-1'); // t=30s
    expect(limiter.consume('user-1').allowed).toBe(false);

    // t=61s: only the t=0 hit has left the window → exactly one slot free.
    vi.advanceTimersByTime(31_000);
    expect(limiter.consume('user-1').allowed).toBe(true);
    expect(limiter.consume('user-1').allowed).toBe(false);
  });

  it('a burst right before a boundary cannot double the limit (no fixed buckets)', () => {
    // Fill the window at t=59s …
    vi.advanceTimersByTime(59_000);
    for (let i = 0; i < MAX; i++) limiter.consume('user-1');

    // … and crossing into "the next minute" must NOT grant a fresh budget.
    vi.advanceTimersByTime(2_000);
    expect(limiter.consume('user-1').allowed).toBe(false);
  });

  it('fully resets after a quiet period of one whole window', () => {
    for (let i = 0; i < MAX; i++) limiter.consume('user-1');
    expect(limiter.consume('user-1').allowed).toBe(false);

    vi.advanceTimersByTime(WINDOW_MS + 1);

    for (let i = 0; i < MAX; i++) {
      expect(limiter.consume('user-1').allowed).toBe(true);
    }
    expect(limiter.consume('user-1').allowed).toBe(false);
  });
});

describe('SlidingWindowRateLimiter — key isolation', () => {
  it('tracks each user independently', () => {
    for (let i = 0; i < MAX; i++) limiter.consume('user-1');
    expect(limiter.consume('user-1').allowed).toBe(false);

    // user-2 still has a full budget.
    for (let i = 0; i < MAX; i++) {
      expect(limiter.consume('user-2').allowed).toBe(true);
    }
    expect(limiter.consume('user-2').allowed).toBe(false);
  });

  it("one user's lockout never delays another user's recovery", () => {
    for (let i = 0; i < MAX; i++) limiter.consume('user-1');

    vi.advanceTimersByTime(30_000);
    for (let i = 0; i < MAX; i++) limiter.consume('user-2');

    // t=61s: user-1's hits (t=0) expired; user-2's (t=30s) did not.
    vi.advanceTimersByTime(31_000);
    expect(limiter.consume('user-1').allowed).toBe(true);
    expect(limiter.consume('user-2').allowed).toBe(false);
  });

  it('separate limiter instances are independent (per-procedure windows)', () => {
    const other = new SlidingWindowRateLimiter({ windowMs: WINDOW_MS, max: 1 });

    expect(other.consume('user-1').allowed).toBe(true);
    expect(other.consume('user-1').allowed).toBe(false);
    // Same key on the original limiter is untouched.
    expect(limiter.consume('user-1').allowed).toBe(true);
  });
});
