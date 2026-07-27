import { describe, expect, it, vi } from 'vitest';
import { UserRejectedRequestError, type EIP1193Provider } from 'viem';
import {
  buildLoginMessage,
  connectAndSign,
  findRpcErrorCode,
  generateNonce,
  isRequestPending,
  isUserRejection,
} from './wallet';

const ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const;
const SIGNATURE = `0x${'ab'.repeat(65)}` as const;

/**
 * Minimal EIP-1193 provider: viem only needs `request`, so a recorded call
 * log is enough to assert the whole flow without a browser or a wallet.
 */
function fakeProvider(
  handlers: Partial<Record<string, (params?: unknown) => unknown>> = {},
): { provider: EIP1193Provider; calls: string[] } {
  const calls: string[] = [];
  const provider = {
    request: async ({ method, params }: { method: string; params?: unknown }) => {
      calls.push(method);
      const handler = handlers[method];
      if (handler) return handler(params);
      if (method === 'eth_requestAccounts') return [ADDRESS];
      if (method === 'personal_sign') return SIGNATURE;
      throw new Error(`unexpected method: ${method}`);
    },
  } as unknown as EIP1193Provider;
  return { provider, calls };
}

describe('buildLoginMessage', () => {
  it('emits the exact grammar the backend parses', () => {
    expect(
      buildLoginMessage({
        address: ADDRESS,
        domain: 'ai-dlh.example',
        timestamp: 1_700_000_000_000,
        nonce: 'abc-123',
      }),
    ).toBe(
      'AI-DLH Authentication\n' +
        'Domain: ai-dlh.example\n' +
        `Address: ${ADDRESS}\n` +
        'Timestamp: 1700000000000\n' +
        'Nonce: abc-123',
    );
  });

  it('keeps the five fields in order, one per line', () => {
    const lines = buildLoginMessage({
      address: ADDRESS,
      domain: 'd',
      timestamp: 1,
      nonce: 'n',
    }).split('\n');

    expect(lines).toHaveLength(5);
    expect(lines[1].startsWith('Domain: ')).toBe(true);
    expect(lines[2].startsWith('Address: ')).toBe(true);
    expect(lines[3].startsWith('Timestamp: ')).toBe(true);
    expect(lines[4].startsWith('Nonce: ')).toBe(true);
  });
});

describe('generateNonce', () => {
  it('is base64url, with no padding or wire-unsafe characters', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('does not repeat across calls', () => {
    const nonces = new Set(Array.from({ length: 50 }, generateNonce));
    expect(nonces.size).toBe(50);
  });
});

describe('connectAndSign', () => {
  it('requests accounts, then signs, and returns all three fields', async () => {
    const { provider, calls } = fakeProvider();

    const result = await connectAndSign(provider, {
      domain: 'ai-dlh.example',
      now: () => 1_700_000_000_000,
    });

    expect(calls).toEqual(['eth_requestAccounts', 'personal_sign']);
    expect(result.address).toBe(ADDRESS);
    expect(result.signature).toBe(SIGNATURE);
    expect(result.message).toContain(`Address: ${ADDRESS}`);
    expect(result.message).toContain('Domain: ai-dlh.example');
  });

  it('signs the very message it returns, so the backend can verify it', async () => {
    const signed: string[] = [];
    const { provider } = fakeProvider({
      personal_sign: (params) => {
        // personal_sign params are [dataHex, address]; viem hex-encodes the message.
        const [dataHex] = params as [string, string];
        const bytes = dataHex.slice(2).match(/.{2}/g) ?? [];
        signed.push(bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join(''));
        return SIGNATURE;
      },
    });

    const result = await connectAndSign(provider, { domain: 'd', now: () => 1 });

    expect(signed).toHaveLength(1);
    expect(signed[0]).toBe(result.message);
  });

  it('throws a clear error when the wallet returns no accounts', async () => {
    const { provider } = fakeProvider({ eth_requestAccounts: () => [] });

    await expect(connectAndSign(provider, { domain: 'd' })).rejects.toThrow(
      /no accounts/i,
    );
  });

  it('does not sign when account access is rejected', async () => {
    const { provider, calls } = fakeProvider({
      eth_requestAccounts: () => {
        throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
      },
    });

    await expect(connectAndSign(provider, { domain: 'd' })).rejects.toThrow();
    expect(calls).not.toContain('personal_sign');
  });

  it('uses the injected clock so the timestamp is deterministic', async () => {
    const now = vi.fn(() => 1_234_567_890);
    const { provider } = fakeProvider();

    const result = await connectAndSign(provider, { domain: 'd', now });

    expect(now).toHaveBeenCalledOnce();
    expect(result.message).toContain('Timestamp: 1234567890');
  });
});

describe('findRpcErrorCode', () => {
  it('reads a code off the thrown object', () => {
    expect(findRpcErrorCode({ code: 4001 })).toBe(4001);
  });

  it('finds a code nested in the cause chain, which is where viem puts it', () => {
    expect(findRpcErrorCode({ cause: { cause: { code: -32002 } } })).toBe(-32002);
  });

  it('ignores string codes, the ethers v6 shape that broke the old check', () => {
    expect(findRpcErrorCode({ code: 'ACTION_REJECTED' })).toBeUndefined();
  });

  it('returns undefined instead of looping on a self-referential cause', () => {
    const error: { cause?: unknown } = {};
    error.cause = error;
    expect(findRpcErrorCode(error)).toBeUndefined();
  });

  it('handles null and primitives without throwing', () => {
    expect(findRpcErrorCode(null)).toBeUndefined();
    expect(findRpcErrorCode('boom')).toBeUndefined();
    expect(findRpcErrorCode(undefined)).toBeUndefined();
  });
});

describe('isUserRejection', () => {
  it('recognizes viem’s typed rejection', () => {
    expect(isUserRejection(new UserRejectedRequestError(new Error('denied')))).toBe(true);
  });

  it('recognizes a raw 4001 from an injected provider', () => {
    expect(isUserRejection({ code: 4001 })).toBe(true);
  });

  it('recognizes 4001 nested in the cause chain', () => {
    expect(isUserRejection({ cause: { code: 4001 } })).toBe(true);
  });

  it('does not fire on unrelated failures', () => {
    expect(isUserRejection(new Error('network down'))).toBe(false);
    expect(isUserRejection({ code: -32002 })).toBe(false);
  });
});

describe('isRequestPending', () => {
  it('recognizes a raw -32002', () => {
    expect(isRequestPending({ code: -32002 })).toBe(true);
  });

  it('recognizes -32002 nested in the cause chain', () => {
    expect(isRequestPending({ cause: { code: -32002 } })).toBe(true);
  });

  it('does not fire on a rejection', () => {
    expect(isRequestPending({ code: 4001 })).toBe(false);
  });
});
