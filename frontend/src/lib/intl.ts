import { useTranslation } from 'react-i18next';

/**
 * Locale-aware date formatter.
 * Default options: { dateStyle: 'medium' }.
 */
export function useFormatDate() {
  const { i18n } = useTranslation();
  return (date: Date | string | number, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(i18n.language, opts).format(d);
  };
}

/**
 * Locale-aware number formatter.
 * Pass Intl.NumberFormatOptions for currency, percent, decimals, etc.
 */
export function useFormatNumber() {
  const { i18n } = useTranslation();
  return (n: number, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(i18n.language, opts).format(n);
}

/**
 * Locale-aware relative time formatter.
 * Example: useFormatRelativeTime()(-1, 'day') -> "yesterday" (en) / "ontem" (pt-BR).
 */
export function useFormatRelativeTime() {
  const { i18n } = useTranslation();
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
  return (value: number, unit: Intl.RelativeTimeFormatUnit) => rtf.format(value, unit);
}

/**
 * Returns a stable day key (YYYY-MM-DD) for a given date in a given timezone.
 * Used for streak calculations that must respect the user's local day boundary.
 */
export function dayKeyInTimezone(date: Date | string | number, timezone?: string): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
