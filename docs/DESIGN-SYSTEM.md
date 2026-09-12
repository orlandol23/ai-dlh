# AI-DLH Design System — v3 "Bench & Ledger"

**Status:** approved. The open decisions below were put to review and are ratified — see "Approved decisions" and §15. The P0 foundation (design tokens + shared atoms, per §5–§8) is implemented on top of this document; page-level compositions (C1–C3), the app shell and copy rewrites remain pending in later phases. Routes, APIs, state, auth, contract behaviour and deployment remain out of scope.

**Product:** AI-DLH, *AI-Powered Decentralized Learning Hub* — a wallet-authenticated study workbench. The learner states a topic and level, generative AI produces a study module and quiz (server-graded, no answer key in the client), and a passing score (≥ 70%) is written to Ethereum Sepolia by an asynchronous, crash-safe on-chain queue. Every pass produces evidence: a progress record in Postgres, a transaction on Sepolia, a public certificate page at `/cert/:hash`.

**Method of this document.** Written after inspecting the repository — `frontend/src/App.tsx` (routes), `frontend/src/pages/{HomePage,DashboardPage,ModulePage,VarkPage,CertPage}.tsx`, all of `frontend/src/components/{atoms,molecules}/`, `frontend/src/styles/globals.css`, `frontend/tailwind.config.js`, `frontend/index.html`, `frontend/vite.config.ts`, `frontend/design-system/` (README, `colors_and_type.css`, logo assets), `frontend/public/locales/en/*`, `docs/MASTER_PLAN.md` and the root `README.md` — and after running the frontend locally (Vite dev server verified serving HTTP 200; authenticated data views need the server's database, RPC and AI keys, so those screens were inspected in code and in the existing UI kit `frontend/design-system/ui_kits/web/v2.html`). `lucide-react` is declared in `frontend/package.json` and imported only by the Select atom (Check/ChevronDown/ChevronUp); all other iconography is emoji and Unicode arrows.

**Approved decisions (recorded at review; implementation phase noted).**

1. **Logo** — recolour the existing mark to solid teal, geometry unchanged; no new brand mark in this phase. *(Approved; applied in P0 to `frontend/public/logo.svg`.)*
2. **Primary button** — solid ink. *(Approved.)*
3. **Type** — keep Space Grotesk (display), Inter (UI/body) and JetBrains Mono (data). *(Approved; no font changes.)*
4. **Theme** — keep the current system-preference-based light/dark behaviour; no forced default. *(Approved.)*
5. **Copy** — the §11 terminology and copy direction are approved. Authored rewrites land in **English and pt-BR first**. The other four locales (es, fr, ja, ar) keep their existing keys untouched in this phase — no machine-invented translations — and the remaining copy debt is reported, not silently filled (see §11).
6. **App shell** — the persistent authenticated shell is approved; it is built in a later phase, not P0.
7. **Landing composition C1** — approved; implemented in a later phase, not P0.
8. **Hash grid** — removed from the primary identity; no replacement decorative background pattern is introduced.
9. **Onboarding tour** — kept; restyled in a later phase.
10. **Test counts** — acceptance criterion 12 uses the current repository counts: 194 server, 49 frontend, 23 contract tests.

---

## 1. Product visual thesis

AI-DLH is a study workbench with a receipt printer. The learner names a topic, the system writes a module and a quiz, the quiz is graded where the answers live — on the server — and every pass at 70% or above produces evidence the learner keeps: a progress record, an Ethereum transaction, a public certificate page. The interface should feel like a precise, calm laboratory bench — warm paper under strong ink, ruled measurements, monospaced data — with one visible place for every artifact the pipeline produces: the module being read, the attempt being graded, the registration being written, the certificate that proves it. The guiding visual language is the **ledger**: one honest row per graded attempt, the 70% threshold as the recurring ruled line, and the confirmed transaction as the only element allowed to look like a seal. It must not look like a generic AI platform: no purple-cyan gradient identity, no glow shadows, no sparkle/robot clichés, no emoji doing semantics they don't own, and no card grids that make a measurement, a form and a piece of evidence look identical.

## 2. Visual personality

Seven attributes. For each: what it means visually, which decisions support it, and which decisions would contradict it.

**1. Evidence-led.** Outcomes appear as artifacts with provenance — a score always ships with its threshold and date; an on-chain claim carries a truncated transaction hash linking to Etherscan; "recorded" is a distinct state with a seal-like treatment, never a floating sticker. Supported by: the ledger-row primitive (score chip + registration marker + `0x…` link), the certificate page's hash/wallet/date block, the sparkline's dashed 70% rule. Contradicted by: the rotated "⛓ ON-CHAIN" stamp (`ModulePage.tsx:519`, `CertPage.tsx:90`) that animates like a sticker; celebratory motion or copy asserting success before the queue confirms it.

**2. Precise.** Monospaced numerals and identifiers, tabular figures aligned in columns, hairline rules instead of shadows between data, one fixed threshold everywhere. Supported by: `font-mono` scores/hashes/addresses/timestamps in `OnChainTimeline`, `tabular-nums` on stat figures, the 72ch prose cap (`ModulePage.tsx:264`). Contradicted by: the identicon's random rainbow conic gradient (`Avatar.tsx`), the gradient-stroked sparkline that blurs which pixel is the data (`Sparkline.tsx:73-81`).

**3. Calm.** A warm paper canvas, few ink weights, one accent doing interactive duty, motion only when state changes; resting surfaces are flat, elevation reserved for things that truly float (menus, dialogs, toasts). Supported by: the existing warm-neutral family (hue 30) which is already non-generic; the global `prefers-reduced-motion` override (`globals.css:394-411`). Contradicted by: the purple hover halo on primary buttons (`Button.tsx:15-17`), the hero gradient field, `backdrop-blur` headers over it, and the triple translucent `focus-ring-v2`.

**4. Exploratory.** Generation is a visible process with real named stages; the interface invites naming the next thing to learn rather than pushing a catalog. Supported by: the stage strings ("Analyzing the topic → Structuring the module → …") as a mono trace with the blinking caret (`.caret`), the prominent generator form, VARK visibly shaping generation. Contradicted by: indeterminate spinners hiding the pipeline's actual stage; catalog-style "featured topics" carousels.

**5. Technically literate.** The UI is not afraid of its machinery: queue states use their real names (`pending`, `retrying`, `failed_permanent`), testnets say "testnet", the active model tier is named on the module it produced. Supported by: the honest polling copy ("you can leave this page — registration continues in the background", `quiz.json:29`); the retry affordance after `failed_permanent` (`ModulePage.tsx:304-313`); the tier preference naming Gemini Flash vs Claude Sonnet (`auth.json:9-19`). Contradicted by: renaming states to vague words ("almost there…"), hiding the queue behind an indeterminate spinner.

**6. Structured.** A fixed set of page compositions (primary column + supporting rail), ruled section breaks, consistent eyebrow-over-title pairing, information ranked by evidence weight rather than box size. Supported by: the `.eyebrow` class (mono, uppercase, tracked — a genuinely distinctive existing device), the dashboard's existing 12-column grid re-semanticized rather than re-skinned. Contradicted by: every block wrapped in the same rounded card (today stat tiles, sparkline, achievements, timeline and generator are all the same `Card` with `shadow-sm`).

**7. Warm but not cozy.** Warmth comes from the paper canvas, generous leading in prose, and plain-spoken copy — not from emoji, confetti or gradient sunsets. Supported by: the warm neutrals, the prose rhythm in `tailwind.config.js` (leading 1.75, underlined links with 2px offset), factually warm copy like "Not this time" for a failed quiz. Contradicted by: 🎉 in toasts, 🤖 inside button labels, 🔥 streak pills, emoji feature tiles (🤖 ⛓️ 📊) — today's `home.json` / `dashboard.json` pattern.

## 3. Anti-patterns

Blacklist. None of these may appear unless there is a specific, documented product reason.

| # | Anti-pattern | Why it fails AI-DLH | What replaces it |
|---|---|---|---|
| 1 | Purple/blue gradient as the primary identity | The exact "AI product" cliché the current v2 direction walked into (electric purple `#7c3aed` + cyan `#22d3ee` in the logo, `.hero-gradient`, `.text-gradient-brand`, button glow) | Ink-on-paper identity: warm neutrals + one petrol-teal interactive accent + ledger-green evidence accent (§5). One brand mark, no gradient text anywhere |
| 2 | Excessive glassmorphism | Blur implies atmosphere, and this product is about legibility of records | Solid surfaces; `bg-card` headers with a hairline border (`backdrop-blur` headers on HomePage/CertPage are removed) |
| 3 | Every section inside a rounded card | The dashboard currently wraps stats, chart, achievements, timeline and form in the identical `Card` — hierarchy is impossible | Ruled sections for static groups; panels only for scrollable/interactive regions (§4, §7) |
| 4 | Decorative badges and pills | Labels like the rotated "⛓ ON-CHAIN" stamp decorate instead of informing | Semantic status text in mono with a state glyph, sized to content; seals reserved for confirmed transactions only |
| 5 | Floating cards without hierarchy | `shadow-sm` on everything flattens elevation meaning | Elevation only for overlaid layers (menu, dialog, toast, tooltip); everything else flat on the ruled canvas |
| 6 | Generic AI sparkle icons | Sparkles signal "magic", the opposite of a server-graded, queue-written pipeline | If an icon is needed at all: line icons from the already-declared `lucide-react`, 1.5px stroke, ink colour; otherwise a mono eyebrow does the job |
| 7 | Robot/brain/neural-network clichés | The current logo is a hexagon of connected nodes = neural-net cliché | Logo rework is an open decision (§15); meanwhile the bench/ledger motif (rules, stamps, thresholds) carries identity |
| 8 | Default dashboard card grids | 4 identical stat tiles (col-3 each) read as template, not as measurements | A ruled stat band: figures separated by hairlines on one surface, ranked left→right by pipeline order (§8) |
| 9 | Oversized "AI-powered" headlines | `text-8xl` gradient hero words on HomePage/CertPage sell instead of explain | Display capped ≈ 56–64px, solid ink, one gradient-free statement sentence doing the explaining |
| 10 | Generic three-column feature sections | HomePage's 🤖/⛓️/📊 tile trio could belong to any product | The four-step pipeline as numbered editorial rules with real nouns (wallet → module → quiz → record), or the live sample ledger |
| 11 | Excessive drop shadows | Purple-tinted shadow scales (`colors_and_type.css` `--shadow-glow`) and hover glows | Neutral, flat shadow scale e0–e3 (§7); hover states expressed as border/ink changes |
| 12 | Arbitrary neon accents | Cyan-on-purple neon reads as gaming/AI hype | Accents are semantic: teal = interactive/in-progress, ledger green = confirmed, amber = retryable, red = failed, steel blue = informational |
| 13 | Copy that could describe any SaaS product | "Get started", "🤖 Generate with AI", "Powered by React, TypeScript, Gemini AI, Ethereum & Solidity" | Copy names the actual mechanism and outcome (§11) |
| 14 | Repeated rounded rectangles with no semantic distinction | Card = stat tile = form = timeline = empty state today | Four named surface types — ruled section, panel, row, seal — each with distinct radius/border/permission rules (§7) |

## 4. Layout grammar

The system is a **workbench**: one primary working column where the current task happens, one supporting rail where evidence and next actions live. Editorial where the content is prose; ledger where the content is records. Never a bento grid.

**Structural rules**

- **Page width.** App shell max 1200px at ≥ 1024px viewport, 24px side padding (32px ≥ 1280). Reading content (module prose, certificate body) capped at 72ch — already true in `ModulePage.tsx:264`, now a rule. Landing max 1120px, asymmetric.
- **Grid.** 12 columns on desktop (the existing `lg:grid-cols-12` re-semanticized), 8 on tablet, 4 on mobile. Gutters 24px desktop / 16px tablet / 12px mobile.
- **Content density.** Ledger rows 56–64px tall; prose leading 1.75; panel padding 20–24px; the ledger lists every record the API returns (no pagination today), scrolling inside its panel beyond ~20 rows.
- **Main navigation.** One persistent app shell for `/dashboard`, `/module/:id`, `/vark` — today each page re-invents its own header. Shell: 56–64px top bar with wordmark, ledger link, identity chip, tier chip, language, theme, disconnect. No sidebar: the product is too small for a rail to be function, not furniture. No route changes — the shell wraps existing pages.
- **Secondary navigation.** In-page eyebrow labels name regions ("Evidence ledger", "New module", "VARK profile"); the module page keeps its back control ("← Dashboard"); on-chain links open Etherscan. Breadcrumbs are unnecessary at this depth.
- **Section spacing.** 64px between major sections, 24px between a section head and its content, 8–12px inside data groups. Whitespace is the hierarchy; rules are the punctuation.
- **Alignment.** Everything start-aligned except outcome figures on the certificate page (a document, not a dashboard) and toasts. No centered body text. RTL stays on logical properties (`ms-`, `me-`, `rtl:rotate-180` — already in use).
- **Panel usage.** A panel is allowed only for (a) an interactive working region (generator, quiz), (b) a scrollable data region (ledger), or (c) a modal layer (dialog, tour, toast). Headers, stat bands, feature explanations, VARK distribution, achievements: ruled sections or bare rows, not panels.
- **Dividers.** 1px `--border` hairline between rows and inside panels; 2px ink rule under page titles and between landing chapters; dashed 1px only for threshold lines and unsettled states (empty zones, retrying registration).
- **Information hierarchy.** Evidence-weight order: confirmed record → attempt (score + date) → module artifact → generation process → chrome. Practically: the largest ink on a page is the outcome figure; eyebrows name regions; everything else is 14–16px.
- **Desktop (≥ 1024).** Primary column 8/12, supporting rail 4/12; rail sticky while the primary column scrolls (dashboard, module).
- **Tablet (640–1023).** Single column; rail content reflows below the primary column in source order; 8-col grid; shell stays a top bar.
- **Mobile (< 640).** One column, 16px padding; shell condenses to wordmark + menu (identity, language, theme inside); ledger rows collapse to two lines (title + score/state); generator is the first full-width block; touch targets ≥ 44px.

**Compositions**

**C1 — Landing / product introduction.** Primary column (7/12): one factual statement sentence ("Generate a study module on any topic. Pass its quiz at 70%. The pass is written to Sepolia — verifiable forever."), the Connect-wallet action, then the pipeline as four numbered editorial rules (01 Connect your wallet → 02 Name a topic and a level → 03 Read, answer, get graded → 04 Reach 70% — it's recorded). Supporting column (5/12): a **sample ledger** — three static ledger rows (one recorded, one below threshold, one retrying) rendered with the real primitives; the page demonstrates the product instead of describing it. Evidence appears: inside the sample ledger (scores, states, truncated hashes) and in a link to a live `/cert/:hash` page. Next action: exactly one primary — Connect wallet; one secondary link to a public certificate. Hierarchy: statement (display, solid ink) → sample ledger → pipeline rules → footer meta. No feature tiles, no gradient hero field.

**C2 — Learning dashboard / progress view.** Primary column (8/12): the **Evidence ledger** — a ruled stat band (modules · attempts · average · recorded, in pipeline order), the ledger of attempts newest-first (ledger-row primitive), and the score-history sparkline with its 70% rule. Supporting rail (4/12): the generator panel (topic, level, submit, live generation trace), then pending modules, then a compact VARK profile chip and achievements strip. Evidence appears: in every ledger row (score vs 70, date, registration state, hash link) and the stat band. Next action: the generator is the persistent next action; the empty-ledger state points at it ("Generate your first module"). Hierarchy: stat figures (display numerals) → ledger rows → sparkline → rail content. Achievements are derived, not evidence — they stay a compact strip and never outweigh the ledger.

**C3 — Module / detail / review view.** Reading desk: 72ch prose column primary; at ≥ 1280 a narrow evidence rail (3/12) shows this module's state (not started / passed / registered + hash + Etherscan link + prior attempts); below 1280 it renders as a status strip above the prose. Quiz mode replaces prose with a focused single-question view (one question, four options, "Question 3 of 8", Previous/Next) in a full-width panel, no rail. Results view: outcome figure (score vs threshold) on top, registration marker beneath, then the **attempt review list** — per-question rows where locked rows show a locked rule until a retake unlocks them (the server hides missed explanations until they are earned — the UI must show that lock, not hide the mechanic). Evidence appears: prior records + tx hash in the rail; per-question correctness in review. Next action: Start quiz / Retake — the single primary under the prose; in results, Retake or Back to dashboard. Hierarchy: module title (display) → prose → primary action → evidence rail. Focus mode keeps hiding shell and rail, leaving the 72ch column on the plain canvas (focus mode itself is kept; the hash texture is removed from the identity per §15.8).

## 5. Color system

Semantic tokens, not a palette. Every colour is tied to pipeline meaning: **teal = interactive/working**, **ledger green = settled and provable**, **amber = retryable**, **brick red = failed**, **steel blue = informational**. Values are HSL triplets compatible with the existing Tailwind CSS-variable setup (replacing the current values in `globals.css`; the warm-neutral hue 30 family is kept — it is the one current decision worth keeping).

| Token | Light | Dark | Meaning / where it comes from |
|---|---|---|---|
| `--canvas` | `30 20% 97%` | `30 6% 6%` | The bench: page background, warm paper |
| `--surface` | `0 0% 100%` | `30 7% 10%` | Ruled sections, panels, shell header |
| `--surface-elevated` | `0 0% 100%` + hairline + `--shadow-2` | `30 7% 13%` | Floating layers only: menus, dialogs, toasts, tooltips |
| `--ink` | `30 6% 10%` | `30 14% 94%` | Primary text, primary buttons, 2px rules |
| `--ink-muted` | `30 7% 38%` | `30 8% 62%` | Secondary text, captions, empty-state hints |
| `--border` | `30 15% 85%` | `30 7% 17%` | Hairlines, row separators, input borders |
| `--border-strong` | `30 10% 55%` | `30 8% 40%` | Hover borders, the 2px evidence seal outline |
| `--accent-primary` | `192 72% 26%` | `187 62% 58%` | **Working/interactive**: links, active nav/tab, progress fill, focus ring, "registering…" state |
| `--accent-secondary` | `152 55% 24%` | `148 45% 58%` | **Ledger green**: confirmed records, certificates, seals, pass results |
| `--success` (fg/bg/border) | `152 55% 20%` / `150 45% 95%` / `150 40% 80%` | `148 45% 66%` / `152 55% 24% / .12` / `152 55% 24% / .30` | Correct answers, passed threshold. Shares the ledger-green hue **deliberately**: "true and settled" is one hue in this system |
| `--warning` (fg/bg/border) | `30 80% 28%` / `43 96% 95%` / `40 85% 76%` | `40 90% 70%` / `32 95% 44% / .10` / `32 95% 44% / .30` | Retry-scheduled registrations, "not yet" states. Not decorative amber |
| `--danger` (fg/bg/border) | `8 65% 34%` / `8 80% 97%` / `8 65% 84%` | `8 80% 74%` / `8 65% 42% / .10` / `8 65% 42% / .32` | `failed_permanent`, destructive actions only |
| `--informational` (fg/bg/border) | `212 40% 32%` / `210 45% 96%` / `210 35% 82%` | `210 55% 72%` / `212 40% 38% / .10` / `212 40% 38% / .28` | Neutral status: queued, "awaiting the queue", machine-translated locale notices |
| `--focus` | `192 72% 26%` | `187 62% 58%` | Focus ring = accent-primary, 2px ring + 2px offset, single ring |

**Primary brand signal.** The signal is not a colour, it is the pairing *warm paper + strong ink*; the accent-primary teal exists so that "interactive/working" is findable in a glance. Ledger green is the second signal and the emotional payoff: it appears only when something becomes permanently true. No purple anywhere.

**Where colour is allowed.** Interactive controls and their states (teal), confirmed evidence (green seals, pass chips), the four semantic state sets (amber/red/blue) in their exact meanings, focus rings, the sparkline's data line (teal, solid — no gradient stroke) and the VARK dominant-style bar. Primary buttons are solid ink (approved — the strongest mark on paper).

**Where colour is prohibited.** Headings and body text (ink only — no `text-gradient-brand`), backgrounds of content sections (no gradient washes), borders of resting panels, the logo as a purple gradient, success/colour decoration on neutral facts (e.g. module level: beginner/intermediate/advanced is neutral metadata — the current mapping to success/warning/**error** colours is wrong and must go), streaks (ink chip with count, not 🔥 amber), chart fills above 25% opacity.

**Dark mode.** Same hue families, lightness-inverted: the canvas becomes a warm near-black (`30 6% 6%`, keeps the warm cast instead of neutral gray), teal and green lighten to ≥ 4.5:1 on the dark canvas, semantic backgrounds become 8–12% alpha overlays (pattern already used in `globals.css:140-158`, keep it). First-class: every token has a `.dark` value and components must never hardcode `bg-green-50`-style palette utilities.

**Contrast expectations.** Body text ≥ 4.5:1 (AA) against its surface in both modes; 14px mono status text ≥ 4.5:1; large display numerals ≥ 3:1; teal-on-white and green-on-white button/ink pairings are validated at the darkened ends given above; focus ring ≥ 3:1 against both canvas and surface; never encode state by colour alone — every state colour pairs with a text label or glyph (the ledger row always spells "Recorded", the review row always says Correct/Incorrect).

**Semantic states vs decorative accents.** A colour may appear on screen only if it answers "what does the pipeline say about this?" — teal answers "you can act / it is working", green "it is settled and provable", amber "it will be retried", red "it needs a human", blue "nothing is wrong, this is information". If removing a colour would lose no information, the colour is decoration and must be removed. This single test kills the current glow shadows, gradient stamps and emoji pills without touching any real state communication.

## 6. Typography

Three faces, all already loaded via `index.html` (Google Fonts CDN) — no new dependency:

- **Display — Space Grotesk** (500/600/700): page titles, panel titles, outcome figures. Retained from v2 and re-approved (§15.3); it is geometric without being Inter, and the mono/ink system stops it reading "startup template".
- **Body — Inter** (400/500/600): all UI text, prose, buttons, form labels. Non-negotiable for this codebase: the Noto Sans JP / Noto Sans Arabic fallback chain in `tailwind.config.js` must stay for `ja`/`ar`.
- **Data — JetBrains Mono** (400/500/600): eyebrows, scores in rows, hashes, addresses, queue states, timestamps, the generation trace, counts. Monospace is the "laboratory instrument" voice — it is what makes the UI feel like a workbench rather than a website.

**Weights.** Display max 700 only for the landing statement and outcome figures; panel titles 600; eyebrows 600; body 400/500; buttons 500 (not 600+ — labels are not shouting).

**Scale** (px / rem, light-mode ink on paper):

| Step | Size | Line height | Use |
|---|---|---|---|
| display-xl | 56–64px | 1.05 | Landing statement, certificate score only |
| display-lg | 36px / 2.25rem | 1.15 | Page titles (Dashboard, module title, certificate topic) |
| title | 20px | 1.3 | Panel/section titles (replaces today's fixed `text-2xl` CardTitle) |
| outcome | 48px | 1.0 | Stat-band figures, result score, tabular-nums |
| body-lg | 18px / 1.6 | 1.6 | Landing support text, VARK descriptions |
| body | 16px | 1.6 | Prose is 1.75 via the typography plugin (keep) |
| ui | 14px | 1.45 | Buttons, rows, inputs, ledger row titles |
| caption | 13px | 1.4 | Secondary text in rows, toasts |
| eyebrow | 12px mono, 600, uppercase, tracking 0.14em | 1.2 | Region labels — keep `.eyebrow`, tighten from 0.18em |

**Maximum line length.** Prose 72ch (existing); landing support 60ch; toast/dialog text 52ch. No full-width body paragraphs.

**Heading treatment.** Sentence case, never ALL-CAPS (the eyebrow is the only uppercase). Page title = display-lg + a 2px ink rule beneath it, spanning the primary column only. Section titles = title weight 600, no rule. No drop shadows or gradient fills on type — the existing `.text-gradient-brand` is retired. Eyebrow sits 8px above its title; the pair (eyebrow, title) is the standard section head.

**Numeric / data treatment.** `tabular-nums` on every figure that can change or align (stat band, ledger scores, quiz progress "3 of 8", VARK counts). Scores always render with `%` and, wherever space allows, their relation to the threshold ("88% · passed", "62% · below 70%"). Hashes render `0xabcdef…1234` in mono with an external-link affordance; wallet addresses render `0x1f2a…c4`. No animated digit-ticking on scores — the number arrives once, settled (the queue taught us: things settle once).

**Buttons and labels.** Buttons: 14px Inter 500, sentence case, no emoji inside labels (current "🤖 Generate with AI" becomes "Generate module"). Input labels: 14px Inter 500 above the field (existing pattern, keep). The eyebrow is the label for regions, never for actions.

**Why this typography is distinctive.** The mono eyebrow + ruled titles + tabular outcome figures + mono data everywhere make screens read like lab stationery; Inter/Space Grotesk remain quiet so that *numbers and states* are the loudest thing on every page — the inverse of the gradient-headline AI template.

## 7. Shape, borders and depth

Shape communicates state, not decoration. Four surface types replace the single universal Card:

| Surface type | Radius | Border | Allowed for |
|---|---|---|---|
| Ruled section | 0 | none (rules above/below) | Headers, stat bands, feature/pipeline text, VARK distribution, achievements strip |
| Panel | 8px (`--radius-panel`) | 1px `--border` | Generator form, quiz surface, ledger list, dialogs, tour |
| Row | 4px (`--radius-row`) | 1px `--border`, or none inside a panel list | Ledger rows, review rows, pending-module rows, achievements tiles |
| Seal | 2px | 2px `--accent-secondary` (light) | Confirmed-transaction evidence only: cert page badge, "Recorded" marker |

**Radius scale.** `--radius-seal: 2px`, `--radius-row: 4px`, `--radius-panel: 8px`, `--radius-dialog: 12px`. Today's single `--radius: 0.625rem` (10px) collapses everything into one shape; the four-step scale makes a row, a panel and a seal distinguishable at a glance. Nothing else gets rounded (no `rounded-full` pills for status — chips are 4px).

**Border scale.** 1px hairline `--border` (default); 1px `--border-strong` on hover of interactive rows; 2px `--accent-secondary` for seals only; 2px `--ink` for the title rule; dashed 1px `--border` for threshold lines and empty/placeholder zones. No 0.5px or tinted-alpha borders except the dark-mode semantic overlays already defined in §5.

**Shadow policy.** Shadows describe physical elevation and nothing else:
- `--shadow-0`: none — ruled sections, rows, panels at rest;
- `--shadow-1`: `0 1px 2px rgba(30 6% 8% / 0.06)` — a panel that visually separates from a busy background (used sparingly);
- `--shadow-2`: `0 4px 12px rgba(30 6% 8% / 0.10)` — sticky rail, popover;
- `--shadow-3`: `0 12px 32px rgba(30 6% 8% / 0.14)` — dialogs, toasts, tour spotlight.
All shadows neutral ink (never purple-tinted as in `colors_and_type.css --shadow-glow`). Hovering a button or row never changes its shadow.

**Elevation policy.** Resting page = flat. Elevation ladder: page (canvas) → surface (ruled/panel) → sticky rail (shadow-2) → overlay (shadow-3). If two elements share an elevation but one is interactive and one is not, the difference is expressed by border/ink/affordance, not shadow.

**When a panel is allowed.** Only per §4: working region, scrollable data region, or modal layer. A panel must have a border and no shadow at rest; its title is a `title`-step heading inside 20–24px padding; panels never nest panels (the current quiz-inside-Card and review-inside-Card pattern becomes panel + rows).

**When a divider is preferred.** When the content is static, ordered or comparative: the stat band separates its figures with vertical hairlines; the ledger separates rows with horizontal hairlines; landing chapters separate with 2px ink rules. If a section would need a panel only to "hold" it, use a divider.

**Selected / active / disabled.**
- *Selected* (quiz option, ledger row focus, VARK choice): 1px `--accent-primary` border + 6% teal background + the state spelled in text or glyph. No rings, no glow (replaces today's `bg-primary/10 ring-2 ring-primary/20`).
- *Active* (current tab, current nav item): teal 2px underline (the existing `TabsTrigger` underline is kept, recoloured) or teal left rule on rows.
- *Disabled*: 45% opacity, `cursor: not-allowed`, label unchanged, no colour change (never red/green disabled states).
- *Focus (keyboard)*: single 2px `--focus` ring with 2px offset — the triple translucent `focus-ring-v2` is retired.

## 8. Components

Each component lists: purpose · visual treatment · content hierarchy · interaction states · mobile behaviour · accessibility. A component never exists merely to wrap content in a rounded box.

**Buttons.** Purpose: the only elements that change pipeline state (connect, generate, navigate, submit, retry, disconnect). Treatment: primary = solid ink (approved, §15.2), white text, 8px radius; secondary/outline = 1px border, ink text, surface background; destructive = solid `--danger`; quiet = text-only with underline on hover. Hierarchy: one primary per view; the rest outline/quiet. States: hover = `--border-strong` border or ink shift, **no elevation change, no glow, no translate** (replaces `Button.tsx:15-17`); active = pressed 1px inset; disabled = 45% opacity; loading = label swapped to the action's true phase ("Generating…", "Submitting…") + the indeterminate bar overlay (existing `.bar-indeterminate`, recoloured teal). Mobile: full-width primary actions, ≥ 44px tall; `sm`/`md`/`lg` sizes kept. A11y: real `<button>`/`<a>`, `aria-busy` while loading, visible focus ring.

**Links.** Purpose: navigation to real destinations (module pages, Etherscan, certificate). Treatment: ink text with 1px underline, teal on hover and for inline data links (hashes); external links keep the ↗ glyph and `target="_blank"` + `rel` (existing pattern). Hierarchy: inline within content, never stacked as pseudo-buttons. States: hover underline solidifies; no special visited state; focus ring standard. Mobile: tap target ≥ 44px for row-level links (the stretched-link pattern from `OnChainTimeline` is kept). A11y: underline never the only affordance — external links add ↗ and an `aria-label` where the content is a truncated hash.

**Tabs.** Purpose: switch between co-equal in-panel views (review filters, preferences sections). Treatment: the existing underline tab (`Tabs.tsx`) kept, recoloured teal, 14px Inter 500 labels. Hierarchy: tabs sit below the panel title, above content. States: active = 2px teal underline + ink text; hover = muted → ink; focus ring standard; keyboard = Radix roving tabindex (already provided). Mobile: horizontal scroll with edge fade beyond 3 tabs. A11y: Radix `role="tablist"` semantics; active state never colour-only (weight + underline).

**Navigation.** Purpose: the app shell (§4) — persistent identity + the 2–3 destinations + user controls. Treatment: `--surface` bar, 1px bottom hairline, wordmark left, controls right; current view marked by a teal 2px underline on its label. Hierarchy: wordmark → view links → identity/tier chips → utilities (language, theme, disconnect). States: hover ink shift; current = underline + weight 600; focus ring standard. Mobile: wordmark + menu button; the menu opens a `--surface-elevated` sheet (shadow-3) with the same items stacked. A11y: `<nav aria-label="Primary">`, SkipLink kept, current view via `aria-current="page"`.

**Cards / panels.** Purpose: working regions and scrollable data regions only (§4, §7). Treatment: 8px radius, 1px border, no resting shadow, `--surface` background. Hierarchy: title (20px) → description (14px muted) → content. States: static; whole-panel hover only when the panel is one stretched-link row; focus-within ring for form panels. Mobile: full-width, 16px padding. A11y: panels with headings use `<section aria-labelledby>`; purely decorative wrappers carry no heading.

**Module items.** Purpose: present a generated study unit and its state (not started / passed / recorded / failed). Treatment: ledger-row anatomy (§9) — title 14px/600, topic + level as 13px muted metadata in **neutral ink** (not success/warning/error as today), score chip when attempted, registration marker when written. Hierarchy: title → outcome (score/state) → metadata. States: whole row clickable (stretched link, kept); hover = `--border-strong`; not-yet-attempted modules render with a dashed left rule. Mobile: two-line collapse, metadata truncates, full metadata lives on the module page. A11y: `aria-label` spells "Open {title}, score {score} percent" (existing pattern).

**Progress indicators.** Purpose: show progress that is real — quiz position ("Question 3 of 8") and queue state. Treatment: quiz = 2px teal fill on a 4px hairline-bordered track, no gradient (replaces `from-primary to-accent`, `ModulePage.tsx:335`); position rendered in mono beside the bar. Generation = the generation-trace primitive (§9), never a bare spinner. Data loading = skeleton. States: fill animates 180ms on change; indeterminate bar for unbounded server work; all of it halts under reduced-motion. Mobile: position text above the bar. A11y: `role="status"` text carries the value; the bar is `aria-hidden`.

**Timelines.** Purpose: the evidence ledger (primary), plus module-level prior attempts (evidence rail). Treatment: a ruled list of ledger rows with a 4px state gutter (§9) — not a decorative vertical line; a hairline spine is optional on the module page only. Hierarchy: newest first; within a row, outcome before metadata. States: rows are interactive where an action exists (Retry on failed rows). Mobile: identical rows, no spine. A11y: `<ol>` with per-row `aria-label`; Etherscan links labelled "View transaction on Etherscan".

**Status indicators.** Purpose: communicate the five queue states + quiz outcome without emoji. Treatment: mono 12–13px label + one glyph: ○ Queued (informational), ◐ Registering (teal, slow pulse), ◉ Recorded (ledger green; seal treatment on the certificate page), ↻ Retry scheduled (amber), ✕ Failed — needs attention (red, with Retry). Hierarchy: the label carries the meaning; colour and glyph reinforce it. States: pulse only while `pending|processing|failed` (the existing `CHAIN_IN_PROGRESS` polling already drives this), static otherwise. Mobile: glyph + short label; full text on the module page. A11y: `role="status"`, polite announcements on change, never colour-only.

**Tables.** Purpose: any tabular comparison (today none exists; the stat band and review list are the closest). If introduced, tables are ruled, not striped: hairline row separators, mono numerals, `text-start` alignment (the prose table styles in `tailwind.config.js` already define the pattern — reuse). Hierarchy: headers 13px mono uppercase (eyebrow voice). States: row hover only when rows are actionable; no zebra striping. Mobile: tables become stacked key/value rows below 640px. A11y: real `<table>` with `<th scope>`, caption when non-obvious.

**Empty states.** Purpose: explain what will appear here and name the next action. Treatment: no panel, no emoji illustration — a dashed 1px bordered zone (radius-row) with a 13px mono state line ("No attempts yet") and a 14px ink sentence with the next step ("Generate your first module — it takes about a minute."). Hierarchy: state line → next step → (optional) action link. States: static; never animated. Mobile: same stack, centered text allowed. A11y: not announced as errors; `role="status"` where they replace loading data. The existing emoji empty states (`📊`, `⛓️` in Sparkline/OnChainTimeline) are replaced by this pattern.

**Loading states.** Purpose: hold layout while data or generation resolves. Treatment: skeleton blocks on `--surface` with the existing shimmer (recoloured neutral, 1.5s); a skeleton previews the real structure (existing DashboardPage generating-skeleton is the right idea); paired with a mono status line when the cause is a pipeline stage. Hierarchy: skeleton mimics final hierarchy, never random gray blocks. States: skeletons only while `isLoading`/`isGenerating`; query `staleTime: 30_000` (App.tsx) means returning visits usually skip them. Mobile: fewer skeleton rows (3 max). A11y: `aria-busy="true"` on the region; the RouteFallback spinner + sr-only "Loading…" is kept for pre-i18n render (App.tsx).

**Error states.** Purpose: distinguish four real failure classes: (1) data/query error, (2) generation error, (3) quiz submit error, (4) registration `failed_permanent`. Treatment: inline, at the point of the failed region — 1px `--danger` border row: what failed (mono state line), what is safe ("Your score was saved."), the recovery action ("Re-queue registration", "Try again", "Reload page"). ErrorBoundary keeps its full-screen panel for render crashes with Try again / Reload (its hardcoded English strings move into `common.json` — an i18n fix, not a behaviour change). Hierarchy: what happened → what's safe → what to do. Mobile: full-width row, actions stacked. A11y: `role="alert"` for blocking failures, `role="status"` for recoverable ones; never colour-only.

**Tooltips.** Purpose: define derived values (achievement criteria, tier cost note, truncated hash full value). Treatment: `--surface-elevated`, 1px border, shadow-2, 13px text, 6px offset (existing `Tooltip.tsx` values kept, colours retokened). Hierarchy: term → one-line explanation → mono figure if any. States: 200ms delayed open (existing `delayDuration`), no bounce. Mobile: tooltips are suppressed on touch; the same content must be reachable by tap (achievements already render progress inline). A11y: Radix triggers are keyboard focusable; content is plain text, no interactive elements inside.

**Dialogs.** Purpose: preferences panel and confirmations. Treatment: `--surface`, 12px radius, border + shadow-3, overlay `rgba(--ink / 0.4)` (no blur). Hierarchy: title → description → content → actions right-aligned. States: focus trapped (Radix), Escape closes, restored focus on close (existing `Dialog.tsx`). Mobile: bottom sheet, full-width, sticky actions. A11y: `aria-labelledby`/`aria-describedby` (existing), focus ring standard.

**Form controls.** Purpose: topic input, level select, VARK answers, preferences. Treatment: 44px height, 1px `--border`, 4px radius, `--surface` background; label above (14px/500) with the field, hint below in 13px muted; invalid = 1px `--danger` border + message below (never placeholder-as-label). Hierarchy: label → control → hint/error. States: focus = 2px teal ring; disabled = 45%; error as above. The level Select keeps Radix with retokened surfaces. Mobile: full-width, font-size ≥ 16px to prevent iOS zoom. A11y: `<label htmlFor>` (the topic input currently lacks `htmlFor` — fix), `aria-invalid`, error text linked via `aria-describedby`.

**Score / outcome displays.** Purpose: the product's most important readout — a quiz result, a stat figure, a certificate score. Treatment: outcome step (48px) Space Grotesk 700 `tabular-nums`, solid ink or ledger green once passed; always accompanied by its threshold relation ("passed · threshold 70%") in mono 13px; on the certificate page only, the score may reach display-xl and centre as a document figure (solid ledger green — no gradient). Hierarchy: figure → relation → context (date/module). States: static; passing and failing differ by colour + the spelled word ("Passed"/"Below threshold"), never by colour alone. Mobile: 40px figure, same pairing. A11y: `aria-label` with the full sentence ("Score 88 percent, passed the 70 percent threshold").

## 9. Product-specific primitives

Names are chosen from what the code actually does — not from a generic list. Eight primitives; each names the existing code it evolves.

**P1 — Ledger row** (evolves `OnChainTimeline.tsx` row + pending-module row).
- *Concept:* one graded attempt as a permanent record — the atom of the product's evidence.
- *Information:* module title, score with threshold relation, relative date, registration state, transaction hash when confirmed.
- *Visual distinction:* 4px state gutter (green/teal/amber/red) + hairline-bounded row; score in mono chip; hash as teal `0x… ↗` link. Nothing else in the UI uses this exact anatomy.
- *States:* `no attempt yet` (dashed gutter, no score) → `scored below threshold` (muted score chip) → `passed · queued` (teal gutter, ○) → `registering` (teal, ◐ pulse) → `recorded` (green gutter, ◉, hash appears) / `retry scheduled` (amber, ↻) / `failed — needs attention` (red, ✕ + Retry button). Clicking always navigates to `/module/:id` (stretched-link behaviour kept).
- *Mobile:* two-line form — line 1: title + score chip; line 2: state + date; hash tap opens Etherscan.

**P2 — Study unit card** (evolves the dashboard "Pending" list + module header metadata).
- *Concept:* a generated module as an artifact with a lifecycle, independent of any attempt.
- *Information:* title, topic, level, estimated time, generation tier, attempt state.
- *Visual distinction:* neutral metadata row (level is plain ink text — today it borrows success/warning/error colours); a 1px left rule marks "generated, not yet attempted".
- *States:* freshly generated (teal left rule + "new" tag) → attempted (score chip appears) → passed/recorded (state chip); retakeable at any time (label "Retake quiz").
- *Mobile:* collapses to title + state line; level and time move into the module page.

**P3 — Threshold rule** (evolves the sparkline's dashed line, `Sparkline.tsx:83-92`).
- *Concept:* the 70% pass line — the one number the whole pipeline is built around.
- *Information:* the threshold value; whether each score sits above or below it.
- *Visual distinction:* dashed 1px ink line with a tiny mono "70% pass" tag at its right end; the only dashed element that carries data (empty-zone dashes are non-data and untagged).
- *States:* static in charts; in result context it becomes the sentence "88% · passed (threshold 70%)".
- *Mobile:* tag shortens to "70%".

**P4 — Registration marker** (evolves `⏳ registering…` / `⛓ ON-CHAIN` stamp / status chips).
- *Concept:* the honest lifecycle of the async on-chain write — the product's differentiator deserves its own element.
- *Information:* one of: Queued → Registering → Recorded (+ hash, + Etherscan link) / Retry scheduled (+ next attempt notice) / Failed — needs attention (+ Retry action).
- *Visual distinction:* mono 12–13px label + state glyph + 4px gutter colour; on the certificate page it graduates to the seal (2px green border, 2px radius). Never rotated, never floating, never animated except the registering pulse.
- *States:* driven by the existing polling (`CHAIN_IN_PROGRESS`, 5s refetch) — visual transitions only, no logic changes.
- *Mobile:* glyph + short label; actions full-width beneath.

**P5 — Generation trace** (evolves the `generator.stages.*` strings + `.caret`).
- *Concept:* the AI pipeline as a visible, truthful process log rather than a spinner.
- *Information:* current stage in mono ("structuring the module▋"), elapsed seconds, the tier actually used.
- *Visual distinction:* mono 13px text block with the blinking caret, bounded by hairlines; no progress bar (duration is genuinely unknown — faking one would lie).
- *States:* stage text swaps every ~2.2s (existing interval); on success it freezes on the final stage for a beat, then the page navigates (existing behaviour).
- *Mobile:* same trace, full-width above the pending list.

**P6 — Attempt review list** (evolves the quiz review `<ol>`, `ModulePage.tsx:586-631`).
- *Concept:* per-question truth after grading — including the product's signature mechanic: explanations for missed questions stay locked until a retake earns them.
- *Information:* question, your answer (letter + content), correct/incorrect marker, explanation **only when unlocked**.
- *Visual distinction:* row per question, 1px hairline separators (not tinted cards as today); correct = green left rule + "Correct"; incorrect = red left rule + "Incorrect"; locked rows show a mono lock line with the unlock condition.
- *States:* per row: correct / incorrect+locked / incorrect+unlocked (after a qualifying retake — server decides, UI reflects).
- *Mobile:* identical rows; question wraps to 3 lines max before truncation with expansion on tap.

**P7 — VARK profile bar** (evolves the VARK result distribution + `PreferencesPanel` style chip).
- *Concept:* the learner's measured style (Visual/Auditory/Read-write/Kinesthetic, possibly multimodal) that the generator adapts to.
- *Information:* four distribution bars with counts "x / 15", dominant style flagged, multimodal notice when applicable.
- *Visual distinction:* horizontal 6px bars on hairline tracks; dominant bar in teal, others in 25% teal (existing pattern, retokened); the stored profile renders as a small mono chip wherever generation is influenced ("profile: visual · adapts generation").
- *States:* not taken (chip shows "profile: not set" + link to `/vark`) → taken (distribution) → retaken (bars re-render, chip updates).
- *Mobile:* bars stack with labels above; chip inline in the rail.

**P8 — Outcome figure** (evolves stat-band numbers, result score, certificate score).
- *Concept:* a settled measurement — the visual anchor of every screen that ends in a number.
- *Information:* the figure, its unit, and its threshold relation or comparison ("across all quizzes").
- *Visual distinction:* 48px Space Grotesk 700 tabular-nums, solid ink (or ledger green when it is a pass); a mono 13px relation line beneath; no gradient, no count-up animation.
- *States:* data loading (skeleton block of identical height) → settled (figure + relation); failing context renders muted ink with "below threshold".
- *Mobile:* 40px, relation line wraps beneath.

**P9 (extension) — Identity chip** (evolves `Avatar` + `formatAddress`).
- *Concept:* the wallet as the learner's signature on their evidence.
- *Information:* deterministic identicon (2 hues derived from the address, not today's random rainbow conic gradient) + truncated address `0x1f2a…c4` in mono.
- *Visual distinction:* 20px identicon + mono text; on the certificate page it enlarges into the signer line of the document.
- *States:* static (wallet is fixed per session); disconnect lives in the shell, not the chip.
- *Mobile:* chip truncates to the identicon in the shell; full address on tap/copy.

## 10. Motion

Motion communicates state or progression. If it does neither, it is removed. The existing foundation is good (framer-motion's `useReducedMotion` is already respected in `ModulePage`, `CertPage`, `OnboardingTour`; a global reduced-motion kill-switch exists in `globals.css:394-411`) — this section formalises it.

**Allowed transitions (each maps to a state change):**
- Progress fill width (quiz position) — 180ms ease-out;
- State marker swap (queued → registering → recorded) — 120ms crossfade, plus a one-time 240ms "settle" (scale 1.06 → 1, rotate −8° → 0) when a record first becomes *recorded* — the only entrance animation in the system, and only for the evidence moment (replaces the current 600ms rotating stamp);
- Generation trace stage text swap — 120ms crossfade + caret blink (existing, 1s steps);
- Skeleton shimmer — existing 1.5s linear loop, while data loads only;
- Registration pulse on ◐ — 2s opacity loop, while `CHAIN_IN_PROGRESS` only;
- Toast enter/exit — 150ms slide/fade (sonner default, kept);
- Tab underline and menu/sheet open — 150–200ms;
- Onboarding spotlight dim + tooltip — existing 200/250ms fades (kept).

**Duration range.** 120–240ms for state changes; ≤ 400ms absolute ceiling for entrances; loops (shimmer, pulse, caret) exempt as they communicate ongoing work.

**Easing.** Standard: `cubic-bezier(0.2, 0, 0, 1)`. Entrances/settle: the existing `cubic-bezier(0.22, 1, 0.36, 1)`. No springs, no bounce.

**Never animates.** Page titles and body text (no fade-up-on-scroll); the hero/landing background (the hash grid is static; the animated gradient field is removed); buttons on hover (no glow bloom, no translate); prices/figures (no count-up ticking); emoji (none remain); the sparkline draw (the current 2s stroke-dashoffset idea reads as decoration — the line renders settled); anything looping that is not shimmer/pulse/caret; layout shifts as "animation" (no elements that push content when state changes — markers reserve their space).

**Reduced motion.** `prefers-reduced-motion: reduce` ⇒ every animation/transition forced to ~0ms and shown in its end state (existing global rule, kept); skeletons become static `--muted` blocks (existing); the registering pulse is replaced by the mono label alone; the recorded settle is skipped; framer components continue to gate on `useReducedMotion`. Requirement: no state information may exist *only* in motion — the registering state must be legible as static text, which it already is ("registering…").

## 11. Copy system

**Product voice.** A lab partner who states facts and names mechanisms. Second person, present tense, short declaratives. The pipeline's vocabulary is used precisely: modules are *generated*, quizzes are *graded server-side*, passes are *recorded on Sepolia* by a *queue*, failures are *retried* or *need attention*. Tone default: dry and exact. Warmth is allowed exactly once per flow — at the pass moment ("Passed. It's being recorded.") — and nowhere else.

**Sentence length.** UI labels ≤ 3 words where possible; body ≤ 20 words; error copy ≤ 2 short sentences + an action. One idea per sentence.

**Terminology (locked, all locales).** module (never "course", "lesson", "path"); quiz (never "assessment", "test"); attempt / record; score; threshold 70% (never "pass mark" alone, always with the number); registration / registered (the on-chain write — never "minted" while the queue writes custodially); certificate (the public `/cert/:hash` page); ledger; generation trace; tier Default/Premium (naming the actual model); VARK profile. Testnet is named: "recorded on Sepolia (testnet)" on first mention per surface.

**Action labels.** Verb + object, no emoji: *Connect wallet · Generate module · Start quiz · Submit answers · Retake quiz · Re-queue registration · Copy link · Disconnect*. Destructive/recoverable actions name the object ("Re-queue registration", not "Try again" when the object matters — "Try again" is reserved for quiz retakes).

**Empty-state tone.** Factual state + one next step + a real expectation. Never playful-emoji, never apologetic. "No attempts yet. Generate your first module — it takes about a minute."

**Error-state tone.** What failed → what is safe → what to do. Always name the safe part (the product's promise: your score survives registration failures). "The on-chain registration failed after several attempts. Your score was saved. You can re-queue it."

**Onboarding tone.** Show the three real regions, one sentence each, no superlatives: "Name a topic and a level. The module and its quiz are generated for you." The tour's existing 3-step structure (generator → sparkline → on-chain) is kept.

**Words to avoid.** unlock, unleash, empower, harness, seamless, effortless, revolutionary, game-changing, cutting-edge, next-generation, supercharge, magical, dive in, "AI-powered" as a boast (the acronym may appear once in the wordmark context, never as a headline), "future of learning", "join thousands", any claim the pipeline does not literally perform.

**Ten bad generic lines → AI-DLH rewrites**

| # | Bad (generic) | Rewritten (AI-DLH) |
|---|---|---|
| 1 | "Unlock your learning potential with AI." | "Generate a module on any topic. Pass its quiz at 70% to record it on Sepolia." |
| 2 | "A seamless, AI-powered learning experience." | "Pick a topic and a level. The module and its quiz are generated; grading happens on the server." |
| 3 | "Revolutionary blockchain certificates." | "Each pass writes a transaction. Its hash is public and verifiable on Etherscan." |
| 4 | "🚀 Supercharge your study sessions." | "Start quiz — 8 questions, graded on the server." |
| 5 | "The next-generation decentralized education platform." | "Generated modules, a 70% threshold, and an on-chain record of what you passed." |
| 6 | "Empowering learners worldwide." | "Read the module, answer the questions, see exactly which answers were right." |
| 7 | "Harness the power of cutting-edge AI." | "Modules are generated by Gemini Flash by default; Premium tier uses Claude Sonnet — the tier used is named on each module." |
| 8 | "Join thousands of learners today." | "Connect your wallet to keep your modules, scores and certificates tied to your address." |
| 9 | "Experience the magic of instant learning." | "Generation takes about a minute. The trace shows the stage: analyzing topic, structuring module, writing content, building quiz." |
| 10 | "Infinite possibilities for your future." | "Retake any quiz. Explanations for missed questions unlock when you answer them correctly." |

**Localisation note (approved §15.5).** Copy lives in `frontend/public/locales/<locale>/*.json` (6 locales; en + pt-BR authored, es/fr/ja/ar machine-translated and pending human review). Approved rewrites land in **`en` and `pt-BR` first**. The other four locales keep their existing keys untouched in this phase — no machine-invented translations are added. Remaining copy debt, to be reported at each implementation milestone and resolved in the human-review pass already tracked in the README roadmap: es/fr/ja/ar still carry pre-rewrite strings (emoji inside labels and toasts such as "🤖", 🎉 phrasing, and pre-v3 generic wording) until that pass. The ErrorBoundary's hardcoded English strings move to `common.json` when the copy phase starts.

## 12. Example page wireframes

ASCII only — no screenshots in this step. They demonstrate hierarchy and product-specific content, not pixel design.

**W1 — Landing (`/`)**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AI-DLH  evidence-driven study bench            EN ▾   ◐  theme  [Connect wallet]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  THE BENCH (eyebrow)                        SAMPLE LEDGER (eyebrow)            │
│                                             ┌──────────────────────────────┐  │
│  Generate a study module on any topic.      │ ◉ TypeScript generics        │  │
│  Pass its quiz at 70%.                      │   88% · passed · 0x3f…9a ↗   │  │
│  The pass is written to Sepolia —           │ ◐ SQL indexes                │  │
│  verifiable forever.                        │   74% · registering…         │  │
│                                             │ ○ Event loop                 │  │
│  [Connect wallet]   See a real certificate ↗│   62% · below threshold      │  │
│                                             └──────────────────────────────┘  │
│  ═══════════════════════════════ (2px ink rule) ═══════════════════════════    │
│  HOW IT WORKS (eyebrow)                                                        │
│  01  Connect your wallet — MetaMask signature. No email, no password.          │
│  ────────────────────────────────────────────────────────────────────────────  │
│  02  Name a topic and a level — the module and its quiz are generated.         │
│  ────────────────────────────────────────────────────────────────────────────  │
│  03  Read, answer, get graded — grading runs on the server. Missed             │
│      explanations stay locked until a retake earns them.                       │
│  ────────────────────────────────────────────────────────────────────────────  │
│  04  Reach 70% — it's recorded — a queue writes it to Sepolia (testnet).       │
│      You can leave the page while it registers.                                │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ © AI-DLH · modules generated on demand · records on Sepolia (testnet)          │
└────────────────────────────────────────────────────────────────────────────────┘
```

**W2 — Dashboard (`/dashboard`)**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ AI-DLH   Ledger ●current   0x1f2a…c4 ▍ Default tier   EN ▾   ◐   Disconnect    │
├────────────────────────────────────────────────────────────────────────────────┤
│ Dashboard (display-lg) ──────────────────────────── 2px ink rule               │
│                                                                                │
│  EVIDENCE LEDGER (eyebrow)                    │  NEW MODULE (eyebrow)          │
│  4 modules · 6 attempts · avg 81%             │  Topic                         │
│  · 2 recorded        (ruled stat band)        │  [______________________]      │
│  ─────────────────────────────────────────    │  Level  [Beginner ▾]           │
│  ◉ TypeScript generics              88% ◉     │  [Generate module]             │
│    2 d ago · recorded · 0x3f…9a ↗             │  ──────────────────────────    │
│  ◐ SQL indexes                      74% ◐     │  structuring the module▋       │
│    1 h ago · registering…                     │  trace · tier: Default         │
│  ↻ Event loop                       62% ↻     │  ──────────────────────────    │
│    5 d ago · retry scheduled                  │  PENDING (2) (eyebrow)         │
│  ┈ Zod schemas                     58% ┈      │  ▍Vite plugins — not attempted │
│    6 d ago · below 70%                        │  ▍Zod schemas — not attempted  │
│  ─────────────────────────────────────────    │  ──────────────────────────    │
│  SCORE HISTORY (eyebrow)                      │  VARK PROFILE (eyebrow)        │
│    last 6 attempts, solid teal line           │  profile: visual               │
│    with ┈┈ 70% pass ┈┈ rule                   │  adapts generation             │
│                                               │  ACHIEVEMENTS strip  4 / 9     │
└────────────────────────────────────────────────────────────────────────────────┘
```

**W3 — Module / detail / review (`/module/:id`)**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard     TypeScript generics · Intermediate · ~12 min      Focus   EN  ◐ │
├────────────────────────────────────────────────────────────────────────────────┤
│  MODULE 04 · GENERATED BY GEMINI FLASH (eyebrow)  │  EVIDENCE (eyebrow)        │
│  TypeScript generics (display-lg) ━━━ 2px rule    │  status: passed            │
│                                                   │  88% · passed (thr. 70%)   │
│  Reading column, 72ch: markdown lesson with       │  ◉ recorded · 0x3f…9a ↗    │
│  headings, code chips, tables …                   │  ──────────────────────    │
│                                                   │  Prior attempts            │
│                                                   │   62% · 5 d ago            │
│                                                   │   88% · 2 d ago ◉          │
│                                                   │  ──────────────────────    │
│  [ Start quiz — 8 questions ]                     │  VARK profile: visual      │
│                                                   │  adapts generation         │
├── quiz state (panel replaces prose) ────────────────────────────────────────── │
│  Question 3 of 8   ▐████████░░░░░░░░  teal fill, mono count                    │
│  What does `Partial<T>` produce?                                               │
│  ( ) All properties of T made optional      ← selected: teal border + 6% fill  │
│  ( ) An immutable copy of T                                                    │
│  ( ) A union of T's keys                                                       │
│  ( ) A readonly deep clone                                                     │
│                                   [← Previous]              [Next →]           │
├── results state ────────────────────────────────────────────────────────────── │
│  OUTCOME (eyebrow)     88%   · passed (threshold 70%)                          │
│  ◉ recorded · 0x3f…9a ↗ Etherscan     [Retake quiz]  [Back to dashboard]       │
│  ANSWER REVIEW (eyebrow)                                                       │
│  ┃ 1 · Correct   All properties of T made optional — explanation shown         │
│  ┃ 4 · Incorrect Your answer: B — locked · retake to unlock this explanation   │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 13. Migration map

Priority: **P0** = token/type foundation (everything depends on it) · **P1** = core screens · **P2** = secondary screens & states · **P3** = needs an open decision first. Nothing here deletes working functionality; every row preserves behaviour.

| Current page/component | Current problem | Proposed visual role | Design-system primitive | Expected behaviour preservation | Priority |
|---|---|---|---|---|---|
| `styles/globals.css` tokens (purple 262 primary, cyan accent, `hero-gradient`, `text-gradient-brand`, `focus-ring-v2`, glow shadows) | Purple-cyan gradient identity; decorative glow; triple focus ring | Token layer v3: §5 semantic colors + §7 radius/border/shadow/focus | §5, §7 | Class-based dark mode, HSL-var pipeline and Tailwind mapping stay; values swap only | **P0** |
| `tailwind.config.js` fonts + prose styles | `CardTitle` fixed `text-2xl`; display sizes up to `text-8xl` | Type scale §6 (display-lg cap, title step, outcome step) | §6 | Prose pipeline (`prose-token`) untouched except tuned values; Noto fallbacks kept | **P0** |
| Atoms: `Button`, `Card`, `Badge`, `Input`, `Select`, `Tabs`, `Tooltip`, `Toaster` | Hover glow; one universal Card; solid emoji-adjacent badges; hardcoded white in `.spinner-sm` | Retokened per §8 (ink primary, flat panels, 4px chips) | §8 | All component APIs/props unchanged; only classNames swap | **P0** |
| `HomePage.tsx` hero + 3 feature tiles + 4 step cards | Generic template hero; gradient headline; emoji tiles | C1 landing composition | P1 sample ledger, P4 marker, §4 rules | i18n keys, connect-wallet flow, auth redirect untouched; keys reused where wording matches | **P1** |
| `DashboardPage.tsx` 4 stat tiles | Identical rounded cards; colour misuse | Ruled stat band | P8 outcome figures | Stats queries + formatting logic untouched | **P1** |
| `OnChainTimeline.tsx` | Emoji markers (⛓ ⏳ ✓); decorative gutter colours | Evidence ledger | P1 ledger row, P4 marker | Stretched link, aria-labels, relative-time i18n, Etherscan links, empty state preserved | **P1** |
| `DashboardPage.tsx` generator card + stage cycle | Emoji in labels (🤖); indeterminate bar as the only feedback | Generator panel | P5 generation trace | Form, mutation, targeted invalidation, toasts untouched | **P1** |
| `ModulePage.tsx` header + focus mode | No persistent shell; focus hides everything with no rail concept | Module desk + evidence rail; focus mode kept | §4 C3 | Focus-mode localStorage key, hide/show logic, exit button untouched | **P1** |

| Current page/component | Current problem | Proposed visual role | Design-system primitive | Expected behaviour preservation | Priority |
|---|---|---|---|---|---|
| `ModulePage.tsx` prose Card | Prose inside a rounded box | 72ch reading column on the canvas (no wrapper) | §4 C3, §7 ruled section | `prose-token` classes, RTL hardening, overflow rules untouched | **P1** |
| `ModulePage.tsx` quiz (options, gradient progress bar) | Gradient bar; selected = ring+glow; Card nesting | Quiz panel | §8 progress + form controls; selected state §7 | radiogroup/aria-checked, next/prev gating, submit guard untouched | **P1** |
| `ModulePage.tsx` results + ⛓ rotating stamp + review tinted cards | Stamp decorates; review = coloured card per question | Outcome figure + P4 marker + P6 attempt review list | P8, P4, P6 | submitQuiz, polling (5s), retry mutation, locked-explanation logic untouched | **P1** |
| `Sparkline.tsx` | Gradient stroke; no threshold tag | Score history chart | P3 threshold rule | Same points/props, aria-label, empty state preserved | **P2** |
| `AchievementsGrid.tsx` | Emoji tiles, grayscale trick | Compact achievements strip (ruled rows/monochrome markers) | §8, §4 rail | `deriveAchievements` logic + tooltips + progress counts untouched | **P2** |
| `VarkPage.tsx` intro/quiz/result | Emoji styles; result inside card stack | P7 VARK profile bar + document-like result | P7 | 15-question flow, submit mutation, multimodal logic untouched | **P2** |
| `CertPage.tsx` | Gradient hero + giant gradient number + rotated stamp | Certificate document: seal, outcome figure, signer line | P4 seal, P8, P9 | Share URLs, `?lang=`, Etherscan link, not-found state untouched | **P2** |
| `ErrorBoundary.tsx`, empty states (`Sparkline`, `OnChainTimeline`), `Skeleton` usage | Hardcoded English; emoji empty states | §8 error/empty/loading patterns | §8 | Catch/reset/reload behaviour untouched; strings move to `common.json` | **P2** |
| Locale copy (`en`, `pt-BR` first) | Emoji in labels/toasts; generic phrasing | §11 rewrites | §11 | i18n keys unchanged (values change); machine-translated locales follow the existing pipeline | **P2** |
| App shell / navigation (new) | Four different hand-rolled headers | Persistent shell per §4 | §8 navigation | Routes, guards and page components unchanged; shell wraps them | **P1** |
| `public/logo.svg` + `design-system/assets/*` (gradient hexagon, node-and-line motif) | Neural-network cliché; purple gradient | Identity rework (bench/ledger mark) | §3 #7 | Favicon/header references unchanged; visual only | **P3 (open decision)** |

## 14. Acceptance criteria

Measurable checks for the eventual implementation:

1. **No purple/blue gradient identity** — zero occurrences of `hero-gradient`, `text-gradient-brand`, `shadow-glow`, or any identity gradient using hue ≥ 250 in `frontend/src/` and `frontend/public/`; the existing logo keeps its geometry and is recoloured to solid teal (§15.1); the hash grid is removed from the identity and no replacement decorative pattern is introduced (§15.8).
2. **No generic card-grid homepage** — landing uses composition C1; no `md:grid-cols-3` feature-tile row; the pipeline appears as numbered rules; a sample-ledger element built from the real primitives is present.
3. **No unsupported claims** — every sentence on `/` is verifiable against the pipeline (generation, server-side grading, 70% threshold, queue, Sepolia, public certificate); each claim traces to a feature in `README.md`; none of the §11 forbidden words appears in any locale file.
4. **Responsive behaviour** — no horizontal scroll at 1440, 1024, 768, 390px on all five routes; the shell collapses to the mobile menu < 640px; touch targets ≥ 44px; RTL (`ar`) verified on dashboard and module pages.
5. **Keyboard navigation** — every interactive element reachable by Tab in DOM order; quiz options operable inside the radiogroup with arrow keys/space; Radix tabs/menus/dialogs fully keyboard-operable; no keyboard traps outside dialogs.
6. **Visible focus states** — single 2px `--focus` ring with 2px offset on every focusable element in both themes; `focus-ring-v2` retired or redefined to the single-ring spec.
7. **WCAG AA contrast** — automated check reports no violations on the five routes in light and dark mode; body text ≥ 4.5:1, large figures ≥ 3:1.
8. **Loading, empty, error states** — each data region has all three per §8, with screenshot evidence: first-visit dashboard (skeletons), empty ledger, failed registration with Retry, render-crash fallback.
9. **Reduced motion** — with `prefers-reduced-motion: reduce` no animation runs (validated by toggling the OS setting); all state text legible without motion.
10. **No route or API regressions** — `git diff` touches nothing under `server/` or `contracts/`; routes in `App.tsx` unchanged; the frontend suite passes unchanged (`cd frontend && npx vitest run` — 49 tests; lib behaviour untouched by restyling).
11. **No new dependency** — no dependency additions in `frontend/package.json` (`lucide-react` is already declared and may now be used; anything else requires the §15 decision record).
12. **Existing tests remain green** — full suite (server 194, frontend 49, contracts 23 — current repository counts, §15.10) passes on the implementation branch.
13. **Screenshots captured** — per the README's placeholder table: `docs/screenshots/dashboard.png`, `module.png`, `certificate.png`, `vark.png` at 1440px light mode, plus 390px mobile captures of dashboard and module.
14. **Visual coherence across ≥ 3 screens** — dashboard, module page and certificate page (plus landing) share tokens, eyebrow/title pairing, ledger-row anatomy and the threshold rule, with no one-off colours or shadows.
15. **Bundle guard** — entry chunk stays under the 500 KB warning threshold (`vite.config.ts`); no chunk regresses beyond noise.

## 15. Open decisions

All nine items below were put to review and are **approved**; resolutions are recorded here with the phase that carries them. Nothing was chosen silently.

1. **Logo / wordmark** — RESOLVED, option (b): recolour the existing hexagon to solid teal, geometry unchanged; no new brand mark in this phase. Applied in P0 (`frontend/public/logo.svg`); the v2 gradient assets under `frontend/design-system/assets/` remain as historical reference.
2. **Primary button colour** — RESOLVED: solid ink.
3. **Display face** — RESOLVED: keep Space Grotesk / Inter / JetBrains Mono.
4. **Default theme** — RESOLVED: keep the system-preference behaviour; no forced default (`themeStore.ts` untouched).
5. **Terminology / copy** — RESOLVED: §11 approved, with the constraint that authored rewrites land in en + pt-BR first; es/fr/ja/ar keep their existing keys; remaining copy debt is reported (see §11 localisation note).
6. **Persistent app shell** — RESOLVED: approved; build in a later phase (not P0).
7. **Landing-page restructure (C1)** — RESOLVED: approved, including dropping the three feature tiles; implement in a later phase (not P0).
8. **Hash grid** — RESOLVED: removed from the primary identity; no replacement decorative background pattern. The `.hash-grid` helper is deleted from shared styling in P0; page-level class references become inert and are cleaned up during the page-level phases.
9. **Onboarding tour** — RESOLVED: keep it; restyle in a later phase.

---

## Recommended implementation order

1. **Tokens (P0)** — rewrite `globals.css` values to §5/§7 (colours, radii, borders, shadows, focus), update the `tailwind.config.js` type scale; remove `hero-gradient` / `text-gradient-brand` / `focus-ring-v2` usages. Structure identical, new skin.
2. **Atoms pass (P0)** — restyle `Button`, `Card`, `Badge`, `Input`, `Select`, `Tabs`, `Tooltip`, `Toaster` per §8; retire the hover glow; fix the hardcoded white in `.spinner-sm`; add `htmlFor` to the topic input.
3. **Primitives (P1 core)** — build ledger row, registration marker, threshold rule, generation trace, outcome figure as shared components; refactor `OnChainTimeline`, the generator and the stat band onto them.
4. **App shell (P1)** — persistent shell for the three authenticated pages; page-specific headers condensed into it.
5. **Module page (P1)** — reading desk, evidence rail, quiz panel, results (outcome figure, attempt review list, marker); focus mode preserved.
6. **Dashboard composition (P1)** — C2: stat band, ledger, rail order, achievements strip; §8 empty states.
7. **Landing (P1)** — C1: statement, sample ledger, numbered pipeline rules, footer; gradient field and feature tiles removed.
8. **Secondary (P2) and copy** — VARK page, certificate document, error/empty/loading polish, locale rewrites (en + pt-BR first), then the full acceptance-criteria sweep (contrast, keyboard, reduced motion, screenshots) before the PR.

---

*End of document. This file is the only artifact of this step; no code, tests, routes or configuration were modified.*
