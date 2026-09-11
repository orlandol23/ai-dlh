import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ethers } from 'ethers';

/**
 * The signing path against a REAL ethers signer.
 *
 * `web3.service.test.ts` mocks `ethers` wholesale, which is right for
 * testing our own ordering and error mapping and useless for testing the
 * assumption underneath it: that a transaction can be signed locally, that
 * its hash is final at that moment, and that broadcasting sends exactly
 * those bytes. Mocks agree with whatever they are told, so the day an
 * ethers upgrade changes `populateTransaction`, `signTransaction` or
 * `Transaction.from`, every mocked test would still pass while the queue
 * journaled a hash that no longer matches what the node receives.
 *
 * So this file mocks nothing below our own code. A real `Wallet` signs a
 * real transaction, and a fake JSON-RPC node — a plain HTTP server, no
 * network, no Docker — answers the handful of calls ethers makes and keeps
 * the bytes it was sent.
 */

const CHAIN_ID = 11155111n; // Sepolia, matching the deployed contract
const CONTRACT = '0x3C399AdD53c70DC828db096d6b953757494427CE';
const NONCE = 42;

/** Raw payloads the fake node received through eth_sendRawTransaction. */
const broadcast: string[] = [];

/**
 * The caller's journal, snapshotted the instant each raw transaction
 * reaches the node. The replacement test reads it to prove the hash was
 * durable BEFORE the node saw the bytes — the property that makes a lost
 * acknowledgement recoverable rather than a stranded transaction.
 */
const journal: string[] = [];
const journalAtBroadcast: string[][] = [];

function rpcAnswer(method: string, params: unknown[]): unknown {
  switch (method) {
    case 'eth_chainId':
      return '0x' + CHAIN_ID.toString(16);
    case 'eth_blockNumber':
      return '0x100';
    case 'eth_getBalance':
      return '0xde0b6b3a7640000'; // 1 ETH, so the funds check passes
    case 'eth_getTransactionCount':
      return '0x' + NONCE.toString(16);
    case 'eth_estimateGas':
      return '0x15f90';
    case 'eth_maxPriorityFeePerGas':
      return '0x3b9aca00';
    case 'eth_getBlockByNumber':
      // Only the fields ethers reads to derive EIP-1559 fees.
      return {
        number: '0x100',
        hash: '0x' + '11'.repeat(32),
        parentHash: '0x' + '22'.repeat(32),
        timestamp: '0x64',
        baseFeePerGas: '0x3b9aca00',
        gasLimit: '0x1c9c380',
        gasUsed: '0x0',
        difficulty: '0x0',
        miner: '0x' + '00'.repeat(20),
        extraData: '0x',
        transactions: [],
      };
    case 'eth_getTransactionReceipt': {
      // The node has a receipt only for what it actually received through
      // eth_sendRawTransaction; every other hash is unknown to it.
      const hash = (params[0] as string).toLowerCase();
      const raw = broadcast.find((raw) => ethers.keccak256(raw).toLowerCase() === hash);
      if (!raw) return null;
      const tx = ethers.Transaction.from(raw);
      return {
        transactionHash: hash,
        blockHash: '0x' + '33'.repeat(32),
        blockNumber: '0x101',
        transactionIndex: '0x0',
        from: tx.from,
        to: tx.to,
        contractAddress: null,
        root: null,
        gasUsed: '0x15f90',
        cumulativeGasUsed: '0x15f90',
        effectiveGasPrice: '0x3b9aca00',
        blobGasUsed: null,
        blobGasPrice: null,
        logsBloom: '0x',
        logs: [],
        status: '0x1',
        type: '0x2',
      };
    }
    case 'eth_sendRawTransaction': {
      const raw = params[0] as string;
      broadcast.push(raw);
      // Snapshot taken by the node itself: this is what the journal held
      // when the bytes arrived, not what the caller remembers afterwards.
      journalAtBroadcast.push([...journal]);
      return ethers.keccak256(raw);
    }
    default:
      return null;
  }
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const parsed: unknown = JSON.parse(body);
    const answer = (r: { id: number; method: string; params?: unknown[] }) => ({
      jsonrpc: '2.0',
      id: r.id,
      result: rpcAnswer(r.method, r.params ?? []),
    });
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify(
        Array.isArray(parsed)
          ? parsed.map((r) => answer(r as { id: number; method: string; params?: unknown[] }))
          : answer(parsed as { id: number; method: string; params?: unknown[] })
      )
    );
  });
});

const wallet = ethers.Wallet.createRandom();
let service: InstanceType<typeof import('./web3.service.js').Web3Service>;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  // The service reads config at import time, so the environment has to be
  // in place before the dynamic import below.
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgres://user@localhost:5432/db';
  process.env.ETHEREUM_RPC_URL = `http://127.0.0.1:${port}`;
  process.env.PRIVATE_KEY = wallet.privateKey;
  process.env.CONTRACT_ADDRESS = CONTRACT;
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.JWT_SECRET = 'y'.repeat(40);

  const { Web3Service } = await import('./web3.service.js');
  service = new Web3Service();
});

afterAll(() => {
  server.close();
});

describe('Web3Service signing, against a real signer', () => {
  it('signs locally: a final hash exists and no node has been told anything', async () => {
    const nonce = await service.nextNonce();
    expect(nonce).toBe(NONCE);

    const prepared = await service.prepareCompletion(10, 85, 'Solidity', nonce);

    // The property the exactly-once design rests on. If preparing ever
    // starts broadcasting, the journal stops being written first and the
    // lost-acknowledgement window reopens without a single test changing.
    expect(broadcast).toHaveLength(0);
    expect(prepared.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(prepared.raw).toMatch(/^0x[0-9a-f]+$/);

    // The hash is the signature's own, not something a node reported.
    const decoded = ethers.Transaction.from(prepared.raw);
    expect(decoded.hash).toBe(prepared.hash);
    expect(decoded.nonce).toBe(NONCE);
    expect(decoded.chainId).toBe(CHAIN_ID);
    expect(decoded.from).toBe(wallet.address);
    expect(decoded.to?.toLowerCase()).toBe(CONTRACT.toLowerCase());

    // And it really is the call we meant to make.
    const iface = new ethers.Interface([
      'function recordCompletion(uint256 _moduleId, uint256 _score, string memory _moduleTopic) external',
    ]);
    const call = iface.parseTransaction({ data: decoded.data });
    expect(call?.name).toBe('recordCompletion');
    expect([call?.args[0], call?.args[1], call?.args[2]]).toEqual([10n, 85n, 'Solidity']);
  });

  it('broadcasts exactly the bytes that were journaled', async () => {
    broadcast.length = 0;
    const prepared = await service.prepareCompletion(10, 85, 'Solidity', NONCE);

    const sent = await service.broadcastCompletion(prepared);

    // Journal and wire agree, which is what makes the journaled hash a
    // usable key for recovery rather than a hopeful guess.
    expect(broadcast).toEqual([prepared.raw]);
    expect(ethers.keccak256(broadcast[0])).toBe(prepared.hash);
    expect(sent.hash).toBe(prepared.hash);
    // The signed payload has done its job; carrying it further would put a
    // signature into the journal for no reason.
    expect(sent).not.toHaveProperty('raw');
  });

  it('refuses to sign when the wallet cannot pay for gas', async () => {
    broadcast.length = 0;
    // The balance is the one answer varied, so the guard runs against the
    // same real signer as the tests above rather than against a stub.
    const broke = new (await import('./web3.service.js')).Web3Service();
    vi.spyOn(broke, 'getWalletBalance').mockResolvedValue(0n);

    await expect(broke.prepareCompletion(10, 85, 'Solidity', NONCE)).rejects.toThrow(
      /no funds/i
    );
    expect(broadcast).toHaveLength(0);
  });

  it('signs a fee-bump replacement locally and journals its hash before the node sees it', async () => {
    // The initial send closed the lost-acknowledgement window by journaling
    // the signed hash first. This is the same property for replace-by-fee:
    // a replacement is signed (which fixes its hash), journaled, and only
    // then handed to the node — so a replacement the node accepted while
    // the acknowledgement was lost is still a hash the row can look up.
    broadcast.length = 0;
    journal.length = 0;
    journalAtBroadcast.length = 0;

    // A timed-out transaction is exactly this: a signed description of a
    // transaction the node has already accepted. Nothing is broadcast here.
    const stuck = await service.prepareCompletion(10, 85, 'Solidity', NONCE);
    expect(broadcast).toHaveLength(0);

    const receipt = await service.waitForCompletion(stuck, 30_000, async (hash) => {
      journal.push(hash);
    });

    // Only the replacement reached the node.
    expect(broadcast).toHaveLength(1);
    const replacementRaw = broadcast[0];
    const decoded = ethers.Transaction.from(replacementRaw);

    // Same nonce, same sender, same recipient, same call: a replacement,
    // never a second transaction on a fresh nonce.
    expect(decoded.nonce).toBe(NONCE);
    expect(decoded.chainId).toBe(CHAIN_ID);
    expect(decoded.from).toBe(wallet.address);
    expect(decoded.to?.toLowerCase()).toBe(CONTRACT.toLowerCase());
    const call = new ethers.Interface([
      'function recordCompletion(uint256 _moduleId, uint256 _score, string memory _moduleTopic) external',
    ]).parseTransaction({ data: decoded.data });
    expect(call?.name).toBe('recordCompletion');
    expect([call?.args[0], call?.args[1], call?.args[2]]).toEqual([10n, 85n, 'Solidity']);

    // Fees bumped by 25% over the stuck transaction's, on both legs —
    // well past the mempool's +10% replacement rule.
    expect(decoded.maxFeePerGas).toBe((stuck.maxFeePerGas! * 125n) / 100n);
    expect(decoded.maxPriorityFeePerGas).toBe((stuck.maxPriorityFeePerGas! * 125n) / 100n);
    expect(decoded.maxFeePerGas!).toBeGreaterThan(stuck.maxFeePerGas!);

    // The journal learned the replacement's hash before the node received
    // the bytes, and the hash it learned is the hash of those bytes.
    expect(journal).toEqual([decoded.hash]);
    expect(journalAtBroadcast).toEqual([[decoded.hash]]);
    expect(ethers.keccak256(replacementRaw)).toBe(decoded.hash);

    // The wait resolved on the replacement's own receipt.
    expect(receipt.hash).toBe(decoded.hash);
    expect(receipt.blockNumber).toBe(257); // 0x101, the fake node's receipt
  });
});
