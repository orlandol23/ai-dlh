export interface ProgressLike {
  score: number;
  completedAt: string | Date;
  blockchainStatus: string;
  transactionHash: string | null;
  module?: { topic?: string | null } | null;
}

export type AchievementId =
  | 'first-step'
  | 'on-chain'
  | 'perfectionist'
  | 'high-flyer'
  | 'polymath'
  | 'streak';

export interface Achievement {
  id: AchievementId;
  emoji: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
}

/**
 * Derives the achievement set client-side from progress records.
 * Backend has no /achievements endpoint yet — this is the source of truth.
 *
 * Labels/descriptions are NOT returned here — consumers resolve them via
 * `t('dashboard:achievements.items.<id>.label')` so achievements stay localized.
 */
export function deriveAchievements(records: ProgressLike[]): Achievement[] {
  const onChain = records.filter((r) => r.blockchainStatus === 'confirmed').length;
  const perfect = records.some((r) => r.score === 100);
  const high = records.filter((r) => r.score >= 90).length;
  const topics = new Set(
    records.map((r) => r.module?.topic).filter((t): t is string => !!t)
  );

  const sortedDesc = [...records].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  let streak = 0;
  for (const r of sortedDesc) {
    if (r.score >= 70) streak += 1;
    else break;
  }

  return [
    {
      id: 'first-step',
      emoji: '🎯',
      unlocked: records.length >= 1,
      progress: { current: Math.min(records.length, 1), target: 1 },
    },
    {
      id: 'on-chain',
      emoji: '⛓️',
      unlocked: onChain >= 1,
      progress: { current: Math.min(onChain, 1), target: 1 },
    },
    {
      id: 'perfectionist',
      emoji: '🏆',
      unlocked: perfect,
    },
    {
      id: 'high-flyer',
      emoji: '🔥',
      unlocked: high >= 5,
      progress: { current: Math.min(high, 5), target: 5 },
    },
    {
      id: 'polymath',
      emoji: '📊',
      unlocked: topics.size >= 3,
      progress: { current: Math.min(topics.size, 3), target: 3 },
    },
    {
      id: 'streak',
      emoji: '🎉',
      unlocked: streak >= 3,
      progress: { current: Math.min(streak, 3), target: 3 },
    },
  ];
}

export interface SparklinePoint {
  score: number;
  completedAt: Date;
}

/** Returns the last N records for sparkline (oldest → newest). */
export function buildSparklinePoints(
  records: ProgressLike[],
  count = 12
): SparklinePoint[] {
  return [...records]
    .sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    )
    .slice(-count)
    .map((r) => ({
      score: r.score,
      completedAt: new Date(r.completedAt),
    }));
}
