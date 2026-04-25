---
name: ai-dlh-design
description: Use this skill to generate well-branded interfaces and assets for AI-DLH (AI-Powered Decentralized Learning Hub) — a Web3 + Generative-AI learning platform — either for production or throwaway prototypes, slides, and mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI-kit components for prototyping. Current version is v2 "Circuit & Ink".
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick pointers

- `colors_and_type.css` — import first. All v2 tokens as CSS vars (colors, type, radii, shadows, spacing, motion) + Google-fonts import for Space Grotesk + Inter + JetBrains Mono. Includes full `.dark` theme.
- `ui_kits/web/v2.html` — **canonical v2 UI kit.** Single-page React with tokens, typography, every component (incl. Toast, Dialog, Tabs, Avatar, Skeleton, Tooltip), special states (AI streaming, blockchain stamp), dashboard redesign, and a working dark-mode toggle. Start here for new screens.
- `ui_kits/web/index.html` — **legacy v1 kit (blue/shadcn).** Kept for historical reference only. Do not copy from this for new work.
- `PLANO_IMPLEMENTACAO_V2.md` — step-by-step migration plan from v1→v2 for the real codebase. Hand to Claude Code.
- `_source/` — read-only mirror of the real codebase (`orlandol23/all` → `frontend/src/`).
- `assets/` — hex logo mark + wordmark (SVG with purple→cyan gradient).
- `preview/` — small spec cards (colors, type, components) — all refreshed to v2 palette.

## Non-negotiables (v2)

- Voice: **Portuguese (pt-BR)** for user-facing copy; second person, direct, short sentences.
- **Primary is `#7c3aed`** (electric violet). Never `#2463eb` — that was v1.
- **Accent is `#22d3ee`** (cyan). Info state uses cyan, not blue — so it never collides with primary.
- **On-chain uses primary (purple)** — it's *the* product signal.
- **Three type families, each with a role**: Space Grotesk (display/headings/big stats), Inter (UI body), JetBrains Mono (addresses, hashes, "ON-CHAIN" labels, eyebrows).
- **One decorative gradient**: the diagonal hero (`--hero-gradient`). One accent gradient (`135deg, #7c3aed → #22d3ee`) used only on logo, key text, and sparkline stroke. Do not invent more.
- **One graphic motif**: `.hash-grid` (24×24 dotted purple at 8% opacity). Use in heros, on-chain cards, empty states.
- Card pattern: `bg-card border shadow-sm rounded-[10px] p-6`. Shadow has a purple tint, not pure black.
- Button primary hover: `translateY(-1px)` + purple glow ring. It's the signature interaction.
- No hand-drawn SVG illustrations, no colored left-border accent cards, no decorative gradients beyond the two above. Emoji + unicode glyphs are the icon system; Lucide via CDN is the fallback.
- Dark mode is first-class. Always test both.
