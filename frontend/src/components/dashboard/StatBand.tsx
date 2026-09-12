import { cn } from '@/lib/utils';

/**
 * StatBand — ruled stat band for the dashboard's pipeline metrics (v3 §8 C2).
 * Presentational only: the caller formats values and orders them by pipeline
 * stage (modules → attempts → average → recorded). Figures sit on one surface
 * separated by 1px hairlines (gap-px over a border-coloured grid) — outcome
 * hierarchy through typography, not floating cards. Values are strong ink
 * with tabular numerals; no semantic colouring for neutral metadata.
 */
export interface StatBandMetric {
  /** Region label (eyebrow voice), e.g. "Modules". */
  label: string;
  /** Preformatted value — the caller owns formatting ("88%", "12", …). */
  value: string;
  /** Optional muted subtext, e.g. "3 passed (50%)". */
  sub?: string;
}

export function StatBand({
  metrics,
  className,
}: {
  metrics: StatBandMetric[];
  className?: string;
}) {
  return (
    <div
      role="list"
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4',
        className,
      )}
    >
      {metrics.map((metric) => (
        <div key={metric.label} role="listitem" className="bg-card px-4 py-4">
          <p className="eyebrow">{metric.label}</p>
          <p className="mt-2 font-display text-3xl font-bold leading-none tabular-nums text-foreground">
            {metric.value}
          </p>
          {metric.sub && (
            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">{metric.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}