import { useThemeStore, type Theme } from '@/store/themeStore';

export type { Theme };

/**
 * Compatibility wrapper around the shared theme store.
 * All consumers (ThemeToggle, Toaster, etc.) read from the same source,
 * so toggling the theme re-renders every observer.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggle = useThemeStore((s) => s.toggle);
  return { theme, setTheme, toggle };
}
