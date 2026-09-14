import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { RegistrationMarker } from '@/components/dashboard/RegistrationMarker';
import {
  ledgerGutterClass,
  type RegistrationState,
} from '@/components/dashboard/registration-states';
import {
  isRegistering,
  type ModuleEvidence,
} from '@/components/module/module-evidence';
import { cn, getEtherscanUrl } from '@/lib/utils';

/** Same truncation convention as the evidence ledger (0x3f…9a). */
function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * EvidenceRail — supporting evidence beside the reading desk (v3 C3, W3).
 *
 * Desktop (≥ lg): narrow 3/12 column beside the desk. Below lg: the same
 * component renders as a full-width status strip above the prose — no
 * horizontal scrolling, nothing sticky, actions ≥ 44px.
 *
 * State rules (v3 §9 P4):
 * - the state id + label always come from the shared registration
 *   vocabulary (`resolveModuleEvidence` → `RegistrationMarker`); no
 *   duplicated state logic here;
 * - only `registering` pulses; below-threshold/failed/retry states are
 *   static; every state is spelled out in text (marker label + hint);
 * - the hash + Etherscan link appear exactly when the record is confirmed
 *   with a hash (state `recorded`) — never before.
 *
 * Purely presentational: data and callbacks come from ModulePage.
 */
export interface EvidenceRailProps {
  evidence: ModuleEvidence;
  /** Transaction hash — rendered only in the `recorded` state. */
  transactionHash: string | null;
  /** Localized VARK style name (auth store) — omitted when unset. */
  learningStyleName?: string | null;
  /** Provided only when the record is `failedNeedsAttention`. */
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
}

const STATE_LABEL_KEY: Record<RegistrationState, string> = {
  recorded: 'dashboard:timeline.state.recorded',
  registering: 'dashboard:timeline.state.registering',
  queued: 'dashboard:timeline.state.queued',
  retryScheduled: 'dashboard:timeline.state.retryScheduled',
  failedNeedsAttention: 'dashboard:timeline.state.failed',
  // The module rail distinguishes "not started" from "below threshold".
  belowThreshold: 'dashboard:timeline.state.belowThreshold',
  noAttempt: 'module:rail.notStarted',
};

const HINT_KEY: Record<RegistrationState, string> = {
  noAttempt: 'module:rail.hintNotStarted',
  belowThreshold: 'module:rail.hintBelow',
  queued: 'module:rail.hintPending',
  registering: 'module:rail.hintPending',
  retryScheduled: 'module:rail.hintRetry',
  failedNeedsAttention: 'module:rail.hintFailed',
  recorded: 'module:rail.hintRecorded',
};

export function EvidenceRail({
  evidence,
  transactionHash,
  learningStyleName,
  onRetry,
  retryDisabled = false,
  className,
}: EvidenceRailProps) {
  const { t } = useTranslation(['module', 'dashboard', 'quiz', 'vark']);

  const stateLabel = t(STATE_LABEL_KEY[evidence.state]);
  const hint = t(HINT_KEY[evidence.state]);
  const relationText = evidence.hasAttempt
    ? evidence.passed
      ? t('dashboard:timeline.relationPassed')
      : t('dashboard:timeline.relationBelow')
    : null;

  return (
    <aside aria-label={t('module:rail.eyebrow')} className={cn('min-w-0', className)}>
      {/* 4px state gutter — the ledger vocabulary carried over from P1.2. */}
      <div
        className={cn(
          'rounded-sm border border-border border-s-4 bg-card p-4',
          ledgerGutterClass(evidence.state),
        )}
      >
        <p className="eyebrow">{t('module:rail.eyebrow')}</p>
        <div className="mt-2">
          <RegistrationMarker
            state={evidence.state}
            label={stateLabel}
            // Only the genuinely in-progress state pulses (v3 §10).
            pulse={isRegistering(evidence.state)}
          />
        </div>

        {/* Latest score + threshold relationship. */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="eyebrow">{t('module:rail.scoreEyebrow')}</p>
          {evidence.hasAttempt ? (
            <>
              <p className="mt-2 font-display text-3xl font-bold leading-none tabular-nums text-foreground">
                {evidence.score}%
              </p>
              {relationText && (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  {relationText}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {t('module:rail.noAttempt')}
            </p>
          )}
        </div>

        {/* Hash + Etherscan — confirmed evidence only (v3 §9 P4). */}
        {evidence.state === 'recorded' && transactionHash && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="eyebrow">{t('module:rail.chainEyebrow')}</p>
            <a
              href={getEtherscanUrl(transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              title={t('dashboard:timeline.viewOnEtherscan')}
              className="mt-2 inline-flex min-h-[44px] items-center break-all font-mono text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {shortHash(transactionHash)}
              <span aria-hidden="true" className="ms-1">
                ↗
              </span>
            </a>
          </div>
        )}

        {/* Retry — only when the queue gave up (existing action, preserved). */}
        {evidence.state === 'failedNeedsAttention' && onRetry && (
          <div className="mt-4 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full"
              disabled={retryDisabled}
              onClick={onRetry}
            >
              {t('quiz:results.retryBlockchain')}
            </Button>
          </div>
        )}

        {/* Next action / what stays safe — the state in a sentence. */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="eyebrow">{t('module:rail.nextEyebrow')}</p>
          <p className="mt-1.5 text-sm text-muted-foreground" role="status">
            {hint}
          </p>
        </div>

        {/* VARK profile — only when the learner has one (already available
            from the auth store; no new query). */}
        {learningStyleName && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="eyebrow">{t('dashboard:vark.eyebrow')}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{learningStyleName}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
