import { describe, expect, it } from 'vitest';
import { resolveModuleEvidence } from './module-evidence';
import { resolveRegistrationState } from '@/components/dashboard/registration-states';

/**
 * Focused tests for the module-page evidence adapter: the mapping must
 * always delegate to the shared P1.2 resolver (single source of truth) and
 * add exactly one case of its own — no attempt at all.
 */
describe('resolveModuleEvidence', () => {
  it('returns noAttempt when no attempt record exists', () => {
    const expected = { hasAttempt: false, passed: false, score: null, state: 'noAttempt' };
    expect(resolveModuleEvidence(undefined)).toEqual(expected);
    expect(resolveModuleEvidence(null)).toEqual(expected);
  });

  it('maps a below-threshold attempt to belowThreshold', () => {
    const evidence = resolveModuleEvidence({ score: 62, blockchainStatus: 'none' });
    expect(evidence.state).toBe('belowThreshold');
    expect(evidence.passed).toBe(false);
    expect(evidence.score).toBe(62);
  });

  it('maps a passing pending attempt to queued', () => {
    const evidence = resolveModuleEvidence({ score: 74, blockchainStatus: 'pending' });
    expect(evidence.state).toBe('queued');
    expect(evidence.passed).toBe(true);
  });

  it('maps a processing attempt to registering', () => {
    const evidence = resolveModuleEvidence({ score: 74, blockchainStatus: 'processing' });
    expect(evidence.state).toBe('registering');
  });

  it('maps a transiently failed attempt to retryScheduled', () => {
    const evidence = resolveModuleEvidence({ score: 74, blockchainStatus: 'failed' });
    expect(evidence.state).toBe('retryScheduled');
    expect(evidence.passed).toBe(true);
  });

  it('maps a confirmed attempt with a hash to recorded', () => {
    const evidence = resolveModuleEvidence({
      score: 88,
      blockchainStatus: 'confirmed',
      transactionHash: '0x3f9a',
    });
    expect(evidence.state).toBe('recorded');
    expect(evidence.passed).toBe(true);
  });

  it('maps a permanent failure to failedNeedsAttention (score still saved)', () => {
    const evidence = resolveModuleEvidence({ score: 88, blockchainStatus: 'failed_permanent' });
    expect(evidence.state).toBe('failedNeedsAttention');
    expect(evidence.passed).toBe(true);
  });

  it('delegates every attempt to resolveRegistrationState', () => {
    const attempts = [
      { score: 100, blockchainStatus: 'confirmed', transactionHash: '0xabc' },
      { score: 88, blockchainStatus: 'confirmed' }, // no hash yet
      { score: 74, blockchainStatus: 'pending' },
      { score: 74, blockchainStatus: 'processing' },
      { score: 74, blockchainStatus: 'failed' },
      { score: 74, blockchainStatus: 'failed_permanent' },
      { score: 40, blockchainStatus: 'none' },
      { score: 71, blockchainStatus: 'unknown_status' },
      { score: 0, blockchainStatus: 'none' },
    ];
    for (const attempt of attempts) {
      expect(resolveModuleEvidence(attempt).state).toBe(
        resolveRegistrationState(
          attempt.score,
          attempt.blockchainStatus,
          attempt.transactionHash,
        ),
      );
    }
  });
});
