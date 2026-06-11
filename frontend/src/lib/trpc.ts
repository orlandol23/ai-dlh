import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/routers';
import superjson from 'superjson';

/**
 * Create tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/** Helpers to extract input/output types from any procedure on the server. */
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Defensive read of the bearer token from localStorage. Mirrors the
 * `safeGet` pattern used in the auth/theme stores: `localStorage` can
 * throw in private mode, restrictive iframes, or quota-exceeded states,
 * and is undefined under SSR. A throw here would crash the tRPC client
 * factory before the app ever mounts. Falling back to an unauthenticated
 * request is the right default: the UI will show the login screen.
 */
function readAuthToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/**
 * Create tRPC client
 */
export const createTRPCClient = () => {
  return trpc.createClient({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_API_URL || 'http://localhost:3000/trpc',
        headers() {
          const token = readAuthToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
};
