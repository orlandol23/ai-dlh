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
 * Create tRPC client
 */
export const createTRPCClient = () => {
  return trpc.createClient({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_API_URL || 'http://localhost:3000/trpc',
        headers() {
          const token = localStorage.getItem('auth_token');
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
};
