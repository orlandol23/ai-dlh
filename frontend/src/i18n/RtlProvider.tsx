import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RTL_LOCALES, type SupportedLocale } from './index';

export function RtlProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language as SupportedLocale;
    const dir = RTL_LOCALES.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [i18n.language]);

  return <>{children}</>;
}
