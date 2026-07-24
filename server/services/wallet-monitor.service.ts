import { ethers } from 'ethers';
import { web3Service } from './web3.service.js';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { captureException } from '../utils/sentry.js';

/** Snapshot of the custodial wallet balance, as last observed. */
export interface WalletBalanceStatus {
  address: string;
  /** Balance in ETH, formatted ("0.0432"). Null if the last check errored. */
  balanceEth: string | null;
  /** True when the balance dropped below WALLET_LOW_BALANCE_THRESHOLD_ETH. */
  low: boolean;
  thresholdEth: string;
  checkedAt: string;
  /** Set when the last check could not reach the RPC. */
  error?: string;
}

/**
 * Periodic monitor for the custodial wallet that pays gas for
 * `recordCompletion` transactions (roadmap Onda 2: "monitor de saldo da
 * wallet custodial").
 *
 * Every WALLET_BALANCE_CHECK_INTERVAL_MS it reads the wallet balance and:
 *  - logs a structured winston WARNING when it falls below
 *    WALLET_LOW_BALANCE_THRESHOLD_ETH (so the operator can top it up
 *    before transactions start failing with INSUFFICIENT_FUNDS);
 *  - caches the snapshot so /healthz and /health can report
 *    `walletBalanceLow` without doing an RPC round-trip per request.
 *
 * TODO(alerting): wire external alerts (Slack webhook / e-mail / PagerDuty)
 * on the low-balance transition. For now the winston warning + the health
 * endpoint field are the observable signals.
 */
export class WalletMonitorService {
  private timer: NodeJS.Timeout | null = null;
  private status: WalletBalanceStatus | null = null;

  /** Last observed snapshot (null until the first check completes). */
  getStatus(): WalletBalanceStatus | null {
    return this.status;
  }

  /** Convenience for /healthz: null = not checked yet. */
  isBalanceLow(): boolean | null {
    return this.status ? this.status.low : null;
  }

  /** Run one balance check and update the cached snapshot. */
  async check(): Promise<WalletBalanceStatus> {
    const thresholdEth = config.WALLET_LOW_BALANCE_THRESHOLD_ETH;
    try {
      const balanceWei = await web3Service.getWalletBalance();
      const thresholdWei = ethers.parseEther(thresholdEth);
      const balanceEth = ethers.formatEther(balanceWei);
      const low = balanceWei < thresholdWei;

      if (low) {
        logger.warn(
          `Custodial wallet balance LOW: ${balanceEth} ETH ` +
            `(threshold ${thresholdEth} ETH) — top up ${web3Service.walletAddress} ` +
            'or on-chain recording will start failing',
          {
            wallet: web3Service.walletAddress,
            balanceEth,
            thresholdEth,
          }
        );
      } else {
        logger.debug(`Custodial wallet balance OK: ${balanceEth} ETH`);
      }

      this.status = {
        address: web3Service.walletAddress,
        balanceEth,
        low,
        thresholdEth,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Wallet balance check failed', { error });
      captureException(error, {
        worker: 'wallet-monitor',
        wallet: web3Service.walletAddress,
      });
      this.status = {
        address: web3Service.walletAddress,
        balanceEth: null,
        // Unknown balance is NOT reported as low — `error` signals the
        // monitor itself is degraded instead of crying wolf.
        low: false,
        thresholdEth,
        checkedAt: new Date().toISOString(),
        error: 'balance check failed',
      };
    }
    return this.status;
  }

  /** Start periodic checks. No-op if already started. */
  start(): void {
    if (this.timer) return;
    logger.info(
      `Wallet balance monitor started (interval ${config.WALLET_BALANCE_CHECK_INTERVAL_MS}ms, ` +
        `threshold ${config.WALLET_LOW_BALANCE_THRESHOLD_ETH} ETH)`
    );
    this.timer = setInterval(() => {
      void this.check();
    }, config.WALLET_BALANCE_CHECK_INTERVAL_MS);
    this.timer.unref?.();
    void this.check();
  }

  /** Stop periodic checks (graceful shutdown). */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Wallet balance monitor stopped');
    }
  }
}

// Singleton used by index.ts; tests instantiate their own.
export const walletMonitorService = new WalletMonitorService();
