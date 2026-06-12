import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';

const mocks = vi.hoisted(() => ({
  getWalletBalance: vi.fn(),
}));

vi.mock('../utils/env.js', () => ({
  config: {
    NODE_ENV: 'test',
    WALLET_LOW_BALANCE_THRESHOLD_ETH: '0.05',
    WALLET_BALANCE_CHECK_INTERVAL_MS: 300_000,
  },
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('./web3.service.js', () => ({
  web3Service: {
    getWalletBalance: mocks.getWalletBalance,
    walletAddress: '0x1111111111111111111111111111111111111111',
  },
}));

import { WalletMonitorService } from './wallet-monitor.service.js';
import { logger } from '../utils/logger.js';

describe('WalletMonitorService', () => {
  let service: WalletMonitorService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    service = new WalletMonitorService();
  });

  it('reports null before the first check (monitor not run yet)', () => {
    expect(service.getStatus()).toBeNull();
    expect(service.isBalanceLow()).toBeNull();
  });

  it('flags a balance below the threshold and logs a winston warning', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    mocks.getWalletBalance.mockResolvedValue(ethers.parseEther('0.01'));

    const status = await service.check();

    expect(status.low).toBe(true);
    expect(status.balanceEth).toBe('0.01');
    expect(status.thresholdEth).toBe('0.05');
    expect(service.isBalanceLow()).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('LOW');
  });

  it('does not warn when the balance is above the threshold', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    mocks.getWalletBalance.mockResolvedValue(ethers.parseEther('1.5'));

    const status = await service.check();

    expect(status.low).toBe(false);
    expect(status.balanceEth).toBe('1.5');
    expect(service.isBalanceLow()).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('treats a balance exactly at the threshold as not low (strict <)', async () => {
    mocks.getWalletBalance.mockResolvedValue(ethers.parseEther('0.05'));

    const status = await service.check();

    expect(status.low).toBe(false);
  });

  it('degrades gracefully when the RPC is unreachable (error flagged, not "low")', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    mocks.getWalletBalance.mockRejectedValue(new Error('connection refused'));

    const status = await service.check();

    expect(status.low).toBe(false);
    expect(status.balanceEth).toBeNull();
    expect(status.error).toBe('balance check failed');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('updates the cached snapshot on every check', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    mocks.getWalletBalance.mockResolvedValueOnce(ethers.parseEther('0.2'));
    await service.check();
    expect(service.isBalanceLow()).toBe(false);

    mocks.getWalletBalance.mockResolvedValueOnce(ethers.parseEther('0.001'));
    await service.check();
    expect(service.isBalanceLow()).toBe(true);
    expect(service.getStatus()?.balanceEth).toBe('0.001');
  });
});
