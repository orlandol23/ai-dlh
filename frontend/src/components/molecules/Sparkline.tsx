import { useId, useMemo } from 'react';
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

export const Sparkline = ({ points, height = 96, className }: SparklineProps) => {
  const { t } = useTranslation('dashboard');
  const reactId = useId();
  const strokeId = `spark-stroke-${reactId}`;
  const fillId = `spark-fill-${reactId}`;
  const width = 480;
  const usableW = width - PAD_X * 2;
  const usableH = height - PAD_Y * 2;

  const { path, area, dots } = useMemo(() => {
    if (points.length === 0) {
      return { path: '', area: '', dots: [] as { x: number; y: number; score: number }[] };
    }

    const xs =
      points.length === 1
        ? [width / 2]
        : points.map((_, i) => PAD_X + (i / (points.length - 1)) * usableW);
    const ys = points.map((p) => PAD_Y + (1 - p.score / 100) * usableH);

    const pathD = xs
      .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(' ');

    const areaD = `${pathD} L${xs[xs.length - 1].toFixed(1)},${height - PAD_Y} L${xs[0].toFixed(1)},${height - PAD_Y} Z`;

    const dotsArr = xs.map((x, i) => ({ x, y: ys[i], score: points[i].score }));
    return { path: pathD, area: areaD, dots: dotsArr };
  }, [points, usableW, usableH, height, width]);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          'relative rounded-lg border border-dashed border-primary/30 bg-card p-12 text-center hash-grid overflow-hidden',
          className
        )}
      >
        <div className="text-5xl mb-4" aria-hidden="true">📊</div>
        <p className="font-display text-lg font-semibold tracking-tight">
          {t('sparkline.empty.title')}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('sparkline.empty.hint')}{' '}
          <span className="font-mono inline-block rtl:rotate-180" aria-hidden="true">←</span>
        </p>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full h-24 spark', className)}
      aria-label={t('sparkline.aria')}
    >
      <defs>
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* baseline 70% (passing threshold) */}
      <line
        x1={PAD_X}
        x2={width - PAD_X}
        y1={PAD_Y + (1 - 0.7) * usableH}
        y2={PAD_Y + (1 - 0.7) * usableH}
        stroke="hsl(var(--border))"
        strokeDasharray="3 4"
        strokeWidth="1"
      />

      <path d={area} fill={`url(#${fillId})`} />
      <path
        d={path}
        stroke={`url(#${strokeId})`}
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
