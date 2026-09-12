import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/achievements';
import { Tooltip } from '@/components/atoms/Tooltip';

interface AchievementsGridProps {
  achievements: Achievement[];
  className?: string;
}

/**
 * Achievements strip (v3 §7: restrained, ruled — never outweighs the
 * evidence ledger). Emoji no longer carry meaning: unlocked rows are
 * distinguished by a solid border + teal left rule, locked rows by a
 * dashed border — a shape difference, not a colour-only one. Tooltips,
 * progress counts and the derived `deriveAchievements` logic are unchanged.
 */
export const AchievementsGrid = ({ achievements, className }: AchievementsGridProps) => {
  const { t } = useTranslation('dashboard');
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {achievements.map((a) => {
        const label = t(`achievements.items.${a.id}.label`);
        const description = t(`achievements.items.${a.id}.description`);
        return (
          <Tooltip
            key={a.id}
            content={
              <div className="max-w-[180px] text-center">
                <div className="font-semibold">{label}</div>
                <div className="text-muted-foreground">{description}</div>
                {a.progress && (
                  <div className="mt-1 font-mono">
                    {a.progress.current} / {a.progress.target}
                  </div>
                )}
              </div>
            }
          >
            <button
              type="button"
              aria-label={`${label}${a.unlocked ? t('achievements.unlockedSuffix') : ''}: ${description}`}
              className={cn(
                'flex h-11 w-full items-center gap-2 rounded-sm border px-2.5 text-start transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                a.unlocked
                  ? 'border-border border-s-2 border-s-primary bg-card text-foreground'
                  : 'border-dashed border-border text-muted-foreground opacity-80 hover:opacity-100',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                {label}
              </span>
              {a.progress && !a.unlocked && (
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {a.progress.current}/{a.progress.target}
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
