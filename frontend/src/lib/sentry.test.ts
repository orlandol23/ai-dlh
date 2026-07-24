import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * C1 acceptance tests (frontend):
 *  - without VITE_SENTRY_DSN the module is a silent no-op;
 *  - with a DSN, init activates the SDK and exceptions are forwarded with
 *    their structured context (e.g. ErrorBoundary componentStack);
 *  - `beforeSend` scrubs Authorization/cookie material from every event.
 */

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));

vi.mock('@sentry/react', () => ({
  init: sentryMocks.init,
  captureException: sentryMocks.captureException,
  browserTracingIntegration: sentryMocks.browserTracingIntegration,
}));

/** Fresh copy of the module so `initialized` state never leaks between tests. */
async function loadSentryModule() {
  vi.resetModules();
  return import('./sentry');
}

describe('lib/sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('without VITE_SENTRY_DSN (no-op mode)', () => {
    it('initSentry returns false and never calls Sentry.init', async () => {
      const { initSentry, isSentryEnabled } = await loadSentryModule();

      // vitest does not define VITE_SENTRY_DSN, so the default param is
      // undefined — exactly the state of a build without the env var.
      expect(initSentry()).toBe(false);
      expect(isSentryEnabled()).toBe(false);
      expect(sentryMocks.init).not.toHaveBeenCalled();
    });

    it('captureException forwards nothing to the SDK', async () => {
      const { initSentry, captureException } = await loadSentryModule();
      initSentry();

      captureException(new Error('boom'), { componentStack: 'at App' });

      expect(sentryMocks.captureException).not.toHaveBeenCalled();
    });
  });

  describe('with a DSN', () => {
    const DSN = 'https://publicKey@o0.ingest.sentry.io/0';

    it('initSentry activates the SDK with low tracesSampleRate and the scrubber', async () => {
      const { initSentry, isSentryEnabled } = await loadSentryModule();

      expect(initSentry(DSN)).toBe(true);
      expect(isSentryEnabled()).toBe(true);
      expect(sentryMocks.init).toHaveBeenCalledTimes(1);
      expect(sentryMocks.init.mock.calls[0][0]).toMatchObject({
        dsn: DSN,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      });
      expect(sentryMocks.init.mock.calls[0][0].beforeSend).toBeTypeOf('function');
    });

    it('captureException forwards the error with structured context', async () => {
      const { initSentry, captureException } = await loadSentryModule();
      initSentry(DSN);

      const error = new Error('render crash');
      captureException(error, { componentStack: 'at ModulePage' });

      expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
      expect(sentryMocks.captureException).toHaveBeenCalledWith(error, {
        extra: { componentStack: 'at ModulePage' },
      });
    });
  });

  describe('scrubSensitiveData (beforeSend)', () => {
    it('removes Authorization (any casing), cookies and API keys, keeps the rest', async () => {
      const { scrubSensitiveData } = await loadSentryModule();

      const event = {
        request: {
          url: 'https://app.example.com/dashboard',
          headers: {
            Authorization: 'Bearer eyJhbGciOi...jwt',
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
      expect(scrubbed.request?.url).toBe('https://app.example.com/dashboard');
    });

    it('is a pass-through for events without request data', async () => {
      const { scrubSensitiveData } = await loadSentryModule();

      const event = { message: 'plain event' };
      expect(scrubSensitiveData(event as never)).toBe(event);
    });
  });
});
