# Plano de Implementação — AI-DLH v2 "Circuit & Ink"

Documento pra colar no Claude Code. Implementa a v2 do design system no repo `orlandol23/ai-dlh`, branch atual ou nova (`feat/design-system-v2`). Esforço estimado: **6–10 horas** bem concentradas, dependendo da profundidade em dark mode e componentes novos.

---

## Ordem recomendada

### Fase 1 — Fundações de token (1h, **alta prioridade**)
1. Trocar `frontend/src/styles/globals.css`:
   - Copiar os tokens HSL do `colors_and_type.css` (converter os hex v2 de volta pra HSL, ou aceitar hex direto — shadcn tolera).
   - Substituir `--primary: 221.2 83.2% 53.3%` → roxo `#7c3aed` (equivalente HSL `262 83% 58%`).
   - Adicionar `--accent: 188 86% 53%` (ciano `#22d3ee`).
   - Atualizar `--radius: 0.625rem` (10px em vez de 8).
   - Trocar gradiente do `HomePage`: `from-blue-50 to-indigo-100` → `from-violet-50 via-violet-100 to-cyan-100` (diagonal 135°).
2. Atualizar `frontend/tailwind.config.js`:
   - Adicionar `fontFamily: { sans: ['Inter',...], display: ['Space Grotesk',...], mono: ['JetBrains Mono',...] }`.
   - Manter o mapeamento existente de cores CSS-var.
3. Adicionar ao `<head>` do `frontend/index.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```

### Fase 2 — Motivo gráfico + logo (30min)
4. Copiar `assets/logo-mark.svg` para `frontend/public/logo.svg`. Substituir o `<div>` "AI" no header por `<img src="/logo.svg" className="w-10 h-10" />`.
5. Adicionar ao `globals.css`:
   ```css
   .hash-grid { background-image: linear-gradient(to right, rgba(124,58,237,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,58,237,.08) 1px, transparent 1px); background-size: 24px 24px; }
   .sg { font-family: 'Space Grotesk', Inter, sans-serif; letter-spacing: -0.02em; }
   .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: hsl(var(--muted-foreground)); }
   ```
6. Aplicar `className="hash-grid"` no hero do `HomePage.tsx` e nos cards de certificado do `ModulePage.tsx`.

### Fase 3 — Tipografia (1h)
7. Refatorar títulos com classe `.sg` e `font-display` do Tailwind:
   - `HomePage` hero h1: `text-5xl md:text-8xl font-bold font-display tracking-tighter`
   - Seção "Como Funciona" h2: `text-4xl font-display`
   - `DashboardPage` stats: envolver números em `<span className="font-display text-5xl font-bold">`.
8. Adicionar gradiente de texto no hero:
   ```jsx
   <span className="bg-gradient-to-br from-violet-600 to-cyan-400 bg-clip-text text-transparent">IA</span>
   ```

### Fase 4 — Dark mode (1–2h)
9. Criar `frontend/src/hooks/useTheme.ts` (pattern do v2.html — localStorage + `document.documentElement.classList`).
10. Adicionar toggle no header (Landing + App) — botão ghost com ☀️/🌙.
11. Validar cada tela: `HomePage`, `DashboardPage`, `ModulePage`, todos os cards de resultado. Ajustar cores hardcoded (ex: `bg-green-50` não funciona em dark — usar `bg-green-500/10`).

### Fase 5 — Componentes novos (2–3h)
12. Criar átomos faltantes em `frontend/src/components/atoms/`:
    - `Tabs.tsx` — underline animado.
    - `Avatar.tsx` — `conic-gradient` baseado em hash da wallet address.
    - `Skeleton.tsx` — shimmer com `animation: shimmer 1.5s linear infinite`.
    - `Tooltip.tsx` — Radix UI recomendado; `npm i @radix-ui/react-tooltip`.
13. Criar `frontend/src/components/molecules/`:
    - `Toast.tsx` + `ToastProvider.tsx` — usar `sonner` (`npm i sonner`) ou Radix. Substituir **todos** os `alert()` espalhados (Dashboard, Module).
    - `Dialog.tsx` — Radix (`npm i @radix-ui/react-dialog`). Usar no momento da assinatura MetaMask.

### Fase 6 — Estados especiais (1–2h)
14. **AI streaming** — no `DashboardPage`, quando gerar:
    - Backend já retorna tudo de uma vez? Se sim, simular streaming com `setInterval` somando 2 chars/40ms.
    - Se migrar pra Gemini streaming: usar `EventSource` ou `ReadableStream`.
    - Adicionar classe `.caret::after { content: '▋'; animation: blink 1s steps(1) infinite; }`.
15. **Blockchain stamp** — no `ModulePage`, quando `quizResult.transactionHash` chegar:
    - Animar um badge "⛓ ON-CHAIN" com keyframe `stamp-in` (scale 2→1, rotate -12°→-8°, opacity 0→1).
    - Usar `framer-motion` se quiser mais controle (`npm i framer-motion`).

### Fase 7 — Dashboard redesign (1–2h)
16. Expandir grid: de 4 tiles + form + lista → layout 12-col:
    - Row 1: 4 stat tiles (col-span-3 cada).
    - Row 2: sparkline (col-span-8) + badges de conquista (col-span-4).
    - Row 3: timeline on-chain (col-span-8) + form gerar (col-span-4).
17. Sparkline SVG inline (copiar do v2.html). Dados: `GET /api/progress/history` — backend pode retornar últimos 12 módulos com score+timestamp.
18. Timeline substitui a lista de módulos plana; cada item linka pro Etherscan via `getEtherscanUrl()`.
19. Badges de conquista — novo endpoint `/api/achievements` (pode ser derivado client-side inicialmente: streak, 90%+, etc).

### Fase 8 — Copy + polish (30min)
20. Rodar um search global por strings e padronizar conforme `Dicionário de copy` na v2.html.
21. Substituir emoji inconsistentes (usar exatamente: 🤖 ⛓️ 📊 🎉 ⏳ ⚠️ 🔥 🎯 🏆).
22. Rodar `npm run lint` e `npm run build` — garantir que Tailwind JIT pegou as novas classes (`bg-violet-*`, `font-display`).

---

## Arquivos a consultar neste projeto

| Quer… | Olhe |
|---|---|
| Tokens exatos (hex, radius, shadow) | `colors_and_type.css` |
| Paleta em swatch cards | `preview/colors-*.html` |
| Código dos novos componentes | `ui_kits/web/v2.html` (tudo inline, copiar os trechos JSX) |
| Logo SVG | `assets/logo-mark.svg`, `assets/logo-wordmark.svg` |
| Regras de voz e copy | `README.md` §Content fundamentals |
| Versão antiga do UI kit (referência) | `ui_kits/web/index.html` |

---

## Checklist de QA visual

- [ ] Landing em light **e** dark renderiza sem cores hardcoded bugadas.
- [ ] Hero tem `hash-grid` visível mas sutil (≤10% opacity).
- [ ] Gradiente roxo→ciano aparece só no texto "IA" e "Blockchain" e em elementos-chave (logo, sparkline).
- [ ] Todo número grande (stats, score de quiz) usa `font-display`.
- [ ] Endereços de carteira e tx hashes são **sempre** mono.
- [ ] Nenhum `alert()` nativo remanescente — tudo migrado pra toast.
- [ ] Focus ring é o glow roxo, não o default azul do browser.
- [ ] Botão primário em hover: `translateY(-1px)` + glow — perceptível.

---

## Dependências a instalar

```bash
cd frontend
npm i @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-tabs sonner framer-motion
```

---

## O que **não** mudar

- Estrutura de rotas (`/`, `/dashboard`, `/module/:id`).
- tRPC, Zustand, ethers.js — camada de dados fica intacta.
- Lógica de MetaMask, Gemini, Sepolia — nada na fronteira backend muda.

Só os 3 arquivos de estilo base (`globals.css`, `tailwind.config.js`, `index.html`), os 3 pages, e os novos átomos/molecules.
