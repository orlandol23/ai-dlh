import { describe, expect, it } from 'vitest';
import {
  buildSparklinePoints,
  deriveAchievements,
  type AchievementsStats,
  type ProgressLike,
} from './achievements';

const makeStats = (overrides: Partial<AchievementsStats> = {}): AchievementsStats => ({
  totalModules: 0,
  passedModules: 0,
  onChainRecords: 0,
  highScoreCount: 0,
  hasPerfectScore: false,
  distinctTopicsCount: 0,
  currentStreakCapped: 0,
  ...overrides,
});

const record = (overrides: { score: number; daysAgo: number }): ProgressLike => ({
  score: overrides.score,
  blockchainStatus: 'none',
  transactionHash: null,
  module: { topic: 'TypeScript' },
  completedAt: new Date(Date.now() - overrides.daysAgo * 86_400_000).toISOString(),
});

describe('deriveAchievements', () => {
  it('locks every achievement on the empty/zero stats', () => {
    const out = deriveAchievements(makeStats());

    expect(out).toHaveLength(6);
    expect(out.every((a) => !a.unlocked)).toBe(true);
  });

  it('unlocks first-step at totalModules >= 1', () => {
    const out = deriveAchievements(makeStats({ totalModules: 1 }));

    expect(out.find((a) => a.id === 'first-step')?.unlocked).toBe(true);
  });

  it('unlocks on-chain only when onChainRecords >= 1', () => {
    const noOnChain = deriveAchievements(makeStats({ totalModules: 1 }));
    const oneOnChain = deriveAchievements(
      makeStats({ totalModules: 1, onChainRecords: 1 })
    );

    expect(noOnChain.find((a) => a.id === 'on-chain')?.unlocked).toBe(false);
    expect(oneOnChain.find((a) => a.id === 'on-chain')?.unlocked).toBe(true);
  });

  it('only unlocks perfectionist when hasPerfectScore is true', () => {
    const noPerfect = deriveAchievements(makeStats({ highScoreCount: 4 }));
    const perfect = deriveAchievements(makeStats({ hasPerfectScore: true }));

    expect(noPerfect.find((a) => a.id === 'perfectionist')?.unlocked).toBe(false);
    expect(perfect.find((a) => a.id === 'perfectionist')?.unlocked).toBe(true);
  });

  it('high-flyer needs 5 high scores; below that it stays locked with progress', () => {
    const four = deriveAchievements(makeStats({ highScoreCount: 4 }));
    const five = deriveAchievements(makeStats({ highScoreCount: 5 }));

    const fourHF = four.find((a) => a.id === 'high-flyer');
    const fiveHF = five.find((a) => a.id === 'high-flyer');

    expect(fourHF?.unlocked).toBe(false);
    expect(fourHF?.progress).toEqual({ current: 4, target: 5 });
    expect(fiveHF?.unlocked).toBe(true);
  });

  it('polymath needs 3 distinct topics', () => {
    const two = deriveAchievements(makeStats({ distinctTopicsCount: 2 }));
    const three = deriveAchievements(makeStats({ distinctTopicsCount: 3 }));

    expect(two.find((a) => a.id === 'polymath')?.unlocked).toBe(false);
    expect(three.find((a) => a.id === 'polymath')?.unlocked).toBe(true);
  });

  it('streak unlocks at currentStreakCapped >= 3 and caps progress display at 3', () => {
    const two = deriveAchievements(makeStats({ currentStreakCapped: 2 }));
    const three = deriveAchievements(makeStats({ currentStreakCapped: 3 }));
    const ten = deriveAchievements(makeStats({ currentStreakCapped: 10 }));

    expect(two.find((a) => a.id === 'streak')?.unlocked).toBe(false);
    expect(three.find((a) => a.id === 'streak')?.unlocked).toBe(true);
    expect(ten.find((a) => a.id === 'streak')?.progress).toEqual({ current: 3, target: 3 });
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
    for (let i = 1; i < points.length; i++) {
      expect(points[i].completedAt.getTime()).toBeGreaterThanOrEqual(
        points[i - 1].completedAt.getTime()
      );
    }
    // Last 12 of a 20-record stream are scores 40..95 (i = 8..19).
    expect(points[0].score).toBe(40);
    expect(points[points.length - 1].score).toBe(95);
  });
});
