import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'ja', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES: SupportedLocale[] = ['ar'];

// NOTE: 'vark' currently ships pt-BR and en only — the other locales
// intentionally fall back to en (fallbackLng) until human-reviewed
// translations land. See docs/FUSION_APRENDAMAIS.md (Fase 1).
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
