import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select';

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
    <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger
        className="w-auto h-8 px-2 text-xs font-mono bg-transparent border-border"
        aria-label={t('common:language')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((loc) => (
          <SelectItem key={loc} value={loc}>{LOCALE_NAMES[loc]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
