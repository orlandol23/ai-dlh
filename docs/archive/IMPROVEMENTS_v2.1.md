# AI-DLH — Improvements Plan v2.1 (i18n-first)

> **📌 Status: ✅ DONE** (PRs [#14](https://github.com/orlandol23/ai-dlh/pull/14) and
> [#15](https://github.com/orlandol23/ai-dlh/pull/15)) — kept as a
> historical record. Only remaining open item: **dynamic OG image for the certificate**
> (item D.5), absorbed by [MASTER_PLAN.md](../MASTER_PLAN.md) as **C7**.

> Sequence of improvements after the v2 "Circuit & Ink" migration.
> Paste this file into Claude Code inside the `orlandol23/ai-dlh` repo on a new branch.
> Order matters: **A0 → A → B → C → D → E**.
> Total estimate: ~12-15h.

---

## Overview

| Phase | Status | Time | Content |
|---|---|---|---|
| A0 — i18n foundation | NEW | ~3-4.5h | i18next, RTL, fonts, Intl, string migration |
| A — Polish | revised | ~1h | 5 fixes for the v2 design system |
| B — Accessibility | revised | ~1.5-2h | reduced-motion, ARIA, Radix Select, skip-link, contrast |
| C — Empty states & loading | revised | ~1.5h | empty states, skeletons, indeterminate bar |
| D — Product | revised | ~3-4h | onboarding, share, streak, focus mode, /cert/:hash |
| E — Backend i18n + Provider abstraction | NEW | ~3-4h | AIProvider interface, parameterized prompt, schema migration |

**Branch:** `feat/design-system-v2-1-i18n`
**MVP languages:** `en, pt-BR, es, fr, ja, ar`
**Primary LLM:** Gemini 2.5 Flash (paid) with infrastructure for Sonnet 4.6 (premium) and Qwen 3 (region=cn)

---

## Global conventions

- **Don't touch tokens:** `globals.css` and `tailwind.config.js` are already correct. Only add new utilities if needed (`focus-ring-v2`, `bar-indeterminate`).
- **New libraries allowed:**
  - `react-i18next`, `i18next`, `i18next-browser-languagedetector`, `i18next-http-backend`
  - `zod-i18n-map`
  - `@radix-ui/react-select`
  - `@anthropic-ai/sdk` (Phase E — premium tier)
  - `axios` or the DashScope SDK (Phase E — region=cn)
- **Atomic commits per sub-item** (e.g. `feat(i18n): setup react-i18next [A0.1]`).
- **One PR per phase** with before/after screenshots.
- **CI must pass** between phases — don't accumulate type/lint debt.

---

## MVP target languages

| Locale | Name | Direction | Specific validations |
|---|---|---|---|
| `en` | English | LTR | default fallback |
| `pt-BR` | Português (Brasil) | LTR | current content base |
| `es` | Español | LTR | Latin script, plural rules |
| `fr` | Français | LTR | Latin script, spaces before `:` `?` `!` |
| `ja` | 日本語 | LTR | CJK font fallback, no spaces between words |
| `ar` | العربية | RTL | reversed direction, Arabic fonts |

Structure prepared to add more languages without a refactor.

---

## Phase A0 — i18n foundation (~3-4.5h, BLOCKER for everything)

> Without A0 done, any new string from phases B-D is born hardcoded and creates rework. **Don't skip it.**

### A0.1 — react-i18next setup (~30min)

```bash
cd frontend && npm i react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

Criar `frontend/src/i18n/index.ts`:

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'ja', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const RTL_LOCALES: SupportedLocale[] = ['ar'];

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
    ns: ['common', 'home', 'dashboard', 'module', 'quiz', 'cert', 'auth'],
    defaultNS: 'common',
  });

export default i18n;
```

Import in `frontend/src/main.tsx` before `<App />`:
```ts
import './i18n';
```

**Criterion:** `i18n.language` on boot returns the detected locale.

---

### A0.2 — Locale structure (~30min)

Create `frontend/public/locales/{en,pt-BR,es,fr,ja,ar}/` with files:
- `common.json` — universal buttons and labels
- `home.json`, `dashboard.json`, `module.json`, `quiz.json`, `cert.json`, `auth.json`

Example `common.json` (en):
```json
{
  "buttons": {
    "next": "Next",
    "previous": "Previous",
    "back": "Back",
    "skip": "Skip",
    "close": "Close",
    "share": "Share",
    "copyLink": "Copy link"
  },
  "skipToContent": "Skip to content",
  "loading": "Loading…",
  "error": { "generic": "Something went wrong" },
  "footer": { "copyright": "© {{year}} AI-DLH. Portfolio project." }
}
```

For `pt-BR`, translate from the strings already hardcoded in the app (this will be the source of truth during the migration).

**Criterion:** `?lng=ja` changes `t('common:buttons.next')` to `次へ`.

---

### A0.3 — RTL support (~30min)

`frontend/src/i18n/RtlProvider.tsx`:

```tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RTL_LOCALES, type SupportedLocale } from './index';

export function RtlProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  useEffect(() => {
    const lang = i18n.language as SupportedLocale;
    const dir = RTL_LOCALES.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [i18n.language]);
  return <>{children}</>;
}
```

Plug into `App.tsx`, wrapping the content.

**Tailwind:** logical properties already supported in 3.3+ (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`). Replace `pl-`/`pr-`/`left-`/`right-` with logical equivalents where it makes sense (no need to migrate 100% — only where direction matters).

**Criterion:** with `?lng=ar`, `<html dir="rtl">` and mirrored layout.

---

### A0.4 — Global font fallbacks (~20min)

`frontend/tailwind.config.js`:
```js
fontFamily: {
  display: ['"Space Grotesk"', '"Noto Sans"', '"Noto Sans JP"', '"Noto Sans Arabic"', 'sans-serif'],
  body: ['Inter', '"Noto Sans"', '"Noto Sans JP"', '"Noto Sans Arabic"', 'sans-serif'],
  mono: ['"JetBrains Mono"', '"Noto Sans Mono"', 'monospace'],
}
```

Adicionar imports no `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600&family=Noto+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
```

**Criterion:** kanji in `?lng=ja` renders without boxes; Arabic renders with correct ligatures.

---

### A0.5 — Intl formatters (~30min)

`frontend/src/lib/intl.ts`:

```ts
import { useTranslation } from 'react-i18next';

export function useFormatDate() {
  const { i18n } = useTranslation();
  return (date: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
    new Intl.DateTimeFormat(i18n.language, opts).format(typeof date === 'string' ? new Date(date) : date);
}

export function useFormatNumber() {
  const { i18n } = useTranslation();
  return (n: number, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(i18n.language, opts).format(n);
}

export function useFormatRelativeTime() {
  const { i18n } = useTranslation();
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
  return (value: number, unit: Intl.RelativeTimeFormatUnit) => rtf.format(value, unit);
}
```

Replace every `toLocaleString`/`toLocaleDateString` scattered around with these hooks.

**Criterion:** dates change to the locale's format (en: "Apr 26, 2026" / pt-BR: "26 de abr. de 2026" / ar: "٢٦ أبريل ٢٠٢٦").

---

### A0.6 — Zod i18n (~20min)

```bash
cd frontend && npm i zod-i18n-map
```

`frontend/src/i18n/zod.ts`:
```ts
import { z } from 'zod';
import { zodI18nMap } from 'zod-i18n-map';
import './index';

z.setErrorMap(zodI18nMap);
```

Add a `zod` namespace to each `locales/<lng>/zod.json` (zod-i18n-map already provides base translations for 30+ languages — copy them from the package's examples).

**Criterion:** Zod validation on the frontend returns the message in the active language.

---

### A0.7 — Language selector (~30min)

`frontend/src/components/molecules/LanguageSelector.tsx`:

```tsx
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
      className="font-mono text-xs bg-transparent focus-ring-v2"
      aria-label={t('common:language')}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <option key={loc} value={loc}>{LOCALE_NAMES[loc]}</option>
      ))}
    </select>
  );
}
```

(Switch to Radix Select once B.3 is done.)

Plug into the `App.tsx` header, next to the wallet button.

**Criterion:** switching locale reloads strings without a refresh; persists to `localStorage`.

---

### A0.8 — Migrating existing strings (~1.5h)

**Pages/components to migrate:**
- `HomePage.tsx`, `DashboardPage.tsx`, `ModulePage.tsx`
- `App.tsx` (header, footer)
- `components/molecules/*` (all of them)
- `lib/achievements.ts` (names/descriptions)

**Pattern:**
```tsx
// Before
<h1>Aprenda com IA</h1>

// After
const { t } = useTranslation('home');
<h1>{t('hero.title')}</h1>
```

**Strategy, in order:**
1. For each page, create the key in the `pt-BR` JSON (1:1 with the hardcoded text)
2. Replace it in the `.tsx` with `t('ns:key')`
3. Visually validate in pt-BR (nothing should change)
4. Translate to `en` (can use AI, then review)
5. Remaining languages in a third pass

**Lint guard (optional):** the `eslint-plugin-react` rule `react/jsx-no-literals` in warn mode to catch regressions.

**Criterion:** with `?lng=en`, **no** PT-BR string appears on the migrated pages.

---

## Phase A — Design system polish (~1h)

> Five fixes that finish "sealing" v2. Each one is independent. After A0, every string already comes from `t()`.

### A.1 — Primary button with hover glow [unchanged]

**File:** `frontend/src/components/atoms/Button.tsx`

Add to the `default` variant:

```tsx
default:
  'bg-primary text-primary-foreground hover:-translate-y-px ' +
  'hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.12),0_8px_24px_-4px_hsl(var(--primary)/0.30)] ' +
  'active:translate-y-0 active:shadow-none',
```

Keep the remaining variants (`outline`, `ghost`, `destructive`, `secondary`, `link`) and sizes as they are.

**Criterion:** the "Começar Agora" button lifts 1px on hover and gains a purple halo with a 24px blur.

---

### A.2 — Double focus ring on inputs [unchanged]

**Arquivos:** `Input.tsx`, `<select>` inline em `DashboardPage.tsx`, `globals.css`.

`globals.css`:
```css
@layer components {
  .focus-ring-v2 {
    @apply focus-visible:outline-none
           focus-visible:ring-[3px] focus-visible:ring-primary/40
           focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
}
```

Replace `focus-visible:ring-2 ring-ring ring-offset-2` with `focus-ring-v2`.

**Criterion:** a translucent purple ring with a visible gap when tabbing through the inputs.

---

### A.3 — Quiz progress bar with brand gradient [unchanged]

**File:** `frontend/src/pages/ModulePage.tsx`

```tsx
<div
  className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-primary to-accent"
  style={{ width: `${progressPercentage}%` }}
/>
```

**Criterion:** the bar fills with a purple→cyan gradient as questions advance.

---

### A.4 — Mono-weight arrows **+ RTL-aware** [REVISED]

**Files:** `ModulePage.tsx`, `HomePage.tsx`, `DashboardPage.tsx`

**Problem with the original plan:** a hardcoded `→` arrow in text becomes visually wrong in Arabic (RTL expects `←`). Solution: use `lucide-react`'s ChevronRight/ChevronLeft, which respect the document's `dir`, or apply `rtl:rotate-180`.

**Recommended pattern** (lucide-react is already in the project):

```tsx
import { ChevronRight, ChevronLeft } from 'lucide-react';

// Botão "próximo" / "iniciar quiz"
<Button>
  {progress ? t('module:retakeQuiz') : t('module:startQuiz')}
  <ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
</Button>

// Botão "anterior"
<Button variant="ghost">
  <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
  {t('common:buttons.previous')}
</Button>
```

To preserve the **mono weight** look in text CTAs (e.g. "Ver no Etherscan →"), use `<span className="font-mono rtl:rotate-180 inline-block">→</span>`.

**Criterion:**
- LTR: arrows point right (forward) and left (back)
- RTL (`?lng=ar`): arrows mirror automatically
- Arrows keep the mono weight in CTAs

---

### A.5 — Footer with dynamic year **+ i18n** [REVISED]

**File:** `HomePage.tsx`

```tsx
const { t } = useTranslation('common');
<p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
```

JSON (`common.json`):
```json
{
  "footer": { "copyright": "© {{year}} AI-DLH. Projeto de portfólio…" }
}
```

**Criterion:** the footer shows the current year and text translated per locale.

---

## Phase B — Accessibility (~1.5-2h)

### B.1 — `prefers-reduced-motion` [unchanged]

`globals.css` (end of file):
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .skeleton { animation: none; background: hsl(var(--muted)); }
  .caret::after { animation: none; opacity: 1; }
}
```

And in `ModulePage.tsx`, on the framer-motion stamp:

```tsx
import { useReducedMotion } from 'framer-motion';
const reduce = useReducedMotion();
<motion.div
  initial={reduce ? false : { opacity: 0, scale: 2, rotate: -12 }}
  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -8 }}
  transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
/>
```

**Criterion:** turning on "Reduce motion" in the OS disables the shimmer, caret and stamp.

---

### B.2 — `aria` on the quiz option **+ i18n** [REVISED]

**File:** `ModulePage.tsx`

**Problem with the original plan:** an `aria-label` with `"Opção ${letter}: ${option}"` hardcoded in PT-BR. In RTL, a screen reader expects a label consistent with the document's `dir`.

```tsx
const { t } = useTranslation('quiz');

<div role="radiogroup" aria-labelledby="question-title">
  {options.map((option, index) => {
    const letter = String.fromCharCode(65 + index); // A, B, C, D — universal
    return (
      <button
        key={index}
        role="radio"
        aria-checked={selectedAnswers[currentQuestion] === index}
        aria-label={t('option.aria', { letter, content: option })}
        onClick={() => handleSelectAnswer(index)}
        className={...}
      >
        {option}
      </button>
    );
  })}
</div>
```

`quiz.json` (en):
```json
{ "option": { "aria": "Option {{letter}}: {{content}}" } }
```

`quiz.json` (pt-BR):
```json
{ "option": { "aria": "Opção {{letter}}: {{content}}" } }
```

`quiz.json` (ar):
```json
{ "option": { "aria": "الخيار {{letter}}: {{content}}" } }
```

And `CardTitle` gets `id="question-title"`.

**Decision on A/B/C/D letters:** keep the Latin letters as the universal default (defensible for consistency). To localize them (أ/ب/ج/د in ar, ア/イ/ウ/エ in ja), create a `letterFor(index, locale)` function in `lib/intl.ts`.

**Criterion:** keyboard navigation (←/→) between options works; the screen reader announces "Option A: …" in the active language.

---

### B.3 — `<select>` via a Radix component [unchanged]

```bash
cd frontend && npm i @radix-ui/react-select
```

Create `components/atoms/Select.tsx` in the shadcn pattern (composed of `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`).

Replace:
- The native `<select>` in `DashboardPage.tsx` (module filter)
- The `<select>` in `LanguageSelector.tsx` created in A0.7

**RTL note:** test with `?lng=ar` — Radix Select already supports RTL natively, but validate that `SelectContent` opens aligned correctly.

**Criterion:** selects render identically in Chrome/Safari/Firefox; RTL layout works.

---

### B.4 — Skip-link **+ i18n + logical props** [REVISED]

**Problem with the original plan:** the text "Pular para o conteúdo" hardcoded in PT-BR; `focus:left-4` breaks in RTL.

In `App.tsx` (before the `<header>`):

```tsx
const { t } = useTranslation();
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4
             focus:z-50 focus:bg-primary focus:text-primary-foreground
             focus:px-4 focus:py-2 focus:rounded-md focus-ring-v2"
>
  {t('common:skipToContent')}
</a>
```

And on the `<main>` of each page: `id="main-content" tabIndex={-1}`.

`common.json` (en): `"skipToContent": "Skip to content"`
`common.json` (pt-BR): `"skipToContent": "Pular para o conteúdo"`

**Criterion:** Tab at the start of the page reveals the link; in RTL, the link appears in the top **right** corner (start = right in RTL).

---

### B.5 — `text-info` contrast [unchanged]

`text-info` (cyan) on white has ~3.6:1 (below AA). Switch to `text-info-fg` in `DashboardPage.tsx`:

```tsx
<p className="font-display text-5xl font-bold text-info-fg ...">
```

Apply the same logic to `text-success` on stat tiles (consistency).

**Criterion:** Lighthouse contrast ≥ AA on all stats.

---

## Phase C — Empty states & loading with personality (~1.5h)

### C.1 — Timeline + sparkline empty state **+ i18n** [REVISED]

**Files:** `Sparkline.tsx`, `OnChainTimeline.tsx`

```tsx
const { t } = useTranslation('dashboard');

// Sparkline empty
{points.length === 0 && (
  <div className="relative rounded-lg border border-dashed border-primary/30 bg-card p-12 text-center hash-grid overflow-hidden">
    <div className="text-5xl mb-4">📊</div>
    <p className="font-display text-lg font-semibold tracking-tight">
      {t('empty.sparkline.title')}
    </p>
    <p className="text-sm text-muted-foreground mt-1">
      {t('empty.sparkline.hint')}{' '}
      <span className="font-mono inline-block rtl:rotate-180">←</span>
    </p>
  </div>
)}

// OnChainTimeline empty: idem com emoji ⛓️ e keys empty.timeline.{title,hint}
```

`dashboard.json` (en):
```json
{
  "empty": {
    "sparkline": {
      "title": "No quiz completed yet",
      "hint": "Generate your first module with AI"
    },
    "timeline": {
      "title": "No on-chain certificate yet",
      "hint": "Pass a quiz to mint your first certificate"
    }
  }
}
```

**Criterion:** empty states appear with the hash-grid and translated copy; the arrow mirrors in RTL.

---

### C.2 — Structural skeleton while generating a module **+ i18n** [REVISED]

**File:** `DashboardPage.tsx`

```tsx
const { t } = useTranslation('dashboard');

{isGenerating && (
  <Card className="lg:col-span-12 hash-grid">
    <CardContent className="pt-6 space-y-4">
      <p className="eyebrow flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
        {t('generating.eyebrow')}
      </p>
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="space-y-2 pt-4">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </CardContent>
  </Card>
)}
```

`dashboard.json`:
```json
{ "generating": { "eyebrow": "Building your module" } }
```

**Criterion:** while `isGenerating`, a preview shell appears with a translated label.

---

### C.3 — Indeterminate bar on the "Gerar com IA" button [unchanged]

`globals.css`:
```css
@keyframes indeterminate {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.bar-indeterminate {
  position: absolute; inset: 0; overflow: hidden; border-radius: inherit;
}
.bar-indeterminate::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, hsl(var(--accent) / 0.4), transparent);
  animation: indeterminate 1.4s linear infinite;
}
```

**RTL note:** the `translateX(-100%) → translateX(100%)` animation stays visually fine in RTL (the shimmer's direction has no directional meaning, it's just "loading").

**Criterion:** during generation, the button shows an animated bar instead of a spinner.

---

## Phase D — Product (~3-4h)

### D.1 — 3-step onboarding **+ i18n** [REVISED]

`components/molecules/OnboardingTour.tsx`. Trigger: `localStorage.getItem('ai_dlh_onboarded') !== 'true'`.

Steps with i18n keys:
- `onboarding.step1.{title,body}` — spotlight on the "Gerar módulo" card
- `onboarding.step2.{title,body}` — spotlight on the sparkline
- `onboarding.step3.{title,body}` — spotlight on the On-chain card

`dashboard.json` (en):
```json
{
  "onboarding": {
    "step1": {
      "title": "Start here",
      "body": "Tell us what you want to learn."
    },
    "step2": {
      "title": "Track your progress",
      "body": "Your scores will appear here after the first quiz."
    },
    "step3": {
      "title": "Permanent certificates",
      "body": "Passed quizzes are recorded on the blockchain."
    },
    "skip": "Skip",
    "next": "Next",
    "start": "Get started"
  }
}
```

Buttons use `t('dashboard:onboarding.{skip,next,start}')`. Persist the flag when done (`localStorage.setItem('ai_dlh_onboarded', 'true')`).

**RTL note:** the spotlight's clip-path needs testing with `dir="rtl"` — Framer Motion respects the layout direction.

**Criterion:** the tour appears on first access, persists the flag, translated copy.

---

### D.2 — Share certificate **+ i18n + locale URLs** [REVISED]

After `quizResult.passed && quizResult.transactionHash`:

```tsx
const { t, i18n } = useTranslation('cert');

const shareText = t('share.text', { topic, score });
const shareUrl = `${window.location.origin}/cert/${txHash}?lang=${i18n.language}`;

const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

<div className="flex flex-wrap gap-3 mt-4 justify-center">
  <Button variant="outline" size="sm" asChild>
    <a target="_blank" rel="noopener" href={linkedInUrl}>
      {t('share.linkedin')}
      <ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
    </a>
  </Button>
  <Button variant="outline" size="sm" asChild>
    <a target="_blank" rel="noopener" href={twitterUrl}>{t('share.twitter')}</a>
  </Button>
  <Button variant="ghost" size="sm" onClick={copyCertificateLink}>
    {t('share.copyLink')}
  </Button>
</div>
```

`cert.json` (en):
```json
{
  "share": {
    "text": "I just earned an on-chain certificate in {{topic}} with score {{score}}!",
    "linkedin": "Share on LinkedIn",
    "twitter": "Share on X",
    "copyLink": "Copy link"
  }
}
```

The `?lang=` URL is read by the public `/cert/:hash` route (D.5) to render in the correct language when it's shared.

**Criterion:** share text translated per the user's locale; URL contains `?lang=`.

---

### D.3 — Study streak **+ real timezone + i18n** [REVISED]

**Problem with the original plan:** grouping `progress` by day in UTC breaks the streak for users far from UTC (e.g. Japan can "lose" the day after 09:00 JST).

In `lib/achievements.ts`:

```ts
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: userTz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d); // 'YYYY-MM-DD' in the user timezone
}

export function calculateStreak(progress: Progress[]): number {
  const days = new Set(progress.map((p) => dayKey(p.completedAt)));
  let streak = 0;
  let cursor = new Date();
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
```

Achievements: `streak_3`, `streak_7`, `streak_30` (names/descriptions via i18n in `achievements.json`).

Dashboard header:
```tsx
const { t } = useTranslation('dashboard');
{streakDays > 0 && (
  <div
    className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning-bg border border-warning-border"
    aria-label={t('streak.aria', { count: streakDays })}
  >
    <span className="text-warning-fg font-mono text-xs font-semibold">🔥 {streakDays}</span>
  </div>
)}
```

`dashboard.json`:
```json
{
  "streak": {
    "aria_one": "{{count}} day streak",
    "aria_other": "{{count}} day streak"
  }
}
```

**Criterion:** the streak counts contiguous days in the user's timezone; tooltip translated with correct plural.

---

### D.4 — "Estudo focado" (focus study) mode **+ i18n** [REVISED]

`focusMode` toggle (local state + `localStorage`) in `ModulePage.tsx`:

- Hides the header and the "already completed" card
- Markdown content in `max-w-2xl mx-auto` on `bg-background`
- Background hash-grid at 4% opacity
- Floating button: `t('module:focus.exit')`
- Optional embedded Pomodoro: a 25min mono timer in the corner, `text-2xl tabular-nums text-primary`. "min" label via `t('common:time.minute')`.

`module.json`:
```json
{
  "focus": {
    "enter": "Focus mode",
    "exit": "Exit focus mode",
    "pomodoro": "{{minutes}} min"
  }
}
```

**Criterion:** focus mode hides the chrome, persists the preference, translated copy.

---

### D.5 — Public `/cert/:hash` page **+ i18n + dynamic OG** [REVISED]

Public route, no auth wall. Reads `?lang=` from the query string to set the locale (overrides the detector).

Layout:
- Hero gradient + hash-grid
- AI-DLH logo at the top (start, not left — use `start-4`)
- Center: topic name (Space Grotesk 64px), score in mono, "⛓ ON-CHAIN" badge with an animated stamp
- Bottom: 2 buttons — `t('cert:verifyEtherscan')` and `t('cert:createYour')` with `ChevronRight rtl:rotate-180`

Backend (tRPC) new public endpoint:
```ts
cert.getByHash: publicProcedure
  .input(z.object({ hash: z.string() }))
  .query(async ({ input }) => {
    // retorna { topic, score, walletAddress, completedAt, locale }
  })
```

**Dynamic OG image:**
- `GET /api/og/cert/:hash?lang=<locale>` endpoint on the server
- Renders a PNG with `@vercel/og` or `satori` (server-side)
- Loads the right font for CJK/Arabic if `locale` requires it
- `<meta property="og:image">` points to this endpoint

`cert.json`:
```json
{
  "verifyEtherscan": "Verify on Etherscan",
  "createYour": "Create yours",
  "badge": "ON-CHAIN",
  "completedAt": "Completed on {{date}}"
}
```

**Criterion:**
- `/cert/<hash>?lang=ja` renders everything in Japanese
- OG preview on LinkedIn shows the image with the correct font
- No authentication required

---

## Phase E — Backend i18n + Provider Abstraction (~3-4h)

> Backend phase. Can be done in parallel with B/C/D, but must be ready before any release because the current `ai.service.ts` has PT-BR hardcoded in the prompt (`server/services/ai.service.ts:107`).

### E.1 — Schema migration: `locale` + `provider` on `modules` (~30min)

`server/db/schema.ts` — add columns:

```ts
export const modules = pgTable('modules', {
  // ... colunas existentes
  locale: varchar('locale', { length: 10 }).notNull().default('pt-BR'),
  provider: varchar('provider', { length: 20 }).notNull().default('gemini'),
});
```

Add to `users` (for D.3 and the premium tier):
```ts
preferredLocale: varchar('preferred_locale', { length: 10 }),
preferredTier: varchar('preferred_tier', { length: 20 }).notNull().default('default'), // 'default' | 'premium'
preferredTimezone: varchar('preferred_timezone', { length: 64 }),
```

Run `npm run db:generate && npm run db:push`.

**Criterion:** migrations generated with no warnings; the database accepts the new columns.

---

### E.2 — `AIProvider` interface (~20min)

Create `server/services/providers/types.ts`:

```ts
import { ModuleContent } from '../ai.service.js';

export interface GenerateModuleInput {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  locale: string; // 'en', 'pt-BR', 'es', 'fr', 'ja', 'ar'
}

export interface AIProvider {
  readonly name: 'gemini' | 'claude' | 'qwen';
  generateModule(input: GenerateModuleInput): Promise<ModuleContent>;
  testConnection(): Promise<boolean>;
}

export type Tier = 'default' | 'premium';
export type Region = 'global' | 'cn' | 'eu-strict';

export interface RouterContext {
  tier: Tier;
  region: Region;
  locale: string;
}
```

---

### E.3 — `GeminiProvider` (default) (~30min)

`server/services/providers/gemini.provider.ts` — refactor the current `ai.service.ts` logic to implement `AIProvider`:

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, GenerateModuleInput } from './types.js';
import { buildPrompt } from '../prompt-builder.js';
import { ModuleContentSchema, ModuleContent } from '../ai.service.js';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
  }

  async generateModule(input: GenerateModuleInput): Promise<ModuleContent> {
    const prompt = buildPrompt(input);
    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return ModuleContentSchema.parse(parsed);
  }

  async testConnection() {
    const r = await this.model.generateContent('Hello');
    return !!r.response.text();
  }
}
```

---

### E.4 — `ClaudeProvider` (premium) (~30min)

```bash
cd server && npm i @anthropic-ai/sdk
```

`server/services/providers/claude.provider.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, GenerateModuleInput } from './types.js';
import { buildPrompt } from '../prompt-builder.js';
import { ModuleContentSchema, ModuleContent } from '../ai.service.js';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateModule(input: GenerateModuleInput): Promise<ModuleContent> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: buildPrompt(input) + '\n\nRespond ONLY with valid JSON, no markdown.',
        },
      ],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return ModuleContentSchema.parse(parsed);
  }

  async testConnection() {
    const r = await this.client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return r.content.length > 0;
  }
}
```

Add `ANTHROPIC_API_KEY` to `.env.example` and `utils/env.ts` (optional, gracefully degrade to Gemini if absent).

---

### E.5 — `QwenProvider` (region=cn) (~45min)

```bash
cd server && npm i axios
```

`server/services/providers/qwen.provider.ts` (DashScope REST API):

```ts
import axios from 'axios';
import { AIProvider, GenerateModuleInput } from './types.js';
import { buildPrompt } from '../prompt-builder.js';
import { ModuleContentSchema, ModuleContent } from '../ai.service.js';

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export class QwenProvider implements AIProvider {
  readonly name = 'qwen' as const;

  constructor(private apiKey: string) {}

  async generateModule(input: GenerateModuleInput): Promise<ModuleContent> {
    const res = await axios.post(
      DASHSCOPE_URL,
      {
        model: 'qwen-plus',
        input: { prompt: buildPrompt(input) },
        parameters: {
          temperature: 0.7,
          max_tokens: 8192,
          result_format: 'message',
        },
      },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    const text = res.data?.output?.choices?.[0]?.message?.content ?? '';
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return ModuleContentSchema.parse(parsed);
  }

  async testConnection() {
    try {
      await this.generateModule({ topic: 'test', level: 'beginner', locale: 'en' });
      return true;
    } catch { return false; }
  }
}
```

Add `DASHSCOPE_API_KEY` to `.env.example`.

---

### E.6 — `ProviderRouter` (~30min)

`server/services/providers/router.ts`:

```ts
import { AIProvider, GenerateModuleInput, RouterContext } from './types.js';
import { GeminiProvider } from './gemini.provider.js';
import { ClaudeProvider } from './claude.provider.js';
import { QwenProvider } from './qwen.provider.js';
import { config } from '../../utils/env.js';
import { logger } from '../../utils/logger.js';

export class ProviderRouter {
  private gemini = new GeminiProvider(config.GEMINI_API_KEY);
  private claude = config.ANTHROPIC_API_KEY ? new ClaudeProvider(config.ANTHROPIC_API_KEY) : null;
  private qwen = config.DASHSCOPE_API_KEY ? new QwenProvider(config.DASHSCOPE_API_KEY) : null;

  pickPrimary(ctx: RouterContext): AIProvider {
    if (ctx.region === 'cn' && this.qwen) return this.qwen;
    if (ctx.tier === 'premium' && this.claude) return this.claude;
    return this.gemini;
  }

  pickFallback(ctx: RouterContext, primary: AIProvider): AIProvider | null {
    if (primary.name === 'gemini') return this.claude ?? null;
    if (primary.name === 'claude') return this.gemini;
    if (primary.name === 'qwen') return this.gemini; // se mainland CN tiver acesso
    return null;
  }

  async generate(input: GenerateModuleInput, ctx: RouterContext) {
    const primary = this.pickPrimary(ctx);
    try {
      const result = await primary.generateModule(input);
      return { result, providerUsed: primary.name };
    } catch (err) {
      logger.warn(`Primary provider ${primary.name} failed, trying fallback`, err);
      const fallback = this.pickFallback(ctx, primary);
      if (!fallback) throw err;
      const result = await fallback.generateModule(input);
      return { result, providerUsed: fallback.name };
    }
  }
}

export const providerRouter = new ProviderRouter();
```

---

### E.7 — Prompt parameterized by locale (~30min)

`server/services/prompt-builder.ts` — extract the logic from the current `buildPrompt`:

```ts
import { GenerateModuleInput } from './providers/types.js';

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'pt-BR': 'Brazilian Portuguese',
  'es': 'Spanish',
  'fr': 'French',
  'ja': 'Japanese',
  'ar': 'Arabic',
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  beginner: 'beginner (basic concepts, simple explanations)',
  intermediate: 'intermediate (deeper dive, some advanced concepts)',
  advanced: 'advanced (complex concepts, professional techniques)',
};

export function buildPrompt(input: GenerateModuleInput): string {
  const lang = LANGUAGE_NAMES[input.locale] ?? 'English';
  const level = LEVEL_DESCRIPTIONS[input.level];

  return `
You are an expert in education and educational content creation. Create a complete educational module about "${input.topic}" at ${level} level.

CRITICAL RULES:
1. The output MUST be in ${lang}.
2. Return ONLY a valid JSON object. NO markdown code blocks. NO text before or after.
3. JSON must start with { and end with }.
4. No trailing commas. Strings in double quotes. Escape inner quotes with \\".
5. No unescaped line breaks inside strings — use \\n.

JSON structure:

{
  "title": "Engaging module title (max 100 characters)",
  "content": "Full educational content in Markdown (500-1500 words)",
  "estimatedTime": 15,
  "quiz": [
    {
      "question": "Objective question about the content",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is the correct answer"
    }
  ]
}

Content requirements:
- Markdown formatted (##, ###, lists, inline code, code blocks)
- 500-1500 words (use word count appropriate to ${lang} — for CJK languages, scale accordingly)
- Structure: introduction → development with practical examples → conclusion
- Language: ${lang}, clear and objective
- Include at least 2 practical examples with code (if applicable)

Quiz requirements:
- 4-5 questions, each with exactly 4 options
- Plausible distractors, no obvious wrong answers
- correctAnswer: index 0-3
- explanation: clear reasoning

Estimated time: 10-30 minutes (reading + quiz).

Begin your response with { and end with }.
`.trim();
}
```

**Criterion:** the prompt now accepts locale; instructions in English (more robust across LLMs); only the output is localized.

---

### E.8 — `ai.service.ts` refactor (~20min)

Reduce `ai.service.ts` to a thin wrapper around `ProviderRouter`:

```ts
import { providerRouter } from './providers/router.js';
import { ModuleContent } from './ai.service.js'; // schemas ficam aqui
import { RouterContext } from './providers/types.js';

export class AIService {
  async generateModule(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    locale: string,
    ctx: RouterContext,
  ) {
    const { result, providerUsed } = await providerRouter.generate(
      { topic, level, locale },
      ctx,
    );
    return { content: result, provider: providerUsed };
  }
}
```

Keep the Zod schemas (`ModuleContentSchema`, `QuizQuestionSchema`) exported from that file.

---

### E.9 — tRPC router: accept `locale` + read `tier`/`region` from context (~30min)

`server/routers/ai.router.ts`:

```ts
generateModule: protectedProcedure
  .input(z.object({
    topic: z.string().min(3).max(200),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    locale: z.enum(['en', 'pt-BR', 'es', 'fr', 'ja', 'ar']),
  }))
  .mutation(async ({ input, ctx }) => {
    const tier = ctx.user.preferredTier ?? 'default';
    const region = detectRegion(ctx); // por header ou IP geo (opcional v1)

    const { content, provider } = await aiService.generateModule(
      input.topic, input.level, input.locale,
      { tier, region, locale: input.locale },
    );

    const [saved] = await db.insert(modules).values({
      userId: ctx.user.id,
      title: content.title,
      content: content.content,
      topic: input.topic,
      level: input.level,
      locale: input.locale,
      provider,
      quizData: content.quiz,
      estimatedTime: content.estimatedTime,
    }).returning();

    return saved;
  }),
```

Frontend passes `locale: i18n.language` in the input.

`detectRegion(ctx)` v1: read the `x-region` header if set, else `'global'`. Geo-IP is left for v1.1.

**Criterion:**
- Frontend sends the locale + receives the module in the right language
- DB stores which provider generated each module
- Premium tier works if the user set it in their profile

---

### E.10 — Tier toggle in the user profile (~30min)

Backend: new tRPC endpoint:
```ts
user.updatePreferences: protectedProcedure
  .input(z.object({
    preferredTier: z.enum(['default', 'premium']).optional(),
    preferredLocale: z.string().optional(),
    preferredTimezone: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    await db.update(users).set(input).where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),
```

Frontend: new `components/molecules/PreferencesPanel.tsx` component with a toggle:
- "Use premium model (Claude Sonnet 4.6)" — checkbox
- Tooltip explaining cost/quality
- Locale selector (mirrors `LanguageSelector`)

Plug in as a modal accessible via a gear icon in the header.

**Criterion:** turning on premium in the toggle makes the next generation use Claude.

---

### E.11 — Token-based validation (not chars) (~20min)

**Problem:** `content: z.string().min(500).max(15000)` in chars is unfair across languages — Chinese/Japanese use ~1/3 of the chars for the same density.

Replace with **word**-based validation (which scales better across languages, though still imperfect) **or** just relax the rule:

```ts
content: z.string().min(200).max(20000),
```

And move the real "quality" validation to the prompt (it already instructs 500-1500 words). Accept the variation in the schema.

**Criterion:** modules in Japanese don't fail validation for being "too short" in chars.

---

## QA checklist per phase

**After Phase A0 (i18n foundation):**
- [ ] `?lng=en` loads strings in English without a refresh
- [ ] `?lng=ar` applies `dir="rtl"` on `<html>` and mirrors the layout
- [ ] `?lng=ja` renders kanji without boxes (□)
- [ ] Dates via `useFormatDate` change format between locales
- [ ] Zod validation returns messages in the active language
- [ ] LanguageSelector persists the choice in `localStorage`
- [ ] No PT-BR string appears in `?lng=en` on the migrated pages

**After Phase A:**
- [ ] Primary button lifts and glows on hover (no layout shift)
- [ ] Inputs have a double purple ring on focus
- [ ] Quiz bar is a brand gradient
- [ ] Arrows in mono on CTAs, with `rtl:rotate-180` working in ar
- [ ] Footer shows the current year and translated copy

**After Phase B:**
- [ ] `prefers-reduced-motion` disables shimmer/caret/stamp
- [ ] Quiz options navigable via keyboard (radiogroup)
- [ ] Selects render identically in Chrome/Safari/Firefox
- [ ] Skip link works with Tab; appears on the right in RTL
- [ ] Lighthouse contrast ≥ AA on all stats

**After Phase C:**
- [ ] Empty states with hash-grid and translated copy
- [ ] Skeleton appears while generating a module, with a translated label
- [ ] Indeterminate bar replaces the spinner

**After Phase D:**
- [ ] Tour appears on first access, persists the flag
- [ ] Share URLs contain the correct `?lang=`
- [ ] Streak counts contiguous days in the user's timezone (test with a VPN/fake timezone)
- [ ] Focus mode hides the chrome and persists
- [ ] `/cert/<hash>?lang=ja` renders in Japanese with the correct OG image

**After Phase E:**
- [ ] Backend receives `locale` in the `generateModule` input
- [ ] DB stores `locale` and `provider` on each module
- [ ] Premium toggle in the profile → next generation uses Claude
- [ ] `x-region: cn` header → routes to Qwen (if the key is configured)
- [ ] Fallback works (kill Gemini → falls back to Claude)
- [ ] Modules in ja/ar don't fail size validation

---

## Implementation conventions

- **Don't touch tokens:** `globals.css` and `tailwind.config.js` are already correct for v2.
- **New libraries allowed** — listed in "Global conventions" at the top of this document.
- **Atomic commits per sub-item** (e.g. `feat(i18n): setup react-i18next [A0.1]`).
- **One final PR per phase** with before/after screenshots.
- **Branch:** `feat/design-system-v2-1-i18n`. Incremental PRs to `main`.
- **Don't amend published commits.** New fixes = new commits.
- **New environment variables** (consolidated):
  - `ANTHROPIC_API_KEY` — optional, enables the premium tier
  - `DASHSCOPE_API_KEY` — optional, enables region=cn
- **MVP target languages** — `en, pt-BR, es, fr, ja, ar`. Adding more is just creating a folder under `public/locales/<lng>/`.

---

## Suggested execution order

1. **A0** first and complete (without it, B/C/D are born hardcoded)
2. **E** in parallel with A0 (the backend is independent of the design system)
3. **A** after A0
4. **B**, **C**, **D** can run in parallel with each other after A0+E
5. Final integrated QA: run the app in all 6 locales before merging to `main`

**Realistic total time:** 12-15h of focused implementation, plus ~2h of QA/adjustments.






