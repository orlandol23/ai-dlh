import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/achievements';
import { Tooltip } from '@/components/atoms/Tooltip';

interface AchievementsGridProps {
  achievements: Achievement[];
  className?: string;
}

export const AchievementsGrid = ({ achievements, className }: AchievementsGridProps) => {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {achievements.map((a) => (
        <Tooltip
          key={a.id}
          content={
            <div className="max-w-[180px] text-center">
              <div className="font-semibold">{a.label}</div>
              <div className="text-muted-foreground">{a.description}</div>
              {a.progress && (
                <div className="mt-1 font-mono">
                  {a.progress.current} / {a.progress.target}
                </div>
              )}
            </div>
          }
        >
          <div
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-md border transition-colors cursor-help',
              a.unlocked
                ? 'border-primary/30 bg-primary/5 text-foreground'
                : 'border-border bg-muted text-muted-foreground opacity-70'
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
            <span className="text-[11px] font-semibold text-center leading-tight">
              {a.label}
            </span>
            {a.progress && !a.unlocked && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {a.progress.current}/{a.progress.target}
              </span>
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
};
