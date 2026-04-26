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
  label: string;
  emoji: string;
  description: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
}

/**
 * All-time aggregates the achievement panel needs. Server computes these
 * once over the full progress_records table (see progress.getStatistics)
 * because getUserProgress is capped at 50 records — counting client-side
 * over a truncated view would lock achievements for power users.
 */
export interface AchievementsStats {
  totalModules: number;
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
 */
export function deriveAchievements(stats: AchievementsStats): Achievement[] {
  return [
    {
      id: 'first-step',
      label: 'Primeiro Passo',
      emoji: '🎯',
      description: 'Complete seu primeiro módulo',
      unlocked: stats.totalModules >= 1,
      progress: { current: Math.min(stats.totalModules, 1), target: 1 },
    },
    {
      id: 'on-chain',
      label: 'Certificado On-chain',
      emoji: '⛓️',
      description: '1 certificado registrado na blockchain',
      unlocked: stats.onChainRecords >= 1,
      progress: { current: Math.min(stats.onChainRecords, 1), target: 1 },
    },
    {
      id: 'perfectionist',
      label: 'Perfeccionista',
      emoji: '🏆',
      description: 'Score de 100% em algum quiz',
      unlocked: stats.hasPerfectScore,
    },
    {
      id: 'high-flyer',
      label: 'Voo Alto',
      emoji: '🔥',
      description: '5 quizzes com score ≥90%',
      unlocked: stats.highScoreCount >= 5,
      progress: { current: Math.min(stats.highScoreCount, 5), target: 5 },
    },
    {
      id: 'polymath',
      label: 'Polímata',
      emoji: '📊',
      description: 'Estude 3 tópicos diferentes',
      unlocked: stats.distinctTopicsCount >= 3,
      progress: { current: Math.min(stats.distinctTopicsCount, 3), target: 3 },
    },
    {
      id: 'streak',
      label: 'Sequência',
      emoji: '🎉',
      description: '3 aprovações consecutivas',
      unlocked: stats.currentStreakCapped >= 3,
      progress: { current: Math.min(stats.currentStreakCapped, 3), target: 3 },
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
