import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@/i18n';

const LOCALE_NAMES: Record<string, string> = {
  'en': 'English',
  'pt-BR': 'Português',
  'es': 'Español',
  'fr': 'Français',
  'ja': '日本語',
  'ar': 'العربية',
};

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="font-mono text-xs bg-transparent border border-border rounded-md px-2 py-1 focus-ring-v2"
      aria-label={t('common:language')}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <option key={loc} value={loc}>{LOCALE_NAMES[loc]}</option>
      ))}
    </select>
  );
}
