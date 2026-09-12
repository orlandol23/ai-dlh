import { cn } from '@/lib/utils';
import {
  type RegistrationState,
  registrationTone,
} from '@/components/dashboard/registration-states';

/**
 * RegistrationMarker — presentational state marker for the evidence ledger
 * (v3 §9 P4). Purely presentational: the CALLER owns every state decision
 * (the page/data logic maps blockchainStatus / score to a RegistrationState)
 * and passes the localized label; this component only renders the approved
 * glyph + tokenized classes for a known state id.
 *
 * Glyphs reinforce, never carry meaning alone — the label text is the state.
 * No emoji. No colour-only signalling: every tone pairs with its text.
 */

interface RegistrationMarkerProps {
  state: RegistrationState;
  /** The state spelled out — the accessible, non-colour carrier of meaning. */
  label: string;
  /** Slow pulse while work is genuinely in progress (registering). */
  pulse?: boolean;
  className?: string;
}

export function RegistrationMarker({
  state,
  label,
  pulse = false,
  className,
}: RegistrationMarkerProps) {
  const tone = registrationTone(state);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-medium',
        tone.className,
        className,
      )}
    >
      <span aria-hidden="true">{tone.glyph}</span>
      <span>{label}</span>
      {pulse && (
        <span className="animate-pulse" aria-hidden="true">
          ·
        </span>
      )}
    </span>
  );
}