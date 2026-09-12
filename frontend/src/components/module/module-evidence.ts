import {
  resolveRegistrationState,
  type RegistrationState,
} from '@/components/dashboard/registration-states';

/**
 * Module Desk evidence (v3 C3, docs/DESIGN-SYSTEM.md §4/§9).
 *
 * Pure adapter between the module page's polled attempt record and the
 * shared P1.2 registration vocabulary. The single source of truth for the
 * state mapping stays `resolveRegistrationState` — this adapter only adds
 * the one case that resolver cannot express: no attempt at all.
 *
 * Structural subset of `RouterOutputs['progress']['getModuleProgress']`
 * (the only fields the evidence rail needs), so the polled record can be
 * passed straight through without a runtime conversion.
 */
export interface ModuleAttemptEvidence {
  score: number;
  blockchainStatus: string;
  transactionHash?: string | null;
}

export interface ModuleEvidence {
  /** false → "not started": no graded attempt exists for this module. */
  hasAttempt: boolean;
  /** Derived from the resolved state — never recomputed from the threshold here. */
  passed: boolean;
  /** null when there is no attempt. */
  score: number | null;
  state: RegistrationState;
}

/**
 * Maps one attempt (or the absence of one) onto the ledger vocabulary:
 *
 *   no attempt            → noAttempt
 *   score < 70            → belowThreshold (delegated — never "registering")
 *   confirmed + tx hash   → recorded
 *   pending               → queued
 *   processing            → registering
 *   failed                → retryScheduled
 *   failed_permanent      → failedNeedsAttention
 */
export function resolveModuleEvidence(
  attempt: ModuleAttemptEvidence | null | undefined,
): ModuleEvidence {
  if (!attempt) {
    return { hasAttempt: false, passed: false, score: null, state: 'noAttempt' };
  }

  const state = resolveRegistrationState(
    attempt.score,
    attempt.blockchainStatus,
    attempt.transactionHash,
  );

  return {
    hasAttempt: true,
    // The resolver owns the 70% rule (belowThreshold ⇔ score < 70), so the
    // threshold constant is not duplicated here.
    passed: state !== 'belowThreshold',
    score: attempt.score,
    state,
  };
}

/** True only while the async on-chain write is genuinely in flight. */
export function isRegistering(state: RegistrationState): boolean {
  return state === 'registering';
}
