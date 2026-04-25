import { cn, getEtherscanUrl } from '@/lib/utils';
import type { ProgressLike } from '@/lib/achievements';

interface TimelineRecord extends ProgressLike {
  id: number;
  moduleId: number;
  module?: {
    title?: string;
    topic?: string | null;
  } | null;
}

interface OnChainTimelineProps {
  records: TimelineRecord[];
  className?: string;
  emptyHint?: string;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m atrás`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function shortHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export const OnChainTimeline = ({
  records,
  className,
  emptyHint = 'Nenhum módulo ainda — gere seu primeiro com IA ←',
}: OnChainTimelineProps) => {
  const sorted = [...records].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-32 text-sm text-muted-foreground border border-dashed border-border rounded-md',
          className
        )}
      >
        {emptyHint}
      </div>
    );
  }

  return (
    <ol className={cn('relative space-y-3', className)}>
      <span
        className="absolute left-[15px] top-2 bottom-2 w-px bg-border"
        aria-hidden="true"
      />
      {sorted.map((r) => {
        const isOnChain = r.blockchainStatus === 'confirmed' && !!r.transactionHash;
        const passed = r.score >= 70;
        return (
          <li key={r.id} className="relative pl-10">
            <span
              className={cn(
                'absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold border-2',
                isOnChain
                  ? 'bg-onchain-bg border-primary text-primary'
                  : passed
                    ? 'bg-success-bg border-success text-success-fg'
                    : 'bg-muted border-border text-muted-foreground'
              )}
              aria-hidden="true"
            >
              {isOnChain ? '⛓' : passed ? '✓' : '·'}
            </span>
            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3 hover:border-primary/40 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">
                    {r.module?.title ?? `Módulo #${r.moduleId}`}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs px-1.5 py-0.5 rounded',
                      passed
                        ? 'bg-success-bg text-success-fg'
                        : 'bg-error-bg text-error-fg'
                    )}
                  >
                    {r.score}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                  <span>{relativeTime(new Date(r.completedAt))}</span>
                  {r.module?.topic && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">{r.module.topic}</span>
                    </>
                  )}
                </div>
              </div>
              {isOnChain && (
                <a
                  href={getEtherscanUrl(r.transactionHash!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-primary hover:underline shrink-0"
                  title="Ver no Etherscan"
                >
                  {shortHash(r.transactionHash!)} ↗
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
