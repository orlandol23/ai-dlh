import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'ja', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES: SupportedLocale[] = ['ar'];

// NOTE: 'vark' now ships all six locales. pt-BR and en are authored; es, fr,
// ja and ar are machine-translated (structure/placeholder-parity verified)
// and pending human review — see docs/FUSION_APRENDAMAIS.md (Fase 1).
export const NAMESPACES = ['common', 'home', 'dashboard', 'module', 'quiz', 'cert', 'auth', 'zod', 'vark'] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ai_dlh_locale',
    },
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    ns: [...NAMESPACES],
    defaultNS: 'common',
  });

export default i18n;
