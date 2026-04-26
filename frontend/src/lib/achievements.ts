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
  | 'streak'
  | 'streak-3'
  | 'streak-7'
  | 'streak-30';

export interface Achievement {
  id: AchievementId;
  emoji: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
}

/**
 * Counts consecutive days of activity (any completed quiz, regardless of score)
 * ending today, anchored on the user's local timezone day boundary.
 *
 * Without timezone awareness, a user in Tokyo could "lose" their streak just
 * because their local day starts ~9h before UTC midnight.
 */
export function calculateStreakDays(records: ProgressLike[], timezone?: string): number {
  if (records.length === 0) return 0;
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

  const days = new Set(records.map((r) => dayKey(new Date(r.completedAt))));
  let streak = 0;
  const cursor = new Date();
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Derives the achievement set client-side from progress records.
 * Backend has no /achievements endpoint yet — this is the source of truth.
 *
 * Labels/descriptions are NOT returned here — consumers resolve them via
 * `t('dashboard:achievements.items.<id>.label')` so achievements stay localized.
 */
export function deriveAchievements(records: ProgressLike[], timezone?: string): Achievement[] {
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

  const streakDays = calculateStreakDays(records, timezone);

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
    {
      id: 'streak-3',
      emoji: '🔥',
      unlocked: streakDays >= 3,
      progress: { current: Math.min(streakDays, 3), target: 3 },
    },
    {
      id: 'streak-7',
      emoji: '🔥',
      unlocked: streakDays >= 7,
      progress: { current: Math.min(streakDays, 7), target: 7 },
    },
    {
      id: 'streak-30',
      emoji: '🔥',
      unlocked: streakDays >= 30,
      progress: { current: Math.min(streakDays, 30), target: 30 },
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
