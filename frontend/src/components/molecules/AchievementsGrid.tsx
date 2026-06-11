import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/achievements';
import { Tooltip } from '@/components/atoms/Tooltip';

interface AchievementsGridProps {
  achievements: Achievement[];
  className?: string;
}

export const AchievementsGrid = ({ achievements, className }: AchievementsGridProps) => {
  const { t } = useTranslation('dashboard');
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
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
                'flex flex-col items-center gap-1 p-3 rounded-md border transition-colors text-center w-full',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                a.unlocked
                  ? 'border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10'
                  : 'border-border bg-muted text-muted-foreground opacity-70 hover:opacity-90'
              )}
            >
              <span
                className={cn(
                  'text-2xl leading-none',
                  a.unlocked ? 'grayscale-0' : 'grayscale'
                )}
                aria-hidden="true"
              >
                {a.emoji}
              </span>
              <span className="text-[11px] font-semibold leading-tight">
                {label}
              </span>
              {a.progress && !a.unlocked && (
                <span className="font-mono text-[10px] text-muted-foreground">
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
