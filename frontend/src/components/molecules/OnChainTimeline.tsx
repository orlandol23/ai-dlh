import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn, getEtherscanUrl } from '@/lib/utils';
import { LedgerRow } from '@/components/dashboard/LedgerRow';
import {
  resolveRegistrationState,
  type RegistrationState,
} from '@/components/dashboard/registration-states';
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

function formatRelativeTime(date: Date, locale: string): string {
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMin = Math.floor(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffMin < 1) return rtf.format(0, 'minute');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return rtf.format(-diffH, 'hour');
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return rtf.format(-diffD, 'day');
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date);
}

function shortHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Evidence ledger (v3 §9 P1) — one row per graded attempt, newest first.
 *
 * Public API unchanged ({ records, className, emptyHint }); row presentation
 * moved to the presentational LedgerRow/RegistrationMarker primitives. All
 * state decisions stay here, mapped strictly from the existing data model:
 *   confirmed            → recorded
 *   pending              → queued
 *   processing | failed  → registering (a transient failure still retries —
 *                          same mapping as ModulePage's CHAIN_IN_PROGRESS)
 *   failed_permanent     → failed — needs attention
 *   score < 70           → below threshold
 *
 * Preserved behaviour: newest-first ordering, stretched-link navigation,
 * relative-date localization, Etherscan links, pending/failed states,
 * ARIA labels, empty-state copy via emptyHint.
 */
export const OnChainTimeline = ({
  records,
  className,
  emptyHint,
}: OnChainTimelineProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('dashboard');
  const sorted = [...records].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          'rounded-sm border border-dashed border-border p-8 text-center',
          className,
        )}
        role="status"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {emptyHint ?? t('timeline.empty.title')}
        </p>
        {!emptyHint && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('timeline.empty.hint')}
          </p>
        )}
      </div>
    );
  }

  return (
    <ol className={cn('space-y-2', className)}>
      {sorted.map((r) => {
        const passed = r.score >= 70;
        const isOnChain = r.blockchainStatus === 'confirmed' && !!r.transactionHash;
        // Pure state mapping (registration-states.ts) — score priority first,
        // so blockchainStatus "none" (score < 70) is belowThreshold, never a
        // pulsing "registering".
        const state: RegistrationState = resolveRegistrationState(
          r.score,
          r.blockchainStatus,
          r.transactionHash,
        );
        // One label per state id — the localized state always matches the
        // resolved state (below-threshold rows use
        // dashboard:timeline.state.belowThreshold).
        const stateLabels: Record<RegistrationState, string> = {
          recorded: t('timeline.state.recorded'),
          registering: t('timeline.state.registering'),
          queued: t('timeline.state.queued'),
          retryScheduled: t('timeline.state.retryScheduled'),
          failedNeedsAttention: t('timeline.state.failed'),
          belowThreshold: t('timeline.state.belowThreshold'),
          noAttempt: t('timeline.state.belowThreshold'),
        };
        const stateLabel = stateLabels[state];
        // Only the genuinely in-progress state pulses.
        const statePulse = state === 'registering';

        const title = r.module?.title ?? t('timeline.moduleFallback', { id: r.moduleId });

        return (
          <LedgerRow
            key={r.id}
            title={title}
            scoreText={`${r.score}%`}
            relationText={passed ? t('timeline.relationPassed') : t('timeline.relationBelow')}
            dateText={formatRelativeTime(new Date(r.completedAt), i18n.language)}
            state={state}
            stateLabel={stateLabel}
            statePulse={statePulse}
            hashText={isOnChain ? shortHash(r.transactionHash!) : undefined}
            etherscanHref={isOnChain ? getEtherscanUrl(r.transactionHash!) : undefined}
            etherscanLabel={t('timeline.viewOnEtherscan')}
            ariaLabel={t('timeline.moduleAriaLabel', { title, score: r.score })}
            onOpen={() => navigate(`/module/${r.moduleId}`)}
          />
        );
      })}
    </ol>
  );
};
