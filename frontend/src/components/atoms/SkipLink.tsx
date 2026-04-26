import { useTranslation } from 'react-i18next';

export function SkipLink() {
  const { t } = useTranslation('common');
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4
                 focus:z-50 focus:bg-primary focus:text-primary-foreground
                 focus:px-4 focus:py-2 focus:rounded-md focus-ring-v2"
    >
      {t('skipToContent')}
    </a>
  );
}
