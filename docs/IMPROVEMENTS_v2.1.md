# AI-DLH — Plano de Improvements v2.1 (i18n-first)

> **📌 Status: ✅ CONCLUÍDO** (PRs [#14](https://github.com/orlandol23/all/pull/14) e
> [#15](https://github.com/orlandol23/all/pull/15)) — mantido como registro
> histórico. Única pendência remanescente: **OG image dinâmica do certificado**
> (item D.5), absorvida pelo [PLANO_MESTRE.md](./PLANO_MESTRE.md) como **C7**.

> Sequência de melhorias após a migração v2 "Circuit & Ink".
> Cole este arquivo no Claude Code dentro do repo `orlandol23/all` numa branch nova.
> Ordem importa: **A0 → A → B → C → D → E**.
> Estimativa total: ~12–15h.

---

## Visão geral

| Fase | Status | Tempo | Conteúdo |
|---|---|---|---|
| A0 — i18n foundation | NOVA | ~3–4.5h | i18next, RTL, fontes, Intl, migração de strings |
| A — Polish | revisada | ~1h | 5 fixes do design system v2 |
| B — Acessibilidade | revisada | ~1.5–2h | reduced-motion, ARIA, Radix Select, skip-link, contraste |
| C — Empty states & loading | revisada | ~1.5h | empty states, skeletons, indeterminate bar |
| D — Produto | revisada | ~3–4h | onboarding, share, streak, focus mode, /cert/:hash |
| E — Backend i18n + Provider abstraction | NOVA | ~3–4h | AIProvider interface, prompt parametrizado, schema migration |

**Branch:** `feat/design-system-v2-1-i18n`
**Idiomas MVP:** `en, pt-BR, es, fr, ja, ar`
**LLM principal:** Gemini 2.5 Flash (pago) com infraestrutura para Sonnet 4.6 (premium) e Qwen 3 (region=cn)

---

## Convenções globais

- **Não tocar tokens:** `globals.css` e `tailwind.config.js` já estão certos. Só adicione utilities novas se precisar (`focus-ring-v2`, `bar-indeterminate`).
- **Bibliotecas novas permitidas:**
  - `react-i18next`, `i18next`, `i18next-browser-languagedetector`, `i18next-http-backend`
  - `zod-i18n-map`
  - `@radix-ui/react-select`
  - `@anthropic-ai/sdk` (Fase E — tier premium)
  - `axios` ou DashScope SDK (Fase E — region=cn)
- **Commits atômicos por subitem** (ex: `feat(i18n): setup react-i18next [A0.1]`).
- **PR por fase** com screenshots before/after.
- **CI deve passar** entre fases — não acumular dívida de tipos/lint.

---

## Idiomas-alvo MVP

| Locale | Nome | Direção | Validações específicas |
|---|---|---|---|
| `en` | English | LTR | fallback default |
| `pt-BR` | Português (Brasil) | LTR | base atual do conteúdo |
| `es` | Español | LTR | latim, plural rules |
| `fr` | Français | LTR | latim, espaços antes de `:` `?` `!` |
| `ja` | 日本語 | LTR | CJK font fallback, sem espaços entre palavras |
| `ar` | العربية | RTL | direção invertida, fontes Arabic |

Estrutura preparada para adicionar mais idiomas sem refactor.

---

## Fase A0 — i18n foundation (~3–4.5h, BLOCKER de tudo)

> Sem A0 concluída, qualquer string nova das fases B–D nasce hardcoded e gera retrabalho. **Não pular.**

### A0.1 — Setup do react-i18next (~30min)

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

Importar em `frontend/src/main.tsx` antes do `<App />`:
```ts
import './i18n';
```

**Critério:** `i18n.language` no boot retorna o locale detectado.

---

### A0.2 — Estrutura de locales (~30min)

Criar `frontend/public/locales/{en,pt-BR,es,fr,ja,ar}/` com arquivos:
- `common.json` — botões e labels universais
- `home.json`, `dashboard.json`, `module.json`, `quiz.json`, `cert.json`, `auth.json`

Exemplo `common.json` (en):
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

Para `pt-BR`, traduzir a partir das strings já hardcoded no app (será a fonte de verdade durante migração).

**Critério:** `?lng=ja` muda `t('common:buttons.next')` para `次へ`.

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

Plugar em `App.tsx` envolvendo o conteúdo.

**Tailwind:** logical properties já suportadas em 3.3+ (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`). Substituir `pl-`/`pr-`/`left-`/`right-` por equivalentes lógicos onde fizer sentido (não precisa migrar 100% — só onde a direção importa).

**Critério:** com `?lng=ar`, `<html dir="rtl">` e layout espelhado.

---

### A0.4 — Font fallbacks globais (~20min)

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

**Critério:** kanji em `?lng=ja` renderiza sem boxes; árabe renderiza ligado corretamente.

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

Substituir todo `toLocaleString`/`toLocaleDateString` espalhado por esses hooks.

**Critério:** datas mudam para o formato do locale (en: "Apr 26, 2026" / pt-BR: "26 de abr. de 2026" / ar: "٢٦ أبريل ٢٠٢٦").

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

Adicionar `zod` namespace em cada `locales/<lng>/zod.json` (zod-i18n-map já fornece traduções base para 30+ idiomas — copiar dos exemplos do pacote).

**Critério:** validação Zod no frontend retorna mensagem no idioma ativo.

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

(Trocar para Radix Select quando B.3 for concluído.)

Plugar no header de `App.tsx` próximo ao botão de wallet.

**Critério:** trocar locale recarrega strings sem refresh; persiste em `localStorage`.

---

### A0.8 — Migração das strings existentes (~1.5h)

**Páginas/componentes a migrar:**
- `HomePage.tsx`, `DashboardPage.tsx`, `ModulePage.tsx`
- `App.tsx` (header, footer)
- `components/molecules/*` (todos)
- `lib/achievements.ts` (nomes/descrições)

**Padrão:**
```tsx
// Antes
<h1>Aprenda com IA</h1>

// Depois
const { t } = useTranslation('home');
<h1>{t('hero.title')}</h1>
```

**Estratégia em ordem:**
1. Para cada página, criar key no `pt-BR` JSON (1:1 do hardcoded)
2. Substituir no `.tsx` por `t('ns:key')`
3. Validar visualmente em pt-BR (nada deve mudar)
4. Traduzir para `en` (pode usar IA, revisar)
5. Demais idiomas em terceiro passo

**Lint guard (opcional):** `eslint-plugin-react` regra `react/jsx-no-literals` em modo warn para evitar regressão.

**Critério:** com `?lng=en`, **nenhuma** string em PT-BR aparece nas páginas migradas.

---

## Fase A — Polish do design system (~1h)

> Cinco fixes que terminam de "selar" a v2. Cada um é independente. Após A0, todas as strings já vêm de `t()`.

### A.1 — Botão primário com glow hover [inalterado]

**Arquivo:** `frontend/src/components/atoms/Button.tsx`

Adicionar no variant `default`:

```tsx
default:
  'bg-primary text-primary-foreground hover:-translate-y-px ' +
  'hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.12),0_8px_24px_-4px_hsl(var(--primary)/0.30)] ' +
  'active:translate-y-0 active:shadow-none',
```

Manter as demais variants (`outline`, `ghost`, `destructive`, `secondary`, `link`) e tamanhos como já estão.

**Critério:** botão "Começar Agora" levanta 1px no hover e ganha halo roxo com blur 24px.

---

### A.2 — Anel duplo de focus em inputs [inalterado]

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

Substituir `focus-visible:ring-2 ring-ring ring-offset-2` por `focus-ring-v2`.

**Critério:** anel roxo translúcido com gap visível ao tabular pelos inputs.

---

### A.3 — Barra de progresso do quiz com gradiente brand [inalterado]

**Arquivo:** `frontend/src/pages/ModulePage.tsx`

```tsx
<div
  className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-primary to-accent"
  style={{ width: `${progressPercentage}%` }}
/>
```

**Critério:** barra preenche em gradiente roxo→ciano ao avançar nas questões.

---

### A.4 — Setas com peso mono **+ RTL-aware** [REVISADO]

**Arquivos:** `ModulePage.tsx`, `HomePage.tsx`, `DashboardPage.tsx`

**Problema do plano original:** seta `→` hardcoded em texto vira visualmente errada em árabe (RTL espera `←`). Solução: usar `lucide-react` ChevronRight/ChevronLeft que respeitam `dir` do documento, ou aplicar `rtl:rotate-180`.

**Padrão recomendado** (lucide-react já está no projeto):

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

Para preservar o **peso mono** estético em CTAs textuais (ex: "Ver no Etherscan →"), usar `<span className="font-mono rtl:rotate-180 inline-block">→</span>`.

**Critério:**
- LTR: setas apontam para direita (avançar) e esquerda (voltar)
- RTL (`?lng=ar`): setas espelham automaticamente
- Setas mantém peso mono nos CTAs

---

### A.5 — Footer com ano dinâmico **+ i18n** [REVISADO]

**Arquivo:** `HomePage.tsx`

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

**Critério:** footer mostra ano corrente e texto traduzido conforme locale.

---

## Fase B — Acessibilidade (~1.5–2h)

### B.1 — `prefers-reduced-motion` [inalterado]

`globals.css` (final do arquivo):
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

E em `ModulePage.tsx` no stamp framer-motion:

```tsx
import { useReducedMotion } from 'framer-motion';
const reduce = useReducedMotion();
<motion.div
  initial={reduce ? false : { opacity: 0, scale: 2, rotate: -12 }}
  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -8 }}
  transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
/>
```

**Critério:** ativar "Reduce motion" no SO desliga shimmer, caret e stamp.

---

### B.2 — `aria` no quiz option **+ i18n** [REVISADO]

**Arquivo:** `ModulePage.tsx`

**Problema do plano original:** `aria-label` com `"Opção ${letter}: ${option}"` hardcoded em PT-BR. Em RTL, leitor de tela espera label coerente com o `dir` do documento.

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

E o `CardTitle` recebe `id="question-title"`.

**Decisão sobre letras A/B/C/D:** manter latino como padrão universal (defensável por consistência). Se quiser localizar (أ/ب/ج/د em ar, ア/イ/ウ/エ em ja), criar função `letterFor(index, locale)` em `lib/intl.ts`.

**Critério:** navegação por teclado (←/→) entre opções funciona; leitor de tela anuncia "Option A: …" no idioma ativo.

---

### B.3 — `<select>` por componente Radix [inalterado]

```bash
cd frontend && npm i @radix-ui/react-select
```

Criar `components/atoms/Select.tsx` no padrão shadcn (composto: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`).

Substituir:
- `<select>` nativo do `DashboardPage.tsx` (filtro de módulos)
- O `<select>` do `LanguageSelector.tsx` criado em A0.7

**Atenção RTL:** testar com `?lng=ar` — Radix Select já suporta RTL nativamente, mas validar que `SelectContent` abre alinhado corretamente.

**Critério:** selects renderizam idênticos em Chrome/Safari/Firefox; layout RTL funciona.

---

### B.4 — Skip-link **+ i18n + logical props** [REVISADO]

**Problema do plano original:** texto "Pular para o conteúdo" hardcoded em PT-BR; `focus:left-4` quebra em RTL.

Em `App.tsx` (antes do `<header>`):

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

E no `<main>` de cada página: `id="main-content" tabIndex={-1}`.

`common.json` (en): `"skipToContent": "Skip to content"`
`common.json` (pt-BR): `"skipToContent": "Pular para o conteúdo"`

**Critério:** Tab no início da página revela link; em RTL, link aparece no canto superior **direito** (start = direito em RTL).

---

### B.5 — Contraste do `text-info` [inalterado]

`text-info` (ciano) sobre branco tem ~3.6:1 (abaixo do AA). Trocar para `text-info-fg` no `DashboardPage.tsx`:

```tsx
<p className="font-display text-5xl font-bold text-info-fg ...">
```

Aplicar mesma lógica para `text-success` em stat tiles (consistência).

**Critério:** Lighthouse contraste ≥ AA em todas as stats.

---

## Fase C — Empty states & loading com personalidade (~1.5h)

### C.1 — Empty state da timeline + sparkline **+ i18n** [REVISADO]

**Arquivos:** `Sparkline.tsx`, `OnChainTimeline.tsx`

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

**Critério:** empty states aparecem com hash-grid e copy traduzida; seta espelha em RTL.

---

### C.2 — Skeleton estrutural ao gerar módulo **+ i18n** [REVISADO]

**Arquivo:** `DashboardPage.tsx`

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

**Critério:** durante `isGenerating`, preview shell aparece com label traduzido.

---

### C.3 — Barra indeterminada no botão "Gerar com IA" [inalterado]

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

**Atenção RTL:** animação `translateX(-100%) → translateX(100%)` permanece visualmente ok em RTL (a direção do shimmer não tem semântica direcional, é só "loading").

**Critério:** durante geração, botão mostra faixa animada em vez de spinner.

---

## Fase D — Produto (~3–4h)

### D.1 — Onboarding de 3 passos **+ i18n** [REVISADO]

`components/molecules/OnboardingTour.tsx`. Gatilho: `localStorage.getItem('ai_dlh_onboarded') !== 'true'`.

Steps com keys i18n:
- `onboarding.step1.{title,body}` — spotlight no card "Gerar módulo"
- `onboarding.step2.{title,body}` — spotlight no sparkline
- `onboarding.step3.{title,body}` — spotlight no card On-chain

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

Botões usam `t('dashboard:onboarding.{skip,next,start}')`. Persistir flag ao terminar (`localStorage.setItem('ai_dlh_onboarded', 'true')`).

**Atenção RTL:** clip-path do spotlight precisa testar com `dir="rtl"` — Framer Motion respeita o layout direction.

**Critério:** tour aparece no primeiro acesso, persiste flag, copy traduzida.

---

### D.2 — Compartilhar certificado **+ i18n + locale URLs** [REVISADO]

Após `quizResult.passed && quizResult.transactionHash`:

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

URL `?lang=` é lida pela rota pública `/cert/:hash` (D.5) para renderizar no idioma certo do ato de compartilhar.

**Critério:** texto de share traduzido conforme locale do usuário; URL contém `?lang=`.

---

### D.3 — Streak de estudo **+ timezone real + i18n** [REVISADO]

**Problema do plano original:** agrupar `progress` por dia em UTC quebra streak de usuários longe de UTC (ex: Japão pode "perder" o dia ao passar das 09:00 JST).

Em `lib/achievements.ts`:

```ts
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: userTz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d); // 'YYYY-MM-DD' no fuso do usuário
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

Achievements: `streak_3`, `streak_7`, `streak_30` (nomes/descrições via i18n em `achievements.json`).

Header do Dashboard:
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

**Critério:** streak conta dias contíguos no fuso do usuário; tooltip traduzido com plural correto.

---

### D.4 — Modo "Estudo focado" **+ i18n** [REVISADO]

Toggle `focusMode` (local state + `localStorage`) em `ModulePage.tsx`:

- Esconde header e card de "já completou"
- Conteúdo markdown em `max-w-2xl mx-auto` em `bg-background`
- Hash-grid de fundo a 4% de opacidade
- Botão flutuante: `t('module:focus.exit')`
- Pomodoro embutido opcional: timer 25min mono no canto, `text-2xl tabular-nums text-primary`. Label "min" via `t('common:time.minute')`.

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

**Critério:** modo focado oculta cromo, persiste preferência, copy traduzida.

---

### D.5 — Página `/cert/:hash` pública **+ i18n + dynamic OG** [REVISADO]

Rota pública sem auth wall. Lê `?lang=` do query string para definir locale (override do detector).

Layout:
- Hero gradient + hash-grid
- Logo AI-DLH topo (start, não left — usar `start-4`)
- Centro: nome do tópico (Space Grotesk 64px), score em mono, badge "⛓ ON-CHAIN" com stamp animado
- Bottom: 2 botões — `t('cert:verifyEtherscan')` e `t('cert:createYour')` com `ChevronRight rtl:rotate-180`

Backend (tRPC) novo endpoint público:
```ts
cert.getByHash: publicProcedure
  .input(z.object({ hash: z.string() }))
  .query(async ({ input }) => {
    // retorna { topic, score, walletAddress, completedAt, locale }
  })
```

**OG image dinâmica:**
- Endpoint `GET /api/og/cert/:hash?lang=<locale>` no servidor
- Renderiza PNG com `@vercel/og` ou `satori` (server-side)
- Carrega fonte certa para CJK/árabe se `locale` exigir
- `<meta property="og:image">` aponta para esse endpoint

`cert.json`:
```json
{
  "verifyEtherscan": "Verify on Etherscan",
  "createYour": "Create yours",
  "badge": "ON-CHAIN",
  "completedAt": "Completed on {{date}}"
}
```

**Critério:**
- `/cert/<hash>?lang=ja` renderiza tudo em japonês
- OG preview no LinkedIn mostra imagem com fonte correta
- Sem autenticação necessária

---

## Fase E — Backend i18n + Provider Abstraction (~3–4h)

> Fase backend. Pode ser feita em paralelo com B/C/D, mas precisa estar pronta antes de qualquer release porque o atual `ai.service.ts` tem PT-BR hardcoded no prompt (`server/services/ai.service.ts:107`).

### E.1 — Schema migration: `locale` + `provider` em `modules` (~30min)

`server/db/schema.ts` — adicionar colunas:

```ts
export const modules = pgTable('modules', {
  // ... colunas existentes
  locale: varchar('locale', { length: 10 }).notNull().default('pt-BR'),
  provider: varchar('provider', { length: 20 }).notNull().default('gemini'),
});
```

Adicionar em `users` (para D.3 e tier premium):
```ts
preferredLocale: varchar('preferred_locale', { length: 10 }),
preferredTier: varchar('preferred_tier', { length: 20 }).notNull().default('default'), // 'default' | 'premium'
preferredTimezone: varchar('preferred_timezone', { length: 64 }),
```

Rodar `npm run db:generate && npm run db:push`.

**Critério:** migrations geradas sem warnings; banco aceita as colunas novas.

---

### E.2 — Interface `AIProvider` (~20min)

Criar `server/services/providers/types.ts`:

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

`server/services/providers/gemini.provider.ts` — refatorar lógica atual de `ai.service.ts` para implementar `AIProvider`:

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

Adicionar `ANTHROPIC_API_KEY` ao `.env.example` e `utils/env.ts` (opcional, gracefully degradar para Gemini se ausente).

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

Adicionar `DASHSCOPE_API_KEY` ao `.env.example`.

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

### E.7 — Prompt parametrizado por locale (~30min)

`server/services/prompt-builder.ts` — extrair lógica do `buildPrompt` atual:

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

**Critério:** prompt agora aceita locale; instruções em inglês (mais robusto entre LLMs); apenas a saída é localizada.

---

### E.8 — Refactor de `ai.service.ts` (~20min)

Reduzir `ai.service.ts` para wrapper fino do `ProviderRouter`:

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

Manter os schemas Zod (`ModuleContentSchema`, `QuizQuestionSchema`) exportados desse arquivo.

---

### E.9 — Router tRPC: aceitar `locale` + ler `tier`/`region` do contexto (~30min)

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

Frontend passa `locale: i18n.language` no input.

`detectRegion(ctx)` v1: ler header `x-region` se setado, senão `'global'`. Geo-IP fica para v1.1.

**Critério:**
- Frontend envia locale + recebe módulo no idioma certo
- DB armazena qual provider gerou cada módulo
- Tier premium funciona se usuário marcou no perfil

---

### E.10 — Tier toggle no perfil do usuário (~30min)

Backend: novo endpoint tRPC:
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

Frontend: novo componente `components/molecules/PreferencesPanel.tsx` com toggle:
- "Use premium model (Claude Sonnet 4.6)" — checkbox
- Tooltip explicando custo/qualidade
- Locale selector (espelha `LanguageSelector`)

Plugar como modal acessível via ícone de engrenagem no header.

**Critério:** ativar premium no toggle faz próxima geração usar Claude.

---

### E.11 — Validação por tokens (não chars) (~20min)

**Problema:** `content: z.string().min(500).max(15000)` em chars é injusto entre idiomas — chinês/japonês usam ~1/3 dos chars para mesma densidade.

Substituir por validação em **palavras** (que escala melhor entre idiomas, mas ainda imperfeita) **ou** apenas relaxar a regra:

```ts
content: z.string().min(200).max(20000),
```

E mover a validação real de "qualidade" para o prompt (já instrui 500–1500 palavras). Aceitar variação no schema.

**Critério:** módulos em japonês não falham validação por serem "muito curtos" em chars.

---

## Checklist de QA por fase

**Após Fase A0 (i18n foundation):**
- [ ] `?lng=en` carrega strings em inglês sem refresh
- [ ] `?lng=ar` aplica `dir="rtl"` no `<html>` e espelha layout
- [ ] `?lng=ja` renderiza kanji sem boxes (□)
- [ ] Datas via `useFormatDate` mudam de formato entre locales
- [ ] Validação Zod retorna mensagens no idioma ativo
- [ ] LanguageSelector persiste escolha em `localStorage`
- [ ] Nenhuma string PT-BR aparece em `?lng=en` nas páginas migradas

**Após Fase A:**
- [ ] Botão primário levanta e brilha no hover (sem layout shift)
- [ ] Inputs têm anel duplo roxo no focus
- [ ] Barra do quiz é gradiente brand
- [ ] Setas em mono nos CTAs, com `rtl:rotate-180` funcionando em ar
- [ ] Footer mostra ano corrente e copy traduzida

**Após Fase B:**
- [ ] `prefers-reduced-motion` desliga shimmer/caret/stamp
- [ ] Quiz options navegáveis via teclado (radiogroup)
- [ ] Selects renderizam idênticos em Chrome/Safari/Firefox
- [ ] Skip link funciona com Tab; em RTL aparece à direita
- [ ] Lighthouse contraste ≥ AA em todas stats

**Após Fase C:**
- [ ] Empty states com hash-grid e copy traduzida
- [ ] Skeleton aparece ao gerar módulo, com label traduzido
- [ ] Barra indeterminada substitui spinner

**Após Fase D:**
- [ ] Tour aparece no primeiro acesso, persiste flag
- [ ] URLs de share contêm `?lang=` correto
- [ ] Streak conta dias contíguos no fuso do usuário (testar com VPN/timezone fake)
- [ ] Modo focado oculta cromo e persiste
- [ ] `/cert/<hash>?lang=ja` renderiza em japonês com OG image correto

**Após Fase E:**
- [ ] Backend recebe `locale` no input do `generateModule`
- [ ] DB grava `locale` e `provider` em cada módulo
- [ ] Toggle premium no perfil → próxima geração usa Claude
- [ ] Header `x-region: cn` → roteamento para Qwen (se chave configurada)
- [ ] Fallback funciona (matar Gemini → cair em Claude)
- [ ] Módulos em ja/ar não falham validação por tamanho

---

## Convenções para a implementação

- **Não tocar tokens:** `globals.css` e `tailwind.config.js` já estão corretos para v2.
- **Bibliotecas novas permitidas** — listadas em "Convenções globais" no topo deste documento.
- **Commits atômicos por subitem** (ex: `feat(i18n): setup react-i18next [A0.1]`).
- **PR final por fase** com screenshots before/after.
- **Branch:** `feat/design-system-v2-1-i18n`. PRs incrementais para `main`.
- **Não amend commits publicados.** Novos fixes = novos commits.
- **Variáveis de ambiente novas** (consolidadas):
  - `ANTHROPIC_API_KEY` — opcional, habilita tier premium
  - `DASHSCOPE_API_KEY` — opcional, habilita region=cn
- **Idiomas-alvo MVP** — `en, pt-BR, es, fr, ja, ar`. Adicionar mais é só criar pasta em `public/locales/<lng>/`.

---

## Ordem de execução sugerida

1. **A0** primeiro e completo (sem ela, B/C/D nascem hardcoded)
2. **E** em paralelo com A0 (backend é independente do design system)
3. **A** após A0
4. **B**, **C**, **D** podem ser paralelos entre si após A0+E
5. QA final integrado: rodar app em todos os 6 locales antes do merge para `main`

**Tempo total realista:** 12–15h de implementação focada, mais ~2h de QA/ajustes.






