import { describe, expect, it } from 'vitest';
import { buildSparklinePoints, deriveAchievements, type ProgressLike } from './achievements';

const record = (overrides: Partial<ProgressLike> & { score: number; daysAgo: number }): ProgressLike => ({
  score: overrides.score,
  blockchainStatus: overrides.blockchainStatus ?? 'none',
  transactionHash: overrides.transactionHash ?? null,
  module: overrides.module ?? { topic: 'TypeScript' },
  completedAt: new Date(Date.now() - overrides.daysAgo * 86_400_000).toISOString(),
});

describe('deriveAchievements', () => {
  it('locks every achievement when there is no progress yet', () => {
    const out = deriveAchievements([]);

    expect(out).toHaveLength(6);
    expect(out.every((a) => !a.unlocked)).toBe(true);
  });

  it('unlocks first-step the moment any record exists', () => {
    const out = deriveAchievements([record({ score: 50, daysAgo: 0 })]);

    expect(out.find((a) => a.id === 'first-step')?.unlocked).toBe(true);
  });

  it('unlocks on-chain only when at least one record is confirmed', () => {
    const passedButNotOnChain = record({ score: 90, daysAgo: 0 });
    const passedAndOnChain = record({
      score: 90,
      daysAgo: 0,
      blockchainStatus: 'confirmed',
      transactionHash: '0xabc',
    });

    expect(deriveAchievements([passedButNotOnChain]).find((a) => a.id === 'on-chain')?.unlocked).toBe(false);
    expect(deriveAchievements([passedAndOnChain]).find((a) => a.id === 'on-chain')?.unlocked).toBe(true);
  });

  it('only unlocks perfectionist on a 100% score', () => {
    const ninetyNine = deriveAchievements([record({ score: 99, daysAgo: 0 })]);
    const hundred = deriveAchievements([record({ score: 100, daysAgo: 0 })]);

    expect(ninetyNine.find((a) => a.id === 'perfectionist')?.unlocked).toBe(false);
    expect(hundred.find((a) => a.id === 'perfectionist')?.unlocked).toBe(true);
  });

  it('streak counts only consecutive passes from the most recent record', () => {
    // Most recent first: pass, pass, fail, pass — fail breaks the chain.
    const records: ProgressLike[] = [
      record({ score: 80, daysAgo: 0 }),
      record({ score: 90, daysAgo: 1 }),
      record({ score: 50, daysAgo: 2 }), // <— breaks streak
      record({ score: 100, daysAgo: 3 }),
    ];

    const streak = deriveAchievements(records).find((a) => a.id === 'streak');

    expect(streak?.progress?.current).toBe(2);
    expect(streak?.unlocked).toBe(false); // target is 3
  });

  it('counts polymath topics by distinct module.topic, ignoring missing values', () => {
    const records: ProgressLike[] = [
      record({ score: 80, daysAgo: 0, module: { topic: 'TypeScript' } }),
      record({ score: 80, daysAgo: 1, module: { topic: 'React' } }),
      record({ score: 80, daysAgo: 2, module: { topic: 'TypeScript' } }), // duplicate
      record({ score: 80, daysAgo: 3, module: null }), // ignored
    ];

    const polymath = deriveAchievements(records).find((a) => a.id === 'polymath');

    expect(polymath?.progress?.current).toBe(2);
    expect(polymath?.unlocked).toBe(false);
  });
});

describe('buildSparklinePoints', () => {
  it('returns an empty array when there is no input', () => {
    expect(buildSparklinePoints([])).toEqual([]);
  });

  it('caps the number of points and orders them oldest → newest', () => {
    const records: ProgressLike[] = Array.from({ length: 20 }, (_, i) =>
      record({ score: i * 5, daysAgo: 20 - i })
    );

    const points = buildSparklinePoints(records, 12);

    expect(points).toHaveLength(12);
    // Oldest first: completedAt ascending.
    for (let i = 1; i < points.length; i++) {
      expect(points[i].completedAt.getTime()).toBeGreaterThanOrEqual(
        points[i - 1].completedAt.getTime()
      );
    }
    // The last 12 of a 20-record stream are scores 40..95 (i = 8..19).
    expect(points[0].score).toBe(40);
    expect(points[points.length - 1].score).toBe(95);
  });
});
