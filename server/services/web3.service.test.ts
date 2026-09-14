import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The service builds a provider, a wallet and a contract at construction
 * time (and the module exports a singleton), so `ethers` itself is the
 * seam: every RPC the recovery path makes is a mock here.
 */
const mocks = vi.hoisted(() => ({
  provider: {
    getBalance: vi.fn(),
    getTransaction: vi.fn(),
    getTransactionReceipt: vi.fn(),
    getTransactionCount: vi.fn(),
    getFeeData: vi.fn(),
    getBlockNumber: vi.fn(),
    broadcastTransaction: vi.fn(),
  },
  wallet: {
    address: '0xW4LLET',
    populateTransaction: vi.fn(),
    signTransaction: vi.fn(),
  },
  contract: {
    recordCompletion: Object.assign(vi.fn(), { populateTransaction: vi.fn() }),
    interface: { encodeFunctionData: vi.fn(() => '0xencoded') },
  },
  /** ethers.Transaction.from(raw).hash — the hash the signature fixed. */
  transactionFrom: vi.fn(),
}));

vi.mock('../utils/env.js', () => ({
  config: {
    NODE_ENV: 'test',
    ETHEREUM_RPC_URL: 'http://localhost:8545',
    PRIVATE_KEY: '0xkey',
    CONTRACT_ADDRESS: '0xC0NTRACT',
  },
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(() => mocks.provider),
    Wallet: vi.fn(() => mocks.wallet),
    Contract: vi.fn(() => mocks.contract),
    Transaction: { from: mocks.transactionFrom },
    formatEther: (wei: bigint) => String(wei),
    verifyMessage: vi.fn(),
  },
}));

import { Web3Service, NonRetryableBlockchainError } from './web3.service.js';
import { LockLostError } from './queue-errors.js';

/** A provider receipt (only the fields the service reads). */
const minedReceipt = (hash: string, status = 1) => ({
  hash,
  blockNumber: 900,
  gasUsed: 21_000n,
  status,
});

/** A transaction still sitting in the mempool on our nonce. */
const stuckTx = (hash: string, nonce: number) => ({
  hash,
  nonce,
  data: '0xencoded',
  to: '0xC0NTRACT',
  gasLimit: 90_000n,
  maxFeePerGas: 100n,
  maxPriorityFeePerGas: 20n,
  wait: vi.fn(),
});

const journalFor = (hashes: string[], nonce = 42) => ({
  nonce,
  hashes,
  moduleId: 10,
  score: 85,
  topic: 'Solidity',
});

/** A wallet that signs anything into one fixed raw transaction. */
const signsInto = (raw: string, hash: string) => {
  mocks.wallet.populateTransaction.mockResolvedValue({
    to: '0xC0NTRACT',
    data: '0xencoded',
    nonce: 42,
    gasLimit: 90_000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 20n,
  });
  mocks.wallet.signTransaction.mockResolvedValue(raw);
  mocks.transactionFrom.mockReturnValue({ hash });
};

/**
 * The replacement path signs its OWN request (nonce, bumped fees, the
 * stuck tx's calldata), so the mocked populateTransaction echoes the
 * request back — like ethers does for already-supplied fields — instead
 * of returning fixed values. Tests assert what the wallet was ASKED to
 * sign, and that the node receives the bytes the signature fixed.
 */
const signsReplacementInto = (raw: string, hash: string) => {
  mocks.wallet.populateTransaction.mockImplementation(async (request: Record<string, unknown>) => ({
    ...request,
    type: 2,
    chainId: 11155111n,
    from: '0xW4LLET',
  }));
  mocks.wallet.signTransaction.mockResolvedValue(raw);
  mocks.transactionFrom.mockReturnValue({ hash });
};

describe('Web3Service.prepareCompletion', () => {
  let service: Web3Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Web3Service();
    mocks.contract.recordCompletion.populateTransaction.mockResolvedValue({
      to: '0xC0NTRACT',
      data: '0xencoded',
    });
  });

  it('signs the transaction without letting any node see it', async () => {
    mocks.provider.getBalance.mockResolvedValue(10n ** 18n);
    signsInto('0xraw', '0xaaa');

    const prepared = await service.prepareCompletion(10, 85, 'Solidity', 42);

    expect(prepared).toEqual({
      raw: '0xraw',
      hash: '0xaaa',
      nonce: 42,
      data: '0xencoded',
      to: '0xC0NTRACT',
      gasLimit: 90_000n,
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 20n,
    });
    // The property the whole design rests on: a usable hash exists and
    // nothing has been sent. The caller can journal it and only then risk
    // the network.
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
  });

  it('signs the nonce it was given rather than one ethers picks', async () => {
    mocks.provider.getBalance.mockResolvedValue(10n ** 18n);
    signsInto('0xraw', '0xaaa');

    await service.prepareCompletion(10, 85, 'Solidity', 42);

    // Fixing the nonce before signing is what makes the signature, the
    // journal and the broadcast describe one transaction.
    expect(mocks.wallet.populateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 42, to: '0xC0NTRACT', data: '0xencoded' })
    );
    expect(mocks.provider.getTransactionCount).not.toHaveBeenCalled();
  });

  it('refuses to sign from an empty wallet', async () => {
    mocks.provider.getBalance.mockResolvedValue(0n);

    await expect(service.prepareCompletion(10, 85, 'Solidity', 42)).rejects.toThrow(
      /no funds/i
    );
    expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
  });

  it('maps a contract revert to the non-retryable error', async () => {
    mocks.provider.getBalance.mockResolvedValue(10n ** 18n);
    mocks.contract.recordCompletion.populateTransaction.mockRejectedValue({
      code: 'CALL_EXCEPTION',
      message: 'execution reverted',
    });

    await expect(service.prepareCompletion(10, 85, 'Solidity', 42)).rejects.toBeInstanceOf(
      NonRetryableBlockchainError
    );
  });
});

describe('Web3Service.broadcastCompletion', () => {
  let service: Web3Service;

  const prepared = {
    raw: '0xraw',
    hash: '0xaaa',
    nonce: 42,
    data: '0xencoded',
    to: '0xC0NTRACT',
    gasLimit: 90_000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 20n,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Web3Service();
  });

  it('sends the raw transaction and describes it without the signature', async () => {
    mocks.provider.broadcastTransaction.mockResolvedValue({ hash: '0xaaa' });

    const sent = await service.broadcastCompletion(prepared);

    expect(mocks.provider.broadcastTransaction).toHaveBeenCalledWith('0xraw');
    // Everything the wait and the replacement need, and no `raw`: the
    // signed payload has done its job and does not belong in the journal.
    expect(sent).toEqual({
      hash: '0xaaa',
      nonce: 42,
      data: '0xencoded',
      to: '0xC0NTRACT',
      gasLimit: 90_000n,
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 20n,
    });
  });

  it('keeps a lost acknowledgement retryable, since the hash is already journaled', async () => {
    mocks.provider.broadcastTransaction.mockRejectedValue({
      code: 'NETWORK_ERROR',
      message: 'socket hang up',
    });

    const error = await service
      .broadcastCompletion(prepared)
      .then(() => null)
      .catch((e: unknown) => e);

    // This is the failure the ordering exists for. The node may well have
    // the transaction; the caller already wrote 0xaaa down, so recovery
    // looks it up instead of sending a second one.
    expect(error).not.toBeInstanceOf(NonRetryableBlockchainError);
    expect((error as Error).message).toBe('Network connection error');
  });
});

describe('Web3Service.waitForCompletion', () => {
  let service: Web3Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Web3Service();
  });

  const sent = {
    hash: '0xaaa',
    nonce: 42,
    data: '0xencoded',
    to: '0xC0NTRACT',
    gasLimit: 90_000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 20n,
  };

  it('returns the receipt of the original transaction', async () => {
    const tx = stuckTx('0xaaa', 42);
    tx.wait.mockResolvedValue(minedReceipt('0xaaa'));
    mocks.provider.getTransaction.mockResolvedValue(tx);

    await expect(service.waitForCompletion(sent, 1_000)).resolves.toEqual({
      hash: '0xaaa',
      blockNumber: 900,
      gasUsed: '21000',
    });
    expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
  });

  it('journals the replacement hash BEFORE handing the signed bytes to the node', async () => {
    const original = stuckTx('0xaaa', 42);
    original.wait.mockRejectedValue({ code: 'TIMEOUT' });
    mocks.provider.getTransaction.mockResolvedValue(original);
    mocks.provider.getTransactionReceipt.mockResolvedValue(null);

    signsReplacementInto('0xraw', '0xbbb');
    const bumped = stuckTx('0xbbb', 42);
    bumped.wait.mockResolvedValue(minedReceipt('0xbbb'));

    // Snapshot the journal the moment the node would receive the bytes:
    // that is the instant a lost acknowledgement could strand the hash.
    const journal: string[] = [];
    let journaledWhenBroadcastStarted: string[] = [];
    mocks.provider.broadcastTransaction.mockImplementation(async (raw: string) => {
      expect(raw).toBe('0xraw');
      journaledWhenBroadcastStarted = [...journal];
      return bumped;
    });

    const result = await service.waitForCompletion(sent, 1_000, async (hash) => {
      journal.push(hash);
    });

    expect(result.hash).toBe('0xbbb');
    // The whole point: the hash was durable before the broadcast started,
    // not after an acknowledgement came back.
    expect(journaledWhenBroadcastStarted).toEqual(['0xbbb']);
    // The wallet was asked to sign the SAME nonce with fees bumped 25%,
    // carrying the stuck tx's own calldata and gas limit.
    expect(mocks.wallet.populateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '0xC0NTRACT',
        data: '0xencoded',
        nonce: 42,
        gasLimit: 90_000n,
        maxFeePerGas: 125n,
        maxPriorityFeePerGas: 25n,
        value: 0n,
      })
    );
    // And the node received exactly the bytes the journal names.
    expect(mocks.provider.broadcastTransaction).toHaveBeenCalledWith('0xraw');
  });

  it('keeps the replacement hash journaled when the broadcast reports a lost acknowledgement', async () => {
    // The node may have accepted the replacement before the socket died.
    // Journaled-before-broadcast means the row already names it, so the
    // retry recovers the receipt instead of signing a third transaction.
    const original = stuckTx('0xaaa', 42);
    original.wait.mockRejectedValue({ code: 'TIMEOUT' });
    mocks.provider.getTransaction.mockResolvedValue(original);
    mocks.provider.getTransactionReceipt.mockResolvedValue(null);

    signsReplacementInto('0xraw', '0xbbb');
    mocks.provider.broadcastTransaction.mockRejectedValue(new Error('socket hang up'));

    const journal: string[] = [];
    const error = await service
      .waitForCompletion(sent, 1_000, async (hash) => {
        journal.push(hash);
      })
      .then(() => null)
      .catch((e: unknown) => e);

    // Retryable — but not fatal: the journal already names the replacement.
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('socket hang up');
    expect(journal).toEqual(['0xbbb']);
    expect(mocks.provider.broadcastTransaction).toHaveBeenCalledWith('0xraw');
  });

  it('lets a LockLostError from the journal callback pass through unwrapped', async () => {
    // The queue's journal write is fenced: when it reports the lock gone,
    // web3.service must not file the error as a blockchain failure. The
    // queue's handleSendFailure treats that class as "the row is not ours".
    const original = stuckTx('0xaaa', 42);
    original.wait.mockRejectedValue({ code: 'TIMEOUT' });
    mocks.provider.getTransaction.mockResolvedValue(original);
    mocks.provider.getTransactionReceipt.mockResolvedValue(null);

    signsReplacementInto('0xraw', '0xbbb');

    const error = await service
      .waitForCompletion(sent, 1_000, async () => {
        throw new LockLostError(1);
      })
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LockLostError);
    expect((error as Error).message).toContain('lock reclaimed');
    // A lost lock means the row is not ours: nothing is broadcast.
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
  });
});

describe('Web3Service.recoverCompletion', () => {
  let service: Web3Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Web3Service();
  });

  it('confirms from a journaled hash that already mined, without sending anything', async () => {
    mocks.provider.getTransactionReceipt.mockResolvedValue(minedReceipt('0xaaa'));

    const result = await service.recoverCompletion(journalFor(['0xaaa']), 1_000);

    expect(result).toEqual({ hash: '0xaaa', blockNumber: 900, gasUsed: '21000' });
    expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
    expect(mocks.provider.getTransactionCount).not.toHaveBeenCalled();
  });

  it('checks every journaled hash, not just the first', async () => {
    // The original was replaced by a fee bump which then mined: the second
    // journaled hash is the one with a receipt, and it confirms the record.
    mocks.provider.getTransactionReceipt
      .mockResolvedValueOnce(null) // original was replaced
      .mockResolvedValueOnce(minedReceipt('0xbbb')); // the fee bump mined

    const result = await service.recoverCompletion(journalFor(['0xaaa', '0xbbb']), 1_000);

    expect(result.hash).toBe('0xbbb');
    expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
  });

  it('is permanently failed when the journaled transaction reverted on-chain', async () => {
    mocks.provider.getTransactionReceipt.mockResolvedValue(minedReceipt('0xaaa', 0));

    const error = await service
      .recoverCompletion(journalFor(['0xaaa']), 1_000)
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NonRetryableBlockchainError);
    expect((error as Error).message).toContain('Contract reverted on-chain: 0xaaa');
    expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
  });

  it('refuses to resend when the nonce was consumed by an unjournaled transaction', async () => {
    // Nothing of ours mined, yet the account nonce has moved past ours:
    // some transaction we never recorded took the slot. Sending again is
    // exactly how a second on-chain record would appear.
    mocks.provider.getTransactionReceipt.mockResolvedValue(null);
    mocks.provider.getTransactionCount.mockResolvedValue(43);

    const error = await service
      .recoverCompletion(journalFor(['0xaaa']), 1_000)
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NonRetryableBlockchainError);
    expect((error as Error).message).toMatch(/Manual check/i);
    expect(mocks.provider.getTransactionCount).toHaveBeenCalledWith('0xW4LLET', 'latest');
    expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
    expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
  });

  it('re-broadcasts the SAME nonce with bumped fees while the transaction is still pending', async () => {
    mocks.provider.getTransactionReceipt.mockResolvedValue(null);
    mocks.provider.getTransactionCount.mockResolvedValue(42); // nonce not mined yet
    mocks.provider.getTransaction.mockResolvedValue(stuckTx('0xaaa', 42));

    signsReplacementInto('0xraw', '0xccc');
    const bumped = stuckTx('0xccc', 42);
    bumped.wait.mockResolvedValue(minedReceipt('0xccc'));

    const journal: string[] = [];
    let journaledWhenBroadcastStarted: string[] = [];
    mocks.provider.broadcastTransaction.mockImplementation(async (raw: string) => {
      expect(raw).toBe('0xraw');
      journaledWhenBroadcastStarted = [...journal];
      return bumped;
    });

    const result = await service.recoverCompletion(
      journalFor(['0xaaa']),
      1_000,
      async (hash) => {
        journal.push(hash);
      }
    );

    expect(result.hash).toBe('0xccc');
    expect(mocks.wallet.populateTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.wallet.populateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 42, // never a fresh nonce
        data: '0xencoded',
        to: '0xC0NTRACT',
        maxFeePerGas: 125n,
        maxPriorityFeePerGas: 25n,
      })
    );
    // Rebuilt from the record, not from any in-memory state.
    expect(mocks.contract.interface.encodeFunctionData).toHaveBeenCalledWith(
      'recordCompletion',
      [10, 85, 'Solidity']
    );
    // The journal learned the replacement hash before the bytes went out.
    expect(journaledWhenBroadcastStarted).toEqual(['0xccc']);
    expect(mocks.provider.broadcastTransaction).toHaveBeenCalledWith('0xraw');
    expect(journal).toEqual(['0xccc']);
  });

  it('re-broadcasts a dropped transaction at current market fees', async () => {
    mocks.provider.getTransactionReceipt.mockResolvedValue(null);
    mocks.provider.getTransactionCount.mockResolvedValue(42);
    // The node no longer knows the hash: it was dropped from the mempool.
    mocks.provider.getTransaction.mockResolvedValue(null);
    mocks.provider.getFeeData.mockResolvedValue({
      maxFeePerGas: 200n,
      maxPriorityFeePerGas: 40n,
    });

    signsReplacementInto('0xraw', '0xddd');
    const bumped = stuckTx('0xddd', 42);
    bumped.wait.mockResolvedValue(minedReceipt('0xddd'));
    mocks.provider.broadcastTransaction.mockResolvedValue(bumped);

    const result = await service.recoverCompletion(journalFor(['0xaaa']), 1_000);

    expect(result.hash).toBe('0xddd');
    expect(mocks.wallet.populateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 42,
        maxFeePerGas: 250n,
        maxPriorityFeePerGas: 50n,
        // Unknown gas: let ethers estimate it for the fresh broadcast.
        gasLimit: undefined,
      })
    );
    expect(mocks.provider.broadcastTransaction).toHaveBeenCalledWith('0xraw');
  });

  it('keeps RPC failures retryable instead of burning the record', async () => {
    mocks.provider.getTransactionReceipt.mockRejectedValue({
      code: 'NETWORK_ERROR',
      message: 'connection dropped',
    });

    const error = await service
      .recoverCompletion(journalFor(['0xaaa']), 1_000)
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(NonRetryableBlockchainError);
    expect((error as Error).message).toBe('Network connection error');
  });

  /**
   * A journal naming a nonce and no hash at all. The queue does not produce
   * one any more — it journals the hash it signed — but a row written by an
   * older build, or a `blockchain_sent_hashes` that failed to parse, reaches
   * recovery looking exactly like this, and both readings have to stay safe.
   */
  describe('a journal with a nonce and no hashes', () => {
    it('broadcasts on that nonce when nothing consumed it', async () => {
      // Account nonce equal to ours, not past it: nothing ever took the
      // slot, so it is still ours to use.
      mocks.provider.getTransactionCount.mockResolvedValue(42);
      mocks.provider.getFeeData.mockResolvedValue({
        maxFeePerGas: 200n,
        maxPriorityFeePerGas: 40n,
      });

      signsReplacementInto('0xraw', '0xeee');
      const sent = stuckTx('0xeee', 42);
      sent.wait.mockResolvedValue(minedReceipt('0xeee'));
      mocks.provider.broadcastTransaction.mockResolvedValue(sent);

      const journal: string[] = [];
      const result = await service.recoverCompletion(journalFor([]), 1_000, async (hash) => {
        journal.push(hash);
      });

      expect(result.hash).toBe('0xeee');
      expect(mocks.wallet.populateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: 42, data: '0xencoded' })
      );
      expect(mocks.provider.broadcastTransaction).toHaveBeenCalledWith('0xraw');
      expect(journal).toEqual(['0xeee']);
      // An empty journal must never be turned into lookups of the empty
      // string: a provider asked for receipt '' can answer anything, and
      // the one answer this path cannot survive is a wrong one.
      expect(mocks.provider.getTransaction).not.toHaveBeenCalled();
      expect(mocks.provider.getTransactionReceipt).not.toHaveBeenCalled();
    });

    it('refuses to send when that nonce was already consumed', async () => {
      // Nothing journaled, and the slot is gone: some transaction this row
      // never signed spent it. With the hash journaled before broadcasting,
      // that now means the custodial wallet was used from elsewhere, which
      // is a person's problem and not a retry's.
      mocks.provider.getTransactionCount.mockResolvedValue(43);

      const error = await service
        .recoverCompletion(journalFor([]), 1_000)
        .then(() => null)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NonRetryableBlockchainError);
      expect((error as Error).message).toMatch(/no hashes/);
      expect((error as Error).message).toMatch(/Manual check/i);
      // Parking the record for a human is the correct end of this path.
      // Sending again would allocate a fresh nonce and write the very
      // duplicate the journal exists to prevent.
      expect(mocks.wallet.signTransaction).not.toHaveBeenCalled();
      expect(mocks.provider.broadcastTransaction).not.toHaveBeenCalled();
    });
  });
});
