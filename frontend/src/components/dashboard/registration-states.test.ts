import { describe, expect, it } from 'vitest';
import { resolveRegistrationState } from './registration-states';

/**
 * Focused tests for the pure ledger state mapping (review fix: score < 70
 * must always resolve to belowThreshold, never to a pulsing "registering").
 */
describe('resolveRegistrationState — score priority over blockchainStatus', () => {
  it('maps score 62 + status none to belowThreshold', () => {
    expect(resolveRegistrationState(62, 'none')).toBe('belowThreshold');
  });

  it('maps score 74 + status pending to queued', () => {
    expect(resolveRegistrationState(74, 'pending')).toBe('queued');
  });

  it('maps score 74 + status processing to registering', () => {
    expect(resolveRegistrationState(74, 'processing')).toBe('registering');
  });

  it('maps score 74 + status failed to retryScheduled', () => {
    expect(resolveRegistrationState(74, 'failed')).toBe('retryScheduled');
  });

  it('maps score 88 + status confirmed + transaction hash to recorded', () => {
    expect(resolveRegistrationState(88, 'confirmed', '0x3f9a')).toBe('recorded');
  });

  it('maps score 88 + status failed_permanent to failedNeedsAttention', () => {
    expect(resolveRegistrationState(88, 'failed_permanent')).toBe(
      'failedNeedsAttention',
    );
  });

  it('keeps belowThreshold priority even when a stale confirmed status arrives', () => {
    expect(resolveRegistrationState(62, 'confirmed', '0x3f9a')).toBe(
      'belowThreshold',
    );
  });

  it('never returns registering for below-threshold scores', () => {
    for (const status of ['none', 'pending', 'processing', 'failed', 'failed_permanent']) {
      expect(resolveRegistrationState(0, status)).not.toBe('registering');
    }
  });

  it('treats confirmed without a transaction hash as still registering', () => {
    expect(resolveRegistrationState(88, 'confirmed')).toBe('registering');
  });
});