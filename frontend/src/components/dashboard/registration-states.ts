/**
 * Registration state vocabulary + tone map for the evidence ledger
 * (v3 §9 P1/P4). Pure constants — no components in this file, so any module
 * can import it without tripping react-refresh.
 *
 * The CALLER decides the state; these mappings only attach the approved
 * glyph and tokenized classes to a known state id. No backend mapping here.
 */
export type RegistrationState =
  | 'recorded'
  | 'registering'
  | 'queued'
  | 'retryScheduled'
  | 'failedNeedsAttention'
  | 'belowThreshold'
  | 'noAttempt';

interface MarkerTone {
  glyph: string;
  className: string;
  /** Border-side colour for the 4px ledger gutter (v3 §9 P1). */
  gutterClassName: string;
}

const TONES: Record<RegistrationState, MarkerTone> = {
  recorded: {
    glyph: '◉',
    className: 'bg-success-bg text-success-fg border-success-border',
    gutterClassName: 'border-s-success',
  },
  registering: {
    glyph: '◐',
    className: 'bg-primary/10 text-primary border-primary/30',
    gutterClassName: 'border-s-primary',
  },
  queued: {
    glyph: '○',
    className: 'bg-info-bg text-info-fg border-info-border',
    gutterClassName: 'border-s-info',
  },
  retryScheduled: {
    glyph: '↻',
    className: 'bg-warning-bg text-warning-fg border-warning-border',
    gutterClassName: 'border-s-warning',
  },
  failedNeedsAttention: {
    glyph: '✕',
    className: 'bg-error-bg text-error-fg border-error-border',
    gutterClassName: 'border-s-error',
  },
  belowThreshold: {
    glyph: '·',
    className: 'bg-muted text-muted-foreground border-border',
    gutterClassName: 'border-s-border',
  },
  noAttempt: {
    glyph: '·',
    className: 'bg-muted text-muted-foreground border-dashed border-border',
    gutterClassName: 'border-s-border',
  },
};

export function registrationTone(state: RegistrationState): MarkerTone {
  return TONES[state];
}

/** 4px state-gutter class for a ledger row (caller decides the state). */
export function ledgerGutterClass(state: RegistrationState): string {
  return TONES[state].gutterClassName;
}