import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import superjson from 'superjson';
import type { RouterOutputs } from '@/lib/trpc';

/**
 * The authenticated user. Derived from the tRPC `auth.login` mutation
 * output instead of redeclared, so any change in the backend's `User`
 * shape (added/renamed fields, type tightening) shows up here as a
 * compile error rather than silently drifting.
 */
export type User = RouterOutputs['auth']['login']['user'];

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

/**
 * Custom storage that round-trips through superjson instead of JSON.
 *
 * The User type carries Date fields (createdAt, lastLoginAt) returned by
 * tRPC via superjson. Default JSON.stringify would serialize them to ISO
 * strings on persist, and on reload they'd come back as strings —
 * making the runtime value disagree with the inferred type. Using
 * superjson here keeps Dates as Dates across reloads, and stays the
 * same transformer tRPC already uses on the wire.
 *
 * We persist `PersistedAuthState` (a subset, see partialize below), but
 * the storage itself is generic over `unknown` because it just shuttles
 * whatever shape persist hands it.
 */
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Defensive localStorage wrappers.
 *
 * Direct `localStorage.*` calls can throw in browsers that disable storage
 * (private mode, "Block all cookies"), in restricted iframe contexts, or
 * when the quota is full — and they don't exist at all under SSR / Vitest
 * jsdom-less setups. Wrapping every access lets the store fall back to
 * in-memory state instead of crashing on import or surface-level render.
 * (Same pattern themeStore.ts uses; centralized here to keep both stores
 * consistent.)
 */
function safeGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — we still update the in-memory store, the user just
    // won't be remembered after a reload.
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

const superjsonStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    const value = safeGet(name);
    if (!value) return null;
    try {
      return superjson.parse(value);
    } catch {
      // Corrupt or pre-superjson payload — drop it so persist starts
      // clean instead of throwing on every render and breaking auth.
      // Also wipe the standalone bearer token: if we keep the token but
      // lose the user/isAuthenticated state, the UI re-mounts as
      // logged-out while tRPC still sends an Authorization header
      // backed by stale credentials. Fully resetting both keys gives
      // a single coherent "logged out, please reconnect" state.
      safeRemove(name);
      safeRemove(AUTH_TOKEN_KEY);
      return null;
    }
  },
  setItem: (name, value) => {
    safeSet(name, superjson.stringify(value));
  },
  removeItem: (name) => safeRemove(name),
};

/**
 * Auth store using Zustand
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        // Update the store first so the UI is consistent regardless of
        // whether the localStorage write succeeds (it can fail in private
        // mode, with cookies blocked, or when quota is full). The
        // session just won't survive a reload — same trade-off
        // themeStore makes.
        if (token) {
          safeSet(AUTH_TOKEN_KEY, token);
        } else {
          safeRemove(AUTH_TOKEN_KEY);
        }
        set({ token });
      },

      logout: () => {
        safeRemove(AUTH_TOKEN_KEY);
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: superjsonStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
