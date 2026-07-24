import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * C1 acceptance tests:
 *  - without SENTRY_DSN the whole module is a silent no-op (init returns
 *    false, nothing is forwarded to the SDK);
 *  - with a DSN, init activates the SDK and exceptions are forwarded with
 *    their structured context;
 *  - `beforeSend` scrubs Authorization/cookie material from every event.
 */

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  config: {
    NODE_ENV: 'test',
    SENTRY_DSN: undefined as string | undefined,
  },
}));

vi.mock('@sentry/node', () => ({
  init: sentryMocks.init,
  captureException: sentryMocks.captureException,
}));

vi.mock('./env.js', () => ({
  config: envMock.config,
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

/** Fresh copy of the module so `initialized` state never leaks between tests. */
async function loadSentryModule() {
  vi.resetModules();
  return import('./sentry.js');
}

describe('utils/sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.config.SENTRY_DSN = undefined;
  });

  describe('without SENTRY_DSN (no-op mode)', () => {
    it('initSentry returns false and never calls Sentry.init', async () => {
      const { initSentry, isSentryEnabled } = await loadSentryModule();

      expect(initSentry()).toBe(false);
      expect(isSentryEnabled()).toBe(false);
      expect(sentryMocks.init).not.toHaveBeenCalled();
    });

    it('captureException forwards nothing to the SDK', async () => {
      const { initSentry, captureException } = await loadSentryModule();
      initSentry();

      captureException(new Error('boom'), { recordId: 1, attempt: 2 });

      expect(sentryMocks.captureException).not.toHaveBeenCalled();
    });
  });

  describe('with SENTRY_DSN set', () => {
    const DSN = 'https://publicKey@o0.ingest.sentry.io/0';

    it('initSentry activates the SDK with the configured DSN', async () => {
      envMock.config.SENTRY_DSN = DSN;
      const { initSentry, isSentryEnabled } = await loadSentryModule();

      expect(initSentry()).toBe(true);
      expect(isSentryEnabled()).toBe(true);
      expect(sentryMocks.init).toHaveBeenCalledTimes(1);
      expect(sentryMocks.init.mock.calls[0][0]).toMatchObject({
        dsn: DSN,
        sendDefaultPii: false,
      });
      // The scrubber must be wired as beforeSend.
      expect(sentryMocks.init.mock.calls[0][0].beforeSend).toBeTypeOf('function');
    });

    it('captureException forwards the error with structured context', async () => {
      envMock.config.SENTRY_DSN = DSN;
      const { initSentry, captureException } = await loadSentryModule();
      initSentry();

      const error = new Error('rpc down');
      captureException(error, { recordId: 42, attempt: 3 });

      expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
      expect(sentryMocks.captureException).toHaveBeenCalledWith(error, {
        extra: { recordId: 42, attempt: 3 },
      });
    });
  });

  describe('scrubSensitiveData (beforeSend)', () => {
    it('removes Authorization (any casing), cookies and API keys, keeps the rest', async () => {
      const { scrubSensitiveData } = await loadSentryModule();

      const event = {
        request: {
          url: 'https://api.example.com/trpc/ai.generateModule',
          headers: {
            Authorization: 'Bearer eyJhbGciOi...jwt',
            authorization: 'Bearer duplicate-lowercase',
            Cookie: 'session=abc123',
            'X-Api-Key': 'super-secret',
            'content-type': 'application/json',
            'user-agent': 'vitest',
          },
          cookies: { session: 'abc123' },
        },
      };

      // Runtime shape matches Sentry's ErrorEvent.request contract.
      const scrubbed = scrubSensitiveData(event as never);

      expect(scrubbed.request?.headers).toEqual({
        'content-type': 'application/json',
        'user-agent': 'vitest',
      });
      expect(scrubbed.request).not.toHaveProperty('cookies');
      // Non-sensitive fields are untouched.
      expect(scrubbed.request?.url).toBe('https://api.example.com/trpc/ai.generateModule');
    });

    it('is a pass-through for events without request data', async () => {
      const { scrubSensitiveData } = await loadSentryModule();

      const event = { message: 'plain event' };
      expect(scrubSensitiveData(event as never)).toBe(event);
    });
  });
});
