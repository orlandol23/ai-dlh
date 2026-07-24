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
 *
 * Note: `getUserProgress` is capped at 50 records server-side, so the day
 * streak is computed over the most recent 50 attempts. That only under-counts
 * for users doing 50+ quizzes inside the streak window — acceptable for a
 * display badge.
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
 * All-time aggregates the achievement panel needs. Server computes these
 * once over the full progress_records table (see progress.getStatistics)
 * because getUserProgress is capped at 50 records — counting client-side
 * over a truncated view would lock achievements for power users.
 */
export interface AchievementsStats {
  modulesGenerated: number;
  passedModules: number;
  onChainRecords: number;
  highScoreCount: number;
  hasPerfectScore: boolean;
  distinctTopicsCount: number;
  currentStreakCapped: number;
}

/**
 * Derives the achievement set from server-aggregated stats. Pure
 * function over numbers — no record traversal here, so the result is
 * correct regardless of how many records exist on the backend.
 *
 * Labels/descriptions are NOT returned here — consumers resolve them via
 * `t('dashboard:achievements.items.<id>.label')` so achievements stay localized.
 *
 * When `streakDays` is provided (computed client-side from progress records
 * via `calculateStreakDays`, since the server stats have no day-granular
 * data), the day-streak achievements (streak-3/7/30) are appended.
 */
export function deriveAchievements(
  stats: AchievementsStats,
  streakDays?: number
): Achievement[] {
  const achievements: Achievement[] = [
    {
      id: 'first-step',
      emoji: '🎯',
      unlocked: stats.modulesGenerated >= 1,
      progress: { current: Math.min(stats.modulesGenerated, 1), target: 1 },
    },
    {
      id: 'on-chain',
      emoji: '⛓️',
      unlocked: stats.onChainRecords >= 1,
      progress: { current: Math.min(stats.onChainRecords, 1), target: 1 },
    },
    {
      id: 'perfectionist',
      emoji: '🏆',
      unlocked: stats.hasPerfectScore,
    },
    {
      id: 'high-flyer',
      emoji: '🔥',
      unlocked: stats.highScoreCount >= 5,
      progress: { current: Math.min(stats.highScoreCount, 5), target: 5 },
    },
    {
      id: 'polymath',
      emoji: '📊',
      unlocked: stats.distinctTopicsCount >= 3,
      progress: { current: Math.min(stats.distinctTopicsCount, 3), target: 3 },
    },
    {
      id: 'streak',
      emoji: '🎉',
      unlocked: stats.currentStreakCapped >= 3,
      progress: { current: Math.min(stats.currentStreakCapped, 3), target: 3 },
    },
  ];

  if (streakDays !== undefined) {
    achievements.push(
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
      }
    );
  }

  return achievements;
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
