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
 * Derives the achievement set client-side from progress records.
 * Backend has no /achievements endpoint yet — this is the source of truth.
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
      label: 'Primeiro Passo',
      emoji: '🎯',
      description: 'Complete seu primeiro módulo',
      unlocked: records.length >= 1,
      progress: { current: Math.min(records.length, 1), target: 1 },
    },
    {
      id: 'on-chain',
      label: 'Certificado On-chain',
      emoji: '⛓️',
      description: '1 certificado registrado na blockchain',
      unlocked: onChain >= 1,
      progress: { current: Math.min(onChain, 1), target: 1 },
    },
    {
      id: 'perfectionist',
      label: 'Perfeccionista',
      emoji: '🏆',
      description: 'Score de 100% em algum quiz',
      unlocked: perfect,
    },
    {
      id: 'high-flyer',
      label: 'Voo Alto',
      emoji: '🔥',
      description: '5 quizzes com score ≥90%',
      unlocked: high >= 5,
      progress: { current: Math.min(high, 5), target: 5 },
    },
    {
      id: 'polymath',
      label: 'Polímata',
      emoji: '📊',
      description: 'Estude 3 tópicos diferentes',
      unlocked: topics.size >= 3,
      progress: { current: Math.min(topics.size, 3), target: 3 },
    },
    {
      id: 'streak',
      label: 'Sequência',
      emoji: '🎉',
      description: '3 aprovações consecutivas',
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
