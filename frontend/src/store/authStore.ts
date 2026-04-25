import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
