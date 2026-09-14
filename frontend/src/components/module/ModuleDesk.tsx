import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/atoms/Button';

/**
 * ModuleDesk — the primary reading desk of the C3 composition
 * (docs/DESIGN-SYSTEM.md §4 C3, wireframe W3).
 *
 * - factual eyebrow (module # + generator), display title, neutral
 *   metadata, restrained 2px title rule;
 * - the generated lesson as the main reading area: plain warm canvas,
 *   width capped at 72ch, no rounded wrapper, no gradient text, no
 *   decorative background — `prose-token` keeps headings, lists, tables,
 *   links, code and overflow behaviour (both directions) intact;
 * - exactly one primary action (start/retake quiz) close to the end of the
 *   reading content — not embedded in a decorative card.
 *
 * Purely presentational: state and navigation live in ModulePage.
 */
export interface ModuleDeskProps {
  moduleId: number;
  title: string;
  topic: string;
  level: string;
  /** Nullable in the module schema — rendered as-is (same as before). */
  estimatedTime: number | null;
  provider: string;
  content: string;
  /** Any graded attempt exists → the action becomes "Retake quiz". */
  hasAttempt: boolean;
  onStartQuiz: () => void;
}

export function ModuleDesk({
  moduleId,
  title,
  topic,
  level,
  estimatedTime,
  provider,
  content,
  hasAttempt,
  onStartQuiz,
}: ModuleDeskProps) {
  const { t } = useTranslation('module');

  return (
    <article className="min-w-0 max-w-[72ch]">
      {/* Title block — eyebrow, display title, 2px rule (v3 §6). */}
      <p className="eyebrow">
        {t('desk.eyebrow')} #{moduleId}
        <span aria-hidden="true"> · </span>
        {provider}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {/* Restrained 2px title rule (v3 §6) */}
      <div className="mt-3 h-0.5 w-full bg-foreground/90" aria-hidden="true" />

      {/* Neutral metadata — level and time never borrow state colours. */}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span>{t(`level.${level}`)}</span>
        <span aria-hidden="true" className="text-border-strong">
          ·
        </span>
        <span className="tabular-nums">
          {estimatedTime} {t('header.minutes')}
        </span>
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{t('topicLabel', { topic })}</p>

      {/* Reading area — plain canvas, no rounded wrapper (v3 C3). */}
      <div className="prose prose-token mt-8 max-w-[72ch] font-sans">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>

      {/* Single primary action under the prose. */}
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pb-2 pt-6">
        <Button size="lg" onClick={onStartQuiz}>
          {hasAttempt ? t('retakeQuiz') : t('startQuiz')}
          <span aria-hidden="true" className="ms-2 inline-block font-mono rtl:rotate-180">
            →
          </span>
        </Button>
        <p className="font-mono text-xs text-muted-foreground">{t('desk.passNote')}</p>
      </div>
    </article>
  );
}
