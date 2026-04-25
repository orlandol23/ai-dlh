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
const superjsonStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    const value = localStorage.getItem(name);
    if (!value) return null;
    try {
      return superjson.parse(value);
    } catch {
      // Corrupt or pre-superjson payload — drop it so persist starts clean
      // instead of throwing on every render and breaking auth.
      localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    localStorage.setItem(name, superjson.stringify(value));
  },
  removeItem: (name) => localStorage.removeItem(name),
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
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
        set({ token });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
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
