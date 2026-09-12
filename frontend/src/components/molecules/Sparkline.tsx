import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SparklinePoint } from '@/lib/achievements';

interface SparklineProps {
  points: SparklinePoint[];
  height?: number;
  className?: string;
}

const PAD_X = 6;
const PAD_Y = 8;

/**
 * Score history (v3 §4 score-history region). Solid teal data line, dashed
 * 70% threshold rule with a mono threshold label, one dot per attempt.
 * No area fill, no gradient, no animated drawing (v3 §10: the line renders
 * settled). Props and score math unchanged.
 */
export const Sparkline = ({ points, height = 96, className }: SparklineProps) => {
  const { t } = useTranslation('dashboard');
  const width = 480;
  const usableW = width - PAD_X * 2;
  const usableH = height - PAD_Y * 2;

  const { path, dots } = useMemo(() => {
    if (points.length === 0) {
      return { path: '', dots: [] as { x: number; y: number; score: number }[] };
    }

    const xs =
      points.length === 1
        ? [width / 2]
        : points.map((_, i) => PAD_X + (i / (points.length - 1)) * usableW);
    const ys = points.map((p) => PAD_Y + (1 - p.score / 100) * usableH);

    const pathD = xs
      .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(' ');

    const dotsArr = xs.map((x, i) => ({ x, y: ys[i], score: points[i].score }));
    return { path: pathD, dots: dotsArr };
  }, [points, usableW, usableH, width]);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          'rounded-sm border border-dashed border-border p-8 text-center',
          className,
        )}
        role="status"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('sparkline.empty.title')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('sparkline.empty.hint')}{' '}
          <span className="font-mono inline-block rtl:rotate-180" aria-hidden="true">←</span>
        </p>
      </div>
    );
  }

  const y70 = PAD_Y + (1 - 0.7) * usableH;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full h-24 spark', className)}
      role="img"
      aria-label={t('sparkline.ariaWithData', { count: points.length })}
    >
      {/* threshold rule at 70% (passing threshold) + mono label */}
      <line
        x1={PAD_X}
        x2={width - PAD_X}
        y1={y70}
        y2={y70}
        stroke="hsl(var(--border))"
        strokeDasharray="3 4"
        strokeWidth="1"
      />
      <text
        x={width - PAD_X}
        y={y70 - 3}
        textAnchor="end"
        fontSize="9"
        fontFamily="JetBrains Mono, monospace"
        fill="hsl(var(--muted-foreground))"
      >
        {t('sparkline.thresholdLabel')}
      </text>

      {/* v3 §5: the data line is solid teal — no gradient stroke, no area fill. */}
      <path
        d={path}
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r="3"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
};
