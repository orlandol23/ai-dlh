import { describe, it, expect, vi } from 'vitest';

// The env module is mocked the same way the rest of the server suite mocks it,
// so the logger can be imported without a populated .env.
vi.mock('./env.js', () => ({ config: { NODE_ENV: 'test' } }));

import { logger } from './logger.js';

/**
 * These pin two properties of the logger that a call site cannot provide for
 * itself:
 *
 *  1. Logging never changes control flow. A `logger.warn` inside a `catch`
 *     block used to throw `TypeError: Converting circular structure to JSON`
 *     on any AxiosError, which aborted the recovery path that contained it.
 *  2. A credential handed to the logger by accident never reaches a
 *     transport. The provider router used to pass the raw AxiosError, whose
 *     request config carries `Authorization: Bearer <api key>`.
 */

/** Capture what the formatter actually produced, without touching the disk. */
function captureLine(fn: () => void): string {
  const written: string[] = [];
  const transport = logger.transports[0];
  const original = transport.log?.bind(transport);
  // winston hands the formatted line to the transport as info[MESSAGE].
  transport.log = (info: Record<string | symbol, unknown>, next: () => void) => {
    const symbols = Object.getOwnPropertySymbols(info);
    const messageSymbol = symbols.find((s) => String(s) === 'Symbol(message)');
    written.push(String(messageSymbol ? info[messageSymbol] : info.message));
    next();
  };
  try {
    fn();
  } finally {
    if (original) transport.log = original;
  }
  return written.join('\n');
}

/** An AxiosError as the Qwen provider would throw it: circular, with a key. */
function axiosLikeError(apiKey: string): Error {
  const err = new Error('Request failed with status code 500') as Error & {
    isAxiosError: boolean;
    config: unknown;
    request: Record<string, unknown>;
  };
  err.isAxiosError = true;
  err.config = {
    url: 'https://dashscope.example/api/v1/chat',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  };
  // The circular part: a Node ClientRequest points back at its own socket.
  const request: Record<string, unknown> = { path: '/api/v1/chat' };
  const socket: Record<string, unknown> = { _httpMessage: request };
  request.socket = socket;
  err.request = request;
  return err;
}

describe('logger — a log call must not change control flow', () => {
  it('does not throw on a circular metadata object', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;

    expect(() => logger.warn('circular meta', { circular })).not.toThrow();
  });

  it('does not throw on an AxiosError with a circular request', () => {
    expect(() => logger.warn('provider failed', axiosLikeError('k'))).not.toThrow();
  });

  it('lets the catch block that logged keep running', () => {
    // The regression this replaces: the throw escaped the catch block, so the
    // fallback provider was never attempted.
    let reachedFallback = false;

    expect(() => {
      try {
        throw axiosLikeError('k');
      } catch (err) {
        logger.warn('primary failed, trying fallback', err);
        reachedFallback = true;
      }
    }).not.toThrow();

    expect(reachedFallback).toBe(true);
  });

  it('still renders the message and keeps non-sensitive metadata', () => {
    const line = captureLine(() => logger.warn('provider failed', { provider: 'qwen' }));

    expect(line).toContain('provider failed');
    expect(line).toContain('qwen');
  });
});

describe('logger — a credential handed in by accident never reaches a transport', () => {
  const SECRET = 'sk-dashscope-SHOULD-NEVER-APPEAR';

  it('redacts the Authorization header when the AxiosError is the metadata arg', () => {
    // This is the exact shape the provider router used to log. winston spreads
    // an Error passed as metadata into its own enumerable properties, so
    // `config.headers.Authorization` arrives as an ordinary nested field.
    const line = captureLine(() => logger.warn('provider failed', axiosLikeError(SECRET)));

    expect(line).not.toContain(SECRET);
    expect(line).toContain('[redacted]');
    // The circular request is rendered, not thrown on.
    expect(line).toContain('[circular]');
  });

  it('keeps an Error passed as metadata down to name, message and stack', () => {
    const line = captureLine(() => logger.warn('provider failed', { err: axiosLikeError(SECRET) }));

    expect(line).not.toContain(SECRET);
    // Nested Errors never carry their extra properties into the line at all.
    expect(line).not.toContain('dashscope.example');
  });

  it('redacts a credential passed as a top-level metadata field', () => {
    const line = captureLine(() =>
      logger.error('boom', { authorization: `Bearer ${SECRET}`, apiKey: SECRET, requestId: 'r-1' })
    );

    expect(line).not.toContain(SECRET);
    expect(line).toContain('r-1');
  });

  it('redacts regardless of header casing', () => {
    const line = captureLine(() =>
      logger.warn('casing', { headers: { AUTHORIZATION: SECRET, 'X-Api-Key': SECRET } })
    );

    expect(line).not.toContain(SECRET);
  });
});
