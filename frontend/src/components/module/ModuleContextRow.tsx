import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';

/**
 * ModuleContextRow — compact module context strip (v3 C3, W3 header row).
 *
 * Sits under the persistent AppShell and carries only the module's own
 * context: back to Dashboard, level, estimated time, focus-mode entry.
 * The AppShell already owns logo, navigation, wallet, tier, language,
 * theme, preferences and disconnect — none of that is duplicated here.
 *
 * - Level and time are neutral metadata (mono ink, v3 §11 P2): no semantic
 *   success/warning/error colouring, unlike the old level Badge.
 * - Logical properties + rtl:rotate-180 keep it RTL-safe.
 * - Touch targets are 44px (h-11 buttons).
 */
export interface ModuleContextRowProps {
  level: string;
  /** Nullable in the module schema — rendered as-is (same as before). */
  estimatedTime: number | null;
  onBack: () => void;
  onFocusEnter: () => void;
}

export function ModuleContextRow({
  level,
  estimatedTime,
  onBack,
  onFocusEnter,
}: ModuleContextRowProps) {
  const { t } = useTranslation(['module', 'common']);

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="sm" className="h-11" onClick={onBack}>
            <span aria-hidden="true" className="me-1 inline-block font-mono rtl:rotate-180">
              ←
            </span>
            {t('module:header.back')}
          </Button>
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span>{t(`module:level.${level}`)}</span>
            <span aria-hidden="true" className="text-border-strong">
              ·
            </span>
            <span className="tabular-nums">
              {estimatedTime} {t('module:header.minutes')}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-11"
          onClick={onFocusEnter}
          aria-label={t('module:focus.enter')}
        >
          {t('module:focus.enter')}
        </Button>
      </div>
    </div>
  );
}
