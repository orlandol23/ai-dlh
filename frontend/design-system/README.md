# AI-DLH Design System: v2 "Circuit & Ink"

**AI-DLH**, *AI-Powered Decentralized Learning Hub*, is a portfolio web application that combines generative AI (Google Gemini), Ethereum blockchain certification and Web3 authentication (MetaMask) in a single personalized learning product. The user connects their wallet, picks a topic and a level, and the platform generates a module plus a quiz on the spot; a score ≥ 70% writes a permanent certificate to Ethereum Sepolia.

This folder is the design system distilled from the product: tokens, fundamentals, a UI kit and reusable rules that agents can follow to produce more AI-DLH material.

> **Current version: v2 "Circuit & Ink"** (April 2026).
> It replaces the generic v1, "blue shadcn". Any inconsistency between this README and the app's old code is resolved in favor of v2.

## Sources

Everything here was derived from a single repository. No Figma, no decks.

- **Codebase (GitHub):** `orlandol23/ai-dlh`, the frontend on `main` at the time of this survey
- Mirror of the frontend for reference: `_source/` in this project
- Key files read: `frontend/src/styles/globals.css`, `frontend/tailwind.config.js`, `frontend/src/pages/{HomePage,DashboardPage,ModulePage}.tsx`, `frontend/src/components/atoms/*`, `frontend/src/lib/utils.ts`

There is a single product surface: the **AI-DLH web app** (React 18 + Vite + Tailwind + shadcn-style tokens + tRPC + Zustand). Landing and auth, the dashboard and the module/quiz page all sit under one router, so there is one UI kit, in `ui_kits/web/`.

## Index

| Path | What it holds |
|---|---|
| `README.md` | This file. Product context, content and visual fundamentals, iconography. |
| `SKILL.md` | Skill manifest; it makes the folder usable as a Claude skill. |
| `colors_and_type.css` | The complete v2 tokens: colors, type, radii, shadows, spacing, motion. Import it first. |
| `fonts/` | Font references (Space Grotesk + Inter + JetBrains Mono through Google Fonts). |
| `assets/` | Hex logo mark + wordmark (SVG with a purple→cyan gradient). |
| `preview/` | Small HTML cards that feed the Design System tab. |
| `ui_kits/web/v2.html` | **The canonical v2 UI kit**: single-page React with every component, the states, the dashboard redesign and dark mode. |
| `ui_kits/web/index.html` | The v1 UI kit (blue/shadcn), kept as a historical reference. **Do not use it for new work.** |
| `_source/` | Read-only mirror of the imported codebase, for agents that want to check. |

## Content fundamentals

**Language.** The product is **Portuguese (pt-BR)**: page copy, buttons, messages. The HTML metadata and the project README are in English. When writing new copy, **write pt-BR for user-facing surfaces** and English for developer docs.

**Voice.** Informal and direct, second person. "Conecte sua Carteira", not "O usuário deve conectar". No softening "por favor". Short sentences.

**Capitalization.**
- Buttons: **Title Case** in Portuguese: "Conectar Carteira", "Começar Agora", "Gerar Novo Módulo", "Finalizar Quiz".
- Headings: sentence case or Title Case depending on length: "Como Funciona", "Dashboard", "Meus Módulos".
- Body: sentence case.

**Tone: enthusiastic but utilitarian.** Celebratory copy exists ("🎉 Parabéns! Você foi aprovado!", "Módulo gerado com sucesso!") but it stays confined to result states. The default tone is functional and concise.

**Emoji.** Used sparingly, as *status markers and section glyphs*, never as decoration. Observed usage:
- Feature tiles: 🤖 (AI), ⛓️ (blockchain), 📊 (progress)
- States: ✅ passed, ❌ failed, 🎉 celebration, ⏳ loading, ⚠️ warning
- Inside the CTA: "🤖 Gerar com IA"
- Unicode arrows: ← Voltar, Próxima →

Do not add emoji to neutral labels or to nav.

**Canonical microcopy pairs:**
- Empty state: *"Nenhum módulo ainda / Gere seu primeiro módulo com IA! ←"*
- Success: *"🎉 Parabéns! Você foi aprovado! / Você atingiu a pontuação mínima de 70%"*
- Failure: *"Não foi desta vez / Você precisa de 70% para ser aprovado. Tente novamente!"*
- On-chain: *"⛓️ Registrado na Blockchain! / Seu certificado foi registrado permanentemente na Ethereum"*
- Loading: *"⏳ A IA está criando seu módulo personalizado…"*

## v2 visual fundamentals: "Circuit & Ink"

**The aesthetic in one line.** Electric purple + cyan + Space Grotesk type + a dotted grid. It communicates "AI + blockchain" with a personality of its own, without looking like stock shadcn.

**Colors.**
- **Primary: electric purple `#7c3aed`** (var `--primary`, scale 50–900). Used on CTAs, links, focus rings, the logo and on-chain elements. It replaces v1's blue `#2463eb`.
- **Accent: cyan `#22d3ee`** (var `--accent`). Used on micro-highlights, charts, expressive numeric data and the "info" tag.
- **Semantic stack:**
  - success `#16a34a` · warning `#d97706` (amber, not yellow) · error `#dc2626`
  - **info is cyan** (`#06b6d4`), not blue, so it never collides with primary
  - **on-chain is primary itself** (purple); it is *the* product signal
  Each state has its own `bg` + `border` + `fg` in `colors_and_type.css`.
- **Warm neutrals** (not shadcn's slate). Scale `#fbfaf9` → `#0b0a09` with a slight warm cast, which pulls it away from "corporate SaaS".
- **Hero gradient:** `linear-gradient(135deg, #f5f3ff 0%, #ede9fe 40%, #cffafe 100%)`. The product's only decorative gradient. In dark: `#130f32 → #2e1065 → #164e63`.
- **Accent gradient (purple→cyan, 135°):** `linear-gradient(135deg, #7c3aed, #22d3ee)`. Use it **only** on: the logo, key text ("IA", "Blockchain") and the sparkline stroke. Do not paint backgrounds with it.

**Typography: three families, each with a clear role.**
- **Display: Space Grotesk** (500/600/700). Heros, h1/h2, big stat numbers. Tracking `-0.02em` to `-0.04em`. Scales up to 96px.
- **UI: Inter** (400/500/600/700). Body, labels, card titles, navigation.
- **Mono: JetBrains Mono** (400/500/600/700), and **expressive**, not only code. Use it on: wallet addresses, tx hashes, uppercase "ON-CHAIN" labels, optional numeric stats and section eyebrows.
- Hero display: clamp(48px, 9vw, 96px) bold, leading 1.02, tracking −0.04em.
- H1: 48px · H2: 36px · Card title: 24px · Body: 16px/1.5 · Small: 14px muted · Caption/eyebrow: 12px mono, tracking 0.18em, uppercase.

**Spacing.** Tailwind-compatible. Container `max-w-[1280px] mx-auto px-6`. Vertical rhythm `py-16` to `py-24` between sections. Cards `p-6` inside. Grid gap: 20–24px.

**Radii.** Base `--radius: 10px` (up from 8). Buttons, cards and inputs share it through `rounded-md` / `rounded-lg`. Badges and step markers use `rounded-full`. The logo is hexagonal (an SVG path).

**Borders and cards.** The canonical pattern: `border bg-card shadow-sm rounded-[10px]` with `p-6`. Hairline `hsl(var(--border))`. The shadow carries a **purple tint** (not pure black), which gives depth without weight.

**Shadows.**
- `shadow-sm` on cards at rest
- `shadow-md` on hover
- `shadow-glow` (a 4px purple ring + 24px blur) on the **primary button on hover** and on focused cards. It is the detail that sets this apart. `shadow-glow-accent` (cyan) for on-chain elements.

**Backgrounds.**
- Landing: the diagonal hero gradient with `hash-grid` over it at 8% opacity.
- App shells: `bg-background` (neutral 25) with a `bg-background/80 backdrop-blur` header.
- **Hash grid (the graphic motif):** a 24×24px dotted purple grid at 8% opacity. The only decorative pattern. Apply it through the `.hash-grid` class. Use it on heros, on-chain cards and empty states.
- **Circuit trace:** a 2px dashed diagonal purple line, an expressive divider on certificates. Class `.circuit-trace`.

**Hover / press.**
- Primary button: `transform: translateY(-1px)` + `box-shadow: var(--shadow-glow)`. Duration 200ms, easing `(0.22, 1, 0.36, 1)`.
- Outline button: the border switches to purple, and so does the text.
- List rows: `hover:bg-muted`.
- Disabled: `opacity-50 pointer-events-none`.
- Focus: a double ring, `0 0 0 2px bg, 0 0 0 4px ring(primary)`.

**Animation.** Livelier than v1, still utilitarian.
- **AI streaming:** text "typing" character by character plus a blinking purple caret (`content: '▋'`, animation `blink 1s steps(1) infinite`).
- **Blockchain stamp:** the "⛓ ON-CHAIN" stamp with the `stamp-in` keyframe: scale 2→1, rotate −12°→−8°, opacity 0→1 over 600ms.
- **Skeleton shimmer:** a gradient with `animation: shimmer 1.5s linear infinite`.
- **Sparkline draw:** `stroke-dashoffset` animated over 2s.
- **Dot pulse:** a pulsing dot on "live/gerando" pills.
- **Hover glow:** primary buttons gain a purple halo.
- No bounces, no confetti, no Lottie.

**Transparency and blur.** The header uses `bg-background/80 backdrop-blur` over the hero. Tooltips use solid `bg-card` with `shadow-md`.

**Layout.**
- Container: `max-w-[1280px] mx-auto px-6`.
- Hero centered on desktop in a 1.3fr / 1fr grid (text on the left, the receipt on the right).
- Dashboard v2: a 12-column grid, stat tiles (4×col-3), sparkline (col-8) + achievements (col-4), timeline (col-8) + generate (col-4).
- Quiz: `max-w-4xl mx-auto`.

**Imagery.** The codebase ships no images. Use **hash-grid + solid ink + emoji** in place of hero photos. The logo is a hexagonal SVG with nodes and connections; it is the system's only "illustration".

**Dark mode.** First-class. The toggle is in the header, persisted in `localStorage`. Always validate it: semantic tokens have a `.dark` variant, while hardcoded Tailwind colors (`bg-green-50`, say) do not work in dark, so use `bg-green-500/10` or the CSS vars.

## Iconography

**No icon library ships.** The current system:
1. **Emoji as icons** on feature tiles and state messages: 🤖 ⛓️ 📊 ✅ ❌ 🎉 ⏳ ⚠️ 🔥 🎯 🏆
2. **Unicode arrows** inline: `←` `→`
3. **Inline SVG** for the loading spinner, the hex logo, the sparkline and the identicon (conic-gradient)
4. **The logo** is an SVG hexagon with a central node plus 4 peripheral nodes connected by lines, in a purple→cyan gradient

**Practical rule when designing new screens:**
- Prefer emoji for feature and status communication (it matches the product's voice)
- If a real set is needed (nav, form affordances), use **Lucide through a CDN**, same stroke weight, modern, and flag the substitution to the user
- Never hand-draw icon SVGs beyond the ones listed above

## Substitutions and caveats

- **Fonts:** the codebase does not pin custom fonts yet; v2 adds Space Grotesk + Inter + JetBrains Mono through Google Fonts. If the user brings brand fonts, drop the `.woff2` files in `fonts/` and update `--font-display` / `--font-sans` / `--font-mono`.
- **Icons:** no system of its own. Lucide through a CDN is the documented fallback.
- **Imagery:** none in the codebase. Every preview uses hash-grid + solid ink + emoji.
- **v1→v2 migration:** start with the tokens in `colors_and_type.css` (it transforms 80% in an hour) and finish with copy polish.

## How to use this system

1. Link `colors_and_type.css` first.
2. Read the voice and casing rules above before writing copy.
3. For component work, open `ui_kits/web/v2.html` and copy the JSX. It is the source of truth for hover, border, padding and special states.
4. Respect this: one decorative gradient (the hero), one accent gradient (purple→cyan, on accents only), one graphic motif (hash-grid), no hand-drawn SVG, no emoji on neutral labels.
5. For a dev handoff into the codebase, start with the tokens in `colors_and_type.css` and follow with the components from `ui_kits/web/v2.html`.
