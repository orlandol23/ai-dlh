# AI-DLH Design System — v2 "Circuit & Ink"

**AI-DLH** — *AI-Powered Decentralized Learning Hub* — é uma aplicação web de portfólio que combina IA Generativa (Google Gemini), certificação em blockchain Ethereum, e autenticação Web3 (MetaMask) num único produto de aprendizado personalizado. O usuário conecta a carteira, escolhe um tópico e um nível, e a plataforma gera módulo + quiz na hora; score ≥ 70% grava um certificado permanente na Ethereum Sepolia.

Esta pasta é o design system destilado do produto — tokens, fundamentos, UI kit e regras reutilizáveis que agentes podem seguir para produzir mais material AI-DLH.

> **Versão atual: v2 "Circuit & Ink"** (abril 2026).
> Substitui a v1 genérica "shadcn azul". Qualquer inconsistência entre este README e o código antigo do app prevalece em favor da v2.

## Fontes

Tudo aqui foi derivado de um único repositório — sem Figma, sem decks.

- **Codebase (GitHub, privado):** `orlandol23/ai-dlh`, branch `claude/implement-production-changes-01JXqiwpavgBemxhwUUfKnko`
- Espelho do frontend para referência: `_source/` neste projeto
- Arquivos-chave lidos: `frontend/src/styles/globals.css`, `frontend/tailwind.config.js`, `frontend/src/pages/{HomePage,DashboardPage,ModulePage}.tsx`, `frontend/src/components/atoms/*`, `frontend/src/lib/utils.ts`

Há uma única superfície de produto: a **AI-DLH web app** (React 18 + Vite + Tailwind + tokens shadcn-style + tRPC + Zustand). Landing/auth, dashboard e página de módulo/quiz ficam sob um só router — então existe um UI kit em `ui_kits/web/`.

## Índice

| Path | O que tem |
|---|---|
| `README.md` | Este arquivo. Contexto do produto, fundamentos de conteúdo + visuais, iconografia. |
| `SKILL.md` | Manifesto de Skill — torna a pasta usável como skill do Claude. |
| `colors_and_type.css` | Tokens completos v2: cores, type, radii, shadows, spacing, motion. Importe primeiro. |
| `fonts/` | Referências de fontes (Space Grotesk + Inter + JetBrains Mono via Google Fonts). |
| `assets/` | Logo mark hex + wordmark (SVG com gradiente roxo→ciano). |
| `preview/` | Cards HTML pequenos que alimentam a aba Design System. |
| `ui_kits/web/v2.html` | **UI kit canônico v2** — single-page React com todos os componentes, estados, dashboard redesign, dark mode. |
| `ui_kits/web/index.html` | UI kit v1 (azul/shadcn) — mantido como referência histórica. **Não use pra novo trabalho.** |
| `_source/` | Mirror read-only do codebase importado, para agentes que queiram conferir. |

## Fundamentos de conteúdo

**Idioma.** O produto é **Português (pt-BR)** — copy de página, botões, mensagens. Metadados do HTML e o README do projeto são em inglês. Ao escrever copy nova, **escreva pt-BR para superfícies do usuário** e inglês para docs de dev.

**Voz.** Informal-direta, segunda pessoa. "Conecte sua Carteira", não "O usuário deve conectar". Sem "por favor" amaciando. Frases curtas.

**Capitalização.**
- Botões: **Title Case** em português — "Conectar Carteira", "Começar Agora", "Gerar Novo Módulo", "Finalizar Quiz".
- Títulos: sentence case ou Title Case dependendo do tamanho — "Como Funciona", "Dashboard", "Meus Módulos".
- Body: sentence case.

**Tom — entusiasmado mas utilitário.** Copy celebratória existe ("🎉 Parabéns! Você foi aprovado!", "Módulo gerado com sucesso!") mas fica restrita a estados de resultado. O tom default é funcional e conciso.

**Emoji.** Usado com parcimônia, como *marcadores de status e glifos de seção*, nunca como decoração. Uso observado:
- Tiles de feature: 🤖 (IA), ⛓️ (blockchain), 📊 (progresso)
- Estados: ✅ aprovado, ❌ reprovado, 🎉 celebração, ⏳ loading, ⚠️ aviso
- Dentro do CTA: "🤖 Gerar com IA"
- Setas unicode: ← Voltar, Próxima →

Não adicione emoji em labels neutros ou nav.

**Pares de microcopy canônicos:**
- Empty state: *"Nenhum módulo ainda / Gere seu primeiro módulo com IA! ←"*
- Sucesso: *"🎉 Parabéns! Você foi aprovado! / Você atingiu a pontuação mínima de 70%"*
- Falha: *"Não foi desta vez / Você precisa de 70% para ser aprovado. Tente novamente!"*
- On-chain: *"⛓️ Registrado na Blockchain! / Seu certificado foi registrado permanentemente na Ethereum"*
- Loading: *"⏳ A IA está criando seu módulo personalizado…"*

## Fundamentos visuais v2 — "Circuit & Ink"

**Estética em uma linha.** Roxo elétrico + ciano + tipografia Space Grotesk + grid pontilhado. Comunica "IA + blockchain" com personalidade própria, sem parecer shadcn padrão.

**Cores.**
- **Primary — roxo elétrico `#7c3aed`** (var `--primary`, escala 50–900). Usado em CTAs, links, focus rings, logo, elementos on-chain. Substitui o azul `#2463eb` da v1.
- **Accent — ciano `#22d3ee`** (var `--accent`). Usado em micro-highlights, gráficos, dado numérico expressivo, tag "info".
- **Stack semântico:**
  - success `#16a34a` · warning `#d97706` (amber, não yellow) · error `#dc2626`
  - **info é ciano** (`#06b6d4`), não azul — para nunca colidir com primary
  - **on-chain é o próprio primary** (roxo) — é *o* sinal do produto
  Cada estado tem seu próprio `bg` + `border` + `fg` em `colors_and_type.css`.
- **Neutros warm** (não o slate shadcn). Escala `#fbfaf9` → `#0b0a09` com leve tom quente — afasta do "corporate SaaS".
- **Hero gradient:** `linear-gradient(135deg, #f5f3ff 0%, #ede9fe 40%, #cffafe 100%)`. Único gradiente decorativo do produto. No dark: `#130f32 → #2e1065 → #164e63`.
- **Gradiente de acento (roxo→ciano, 135°):** `linear-gradient(135deg, #7c3aed, #22d3ee)`. Usar **só** em: logo, texto-chave ("IA", "Blockchain"), stroke de sparkline. Não pintar fundos com ele.

**Tipografia — três famílias, cada uma com papel claro.**
- **Display — Space Grotesk** (500/600/700). Heros, h1/h2, números de stat grandes. Tracking `-0.02em` a `-0.04em`. Escala até 96px.
- **UI — Inter** (400/500/600/700). Body, labels, card titles, navegação.
- **Mono — JetBrains Mono** (400/500/600/700) — **expressivo**, não só código. Usar em: endereços de carteira, tx hashes, labels "ON-CHAIN" em caixa alta, stats numéricos opcionais, eyebrows de seção.
- Hero display: clamp(48px, 9vw, 96px) bold, leading 1.02, tracking −0.04em.
- H1: 48px · H2: 36px · Card title: 24px · Body: 16px/1.5 · Small: 14px muted · Caption/eyebrow: 12px mono tracking 0.18em caixa alta.

**Spacing.** Tailwind-compatível. Container `max-w-[1280px] mx-auto px-6`. Ritmo vertical `py-16` a `py-24` entre seções. Cards `p-6` internos. Gap de grid: 20–24px.

**Radii.** Base `--radius: 10px` (subiu de 8). Botões/cards/inputs compartilham via `rounded-md` / `rounded-lg`. Badges e step markers `rounded-full`. Logo é hexagonal (SVG path).

**Bordas & cards.** Pattern canônico: `border bg-card shadow-sm rounded-[10px]` com `p-6`. Hairline `hsl(var(--border))`. Sombra com **tint roxo** (não preto puro) — dá profundidade sem pesar.

**Shadows.**
- `shadow-sm` em cards parados
- `shadow-md` em hover
- `shadow-glow` (ring roxo 4px + blur 24px) em **botão primário no hover** e em cards em foco — é o detalhe que diferencia. `shadow-glow-accent` (ciano) para elementos on-chain.

**Backgrounds.**
- Landing: hero gradient diagonal + `hash-grid` por cima a 8% opacity.
- App shells: `bg-background` (neutro 25) com header `bg-background/80 backdrop-blur`.
- **Hash grid (motivo gráfico):** grade pontilhada 24×24px roxo a 8% opacity. Único padrão decorativo. Aplicar via classe `.hash-grid`. Usar em heros, cards on-chain, empty states.
- **Circuit trace:** linha diagonal tracejada roxa 2px — divisor expressivo em certificados. Classe `.circuit-trace`.

**Hover / press.**
- Botão primário: `transform: translateY(-1px)` + `box-shadow: var(--shadow-glow)`. Duração 200ms easing `(0.22, 1, 0.36, 1)`.
- Botão outline: borda troca pra roxo + texto roxo.
- Linhas de lista: `hover:bg-muted`.
- Disabled: `opacity-50 pointer-events-none`.
- Focus: anel duplo — `0 0 0 2px bg, 0 0 0 4px ring(primary)`.

**Animação.** Mais viva que v1, ainda utilitária.
- **AI streaming:** texto "digitando" caractere a caractere + caret roxo piscando (`content: '▋'`, animação `blink 1s steps(1) infinite`).
- **Blockchain stamp:** carimbo "⛓ ON-CHAIN" com keyframe `stamp-in` — scale 2→1, rotate −12°→−8°, opacity 0→1 em 600ms.
- **Skeleton shimmer:** gradiente com `animation: shimmer 1.5s linear infinite`.
- **Sparkline draw:** `stroke-dashoffset` animado em 2s.
- **Dot pulse:** bolinha pulsando em pills "live/gerando".
- **Hover glow:** botões primários ganham halo roxo.
- Sem bounces, sem confetti, sem Lottie.

**Transparência & blur.** Header usa `bg-background/80 backdrop-blur` sobre o hero. Tooltips usam `bg-card` sólido com `shadow-md`.

**Layout.**
- Container: `max-w-[1280px] mx-auto px-6`.
- Hero centralizado no desktop num grid 1.3fr / 1fr (texto à esquerda, receipt à direita).
- Dashboard v2: grid 12-col — stat tiles (4×col-3), sparkline (col-8) + conquistas (col-4), timeline (col-8) + gerar (col-4).
- Quiz: `max-w-4xl mx-auto`.

**Imagery.** O codebase não ship imagens. Use **hash-grid + tinta sólida + emoji** no lugar de hero photos. Logo é SVG hexagonal com nós + conexões — é a única "ilustração" do sistema.

**Dark mode.** First-class. Toggle no header, persistido em `localStorage`. Validar sempre — tokens semânticos têm variante `.dark`, cores hardcoded Tailwind (ex: `bg-green-50`) não funcionam em dark — use `bg-green-500/10` ou as CSS vars.

## Iconografia

**Nenhuma lib de ícones ship.** Sistema atual:
1. **Emoji como ícones** em tiles de feature e mensagens de estado — 🤖 ⛓️ 📊 ✅ ❌ 🎉 ⏳ ⚠️ 🔥 🎯 🏆
2. **Setas unicode** inline — `←` `→`
3. **SVG inline** pra loading spinner, logo hex, sparkline, identicon (conic-gradient)
4. **Logo** é um hexágono SVG com nó central + 4 nós periféricos conectados por linhas — gradiente roxo→ciano

**Regra prática ao desenhar telas novas:**
- Prefira emoji para comunicação de feature/status (combina com a voz do produto)
- Se precisar de um set real (ex: nav, affordances de form), use **Lucide via CDN** — mesma stroke weight, moderno — e sinalize a substituição ao user
- Nunca desenhe SVG de ícone à mão além dos listados acima

## Substituições & caveats

- **Fontes:** o codebase ainda não pina fontes custom — v2 adiciona Space Grotesk + Inter + JetBrains Mono via Google Fonts. Se o user trouxer fontes de marca, dropar `.woff2` em `fonts/` e atualizar `--font-display` / `--font-sans` / `--font-mono`.
- **Ícones:** sem sistema próprio. Lucide via CDN é o fallback documentado.
- **Imagery:** nenhuma no codebase. Todos os previews usam hash-grid + tinta sólida + emoji.
- **Migração v1→v2:** comece pelos tokens em `colors_and_type.css` (transforma 80% em 1h) e termine em polish de copy.

## Como usar este sistema

1. Link `colors_and_type.css` primeiro.
2. Leia as regras de voz / casing acima antes de escrever copy.
3. Para trabalho de componente, abra `ui_kits/web/v2.html` e copie o JSX — é a fonte da verdade pra hover, borda, padding, estados especiais.
4. Respeite: um gradiente decorativo (hero), um gradiente de acento (roxo→ciano, só em acentos), um motivo gráfico (hash-grid), sem SVG à mão, sem emoji em labels neutros.
5. Para dev handoff no codebase, comece pelos tokens em `colors_and_type.css` e siga com os componentes de `ui_kits/web/v2.html`.
