import { cn } from '@/lib/utils';
import { RegistrationMarker } from '@/components/dashboard/RegistrationMarker';
import {
  ledgerGutterClass,
  type RegistrationState,
} from '@/components/dashboard/registration-states';

/**
 * LedgerRow — presentational evidence-ledger row (v3 §9 P1).
 *
 * Purely presentational: the caller (existing page/data logic) decides the
 * state, texts, score, hash and navigation target. Anatomy per §9 P1:
 * 4px state gutter, module title, score, threshold relationship, relative
 * date, registration state, truncated transaction hash + Etherscan link
 * when confirmed.
 *
 * Preserved from the previous timeline row:
 * - stretched-link pattern: an invisible button covers the row so clicks
 *   anywhere navigate; the Etherscan <a> stays `relative` (its own higher
 *   stacking context) so no interactive-in-interactive nesting;
 * - focus-within ring on the row container.
 */
export interface LedgerRowProps {
  title: string;
  /** Preformatted score, e.g. "88%". Null when there is no attempt. */
  scoreText: string | null;
  /** Threshold relationship in words, e.g. "passed (threshold 70%)". */
  relationText: string | null;
  /** Localized relative date (caller formats). */
  dateText: string;
  state: RegistrationState;
  stateLabel: string;
  /** Pulse the marker while registration is genuinely in progress. */
  statePulse?: boolean;
  /** Truncated transaction hash — shown only when confirmed. */
  hashText?: string;
  etherscanHref?: string;
  etherscanLabel?: string;
  /** Full-sentence accessible label for the stretched navigation button. */
  ariaLabel: string;
  onOpen: () => void;
}

export function LedgerRow({
  title,
  scoreText,
  relationText,
  dateText,
  state,
  stateLabel,
  statePulse = false,
  hashText,
  etherscanHref,
  etherscanLabel,
  ariaLabel,
  onOpen,
}: LedgerRowProps) {
  return (
    <li className="relative">
      <div
        className={cn(
          'relative rounded-sm border border-border border-s-4 bg-card p-3 transition-colors',
          'hover:border-border-strong',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
          ledgerGutterClass(state),
        )}
      >
        {/*
          Stretched-link pattern (preserved): an invisible button covers the
          whole row; visible content is pointer-events-none so clicks fall
          through. The Etherscan link is `relative` to stay clickable above.
        */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={ariaLabel}
          className="absolute inset-0 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <div className="pointer-events-none flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{title}</span>
              {scoreText && (
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                  {scoreText}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{dateText}</span>
              {relationText && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{relationText}</span>
                </>
              )}
            </div>
          </div>
          <RegistrationMarker state={state} label={stateLabel} pulse={statePulse} className="shrink-0" />
        </div>

        {etherscanHref && (
          <a
            href={etherscanHref}
            target="_blank"
            rel="noopener noreferrer"
            title={etherscanLabel}
            className="relative mt-1 inline-block font-mono text-[11px] text-primary hover:underline"
          >
            {hashText} ↗
          </a>
        )}
      </div>
    </li>
  );
}