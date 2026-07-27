# 🗺️ ROADMAP 100 — Checklist de Prontidão para Produção

Plano em ondas para levar o **all** (AI-Powered Decentralized Learning Hub) de
"demo sólida" a **100% pronto para produção**. Cada onda tem escopo fechado e
**critérios de pronto** objetivos — uma onda só "fecha" quando todos os seus
critérios são verificáveis (CI verde, comportamento observável, doc atualizada).

> **📌 Documento vigente:** o [PLANO_MESTRE.md](./PLANO_MESTRE.md) (assinatura
> on-chain, tiers, aprendizado adaptativo, multi-chain) substitui e absorve as
> **Ondas 3–5** deste roadmap — os itens delas foram re-sequenciados nas fases
> A/B/C/D do Plano-Mestre. Ondas 1–2 permanecem como registro histórico (✅).

Estado de referência: monorepo `frontend` (React + Vite) / `server`
(Express + tRPC + Drizzle + PostgreSQL) / `contracts` (Hardhat + Sepolia),
deploy via integrações git (Vercel + Railway).

---

## ✅ Onda 1 — Fundação de qualidade: testes do server + CI honesta (este PR)

A base de tudo: sem testes do server e com lint mascarado por `|| true`,
nenhuma onda seguinte pode ser entregue com confiança.

- [x] Suíte de testes do `auth.service` (gramática estrita da mensagem de
      login, domain binding, janela de tempo com skew, anti-replay de nonce,
      assinaturas reais com wallets efêmeras do ethers, emissão/validação de JWT)
- [x] Testes de parsing/validação da resposta da IA (JSON malformado/truncado,
      campos faltando, quiz fora do schema → erros tratados sem crash;
      adaptação VARK no prompt)
- [x] Testes do `learningStyle` router (persistência do estilo dominante,
      validação Zod de exatamente 15 respostas, autenticação)
- [x] Testes do `SlidingWindowRateLimiter` (janela desliza, reseta,
      multiusuário independente) — `vark.ts` já coberto desde o PR do VARK
- [x] CI sem `|| true`: lint dos dois workspaces obrigatório (exit 0)
- [x] `tsc --noEmit` do frontend no CI (vite build não checa tipos)
- [x] Testes unitários de server e frontend rodando no CI
- [x] Job de deploy fake (`echo`) removido; deploy real documentado
      (integrações git Vercel/Railway)

**Critérios de pronto:** pipeline inteiro verde sem nenhum passo tolerante a
falha; ~60+ testes do server passando; lint + type-check + build dos dois
workspaces com exit 0; nenhum stub enganoso no workflow.

---

## ✅ Onda 2 — Confiabilidade do fluxo principal (PRs [#20](https://github.com/orlandol23/ai-dlh/pull/20) e [#21](https://github.com/orlandol23/ai-dlh/pull/21))

Fechar os pontos onde o produto perde dados ou mente para o usuário.

- [x] **Fila/retry para escrita on-chain**: `recordCompletion` hoje é
      fire-and-forget; falha de RPC/gas = conclusão perdida. Persistir intenção
      em tabela `pending_tx`, worker com retry exponencial e idempotência
      (dedupe por `(userId, moduleId)`), status visível no dashboard
- [x] **Monitor de saldo da wallet custodial**: checagem periódica + endpoint
      de status; logar/alertar quando o saldo cair abaixo do custo estimado de
      N transações (evita descobrir wallet vazia em produção)
- [x] **Correção do `correctAnswer` no payload do quiz**: a resposta correta
      não pode viajar para o cliente antes da submissão (hoje permite gabarito
      via DevTools). Servir o quiz sem `correctAnswer`/`explanation` e corrigir
      somente server-side
- [x] **Code-splitting do bundle do frontend**: ~880 KB pré-gzip; separar
      vendors pesados (ethers, framer-motion, react-markdown) com
      `manualChunks`/`React.lazy` por rota

**Critérios de pronto:** conclusão aprovada nunca se perde (sobrevive a
restart do server e a RPC fora do ar — verificável por teste); alerta de saldo
disparando em ambiente de teste; impossível obter o gabarito pelo network tab;
chunk inicial < 300 KB gzip com rotas pesadas em lazy load.

> ✅ Critérios verificados nos PRs #20/#21 (fila com claim atômico + índice
> único de payout; monitor no `/healthz`; quiz sem gabarito no payload; entry
> de 259 KB / 82 KB gzip). Checkboxes marcados retroativamente no PR-0.5 —
> a Onda 2 fechou sem marcar este documento, o que motivou o bloco "Estado de
> execução" do PLANO_MESTRE.md.

---

## 🌊 Onda 3 — Web3 core de verdade

Substituir as partes "didáticas" do Web3 por padrões de mercado.

- [ ] **SIWE / EIP-4361**: migrar o login da gramática própria para
      Sign-In with Ethereum (mensagem padrão, libs auditadas, compatibilidade
      com carteiras/ferramentas que renderizam SIWE de forma legível)
- [ ] **Certificados NFT soulbound (ERC-5192)**: emitir certificado de
      conclusão como NFT não transferível, com metadata on-chain/IPFS
      (curso, score, data) e página pública de verificação lendo do contrato
- [ ] **Otimizações de gas do contrato**: storage packing dos structs
      (uint256 → uint32/uint64 onde couber), substituir leituras caras por
      eventos indexados, batch de gravações e/ou commit por Merkle root para
      amortizar custo de N conclusões em 1 tx
- [ ] **Migração Sepolia → Base (ou Base Sepolia → Base mainnet)**: custos de
      L2 viabilizam gravação por usuário real; atualizar RPC, addresses,
      verificação no explorer e docs

**Critérios de pronto:** login 100% SIWE (mensagem antiga rejeitada);
certificado soulbound mintável e não transferível com metadata válida
(testes de contrato cobrindo lock/transfer-revert); relatório de gas
antes/depois das otimizações no PR; contrato verificado e funcional na rede
de destino com runbook de migração documentado.

---

## 🌊 Onda 4 — Descustodializar e indexar + fusão pedagógica

Tirar o servidor do caminho do gas e dar superpoderes de leitura.

- [ ] **Account Abstraction (ERC-4337 + paymaster) _ou_ vouchers EIP-712**:
      hoje o server paga gas com wallet custodial. Caminho A: smart accounts +
      paymaster patrocinando `recordCompletion`/mint. Caminho B (mais simples):
      server assina voucher EIP-712 e o próprio usuário submete a tx que o
      contrato valida — decisão documentada com trade-offs
- [ ] **Subgraph/indexação** (The Graph ou indexer próprio): progresso,
      certificados e eventos consultáveis sem N chamadas RPC; dashboard e
      página pública de certificado lendo do índice
- [ ] **Fusão F2 — quiz adaptado por estilo VARK**: gerar variantes de quiz
      conforme `learning_style` (visual: diagramas/descrições espaciais;
      kinesthetic: cenários práticos etc.), mantendo o contrato de schema
- [ ] **Fusão F3 — prática verbal**: módulo de prática falada (Web Speech API
      para captura + avaliação pela LLM), fechando o ciclo aprender → praticar
      → certificar

**Critérios de pronto:** usuário completa o fluxo inteiro sem que o server
custodie gas do caminho crítico (ou voucher EIP-712 coberto por testes de
contrato); dashboard servido pelo índice com latência < 1s; F2/F3 atrás de
feature flag com testes dos novos prompts/parsers.

---

## 🌊 Onda 5 — Observabilidade e polish de demo

O que separa "funciona" de "dá para confiar e mostrar".

- [ ] **Sentry** (frontend + server) com release tracking e source maps
- [ ] **Alertas operacionais**: saldo da wallet (integra com o monitor da
      Onda 2), quota/erros dos provedores de IA (Gemini/Claude/Qwen),
      taxa de falha de tx on-chain
- [ ] **Uptime monitoring** dos endpoints `/healthz` e `/health` com alerta
      (UptimeRobot/BetterStack ou equivalente)
- [ ] **E2E headless no CI**: fluxo crítico (login com wallet mockada → gerar
      módulo com IA mockada → quiz → certificado) rodando em Cypress/Playwright
      headless em todo PR
- [ ] **OG image dinâmica do certificado**: link compartilhado do certificado
      renderiza preview com nome, curso e score (edge function / satori)
- [ ] **Demo polish**: seed de dados de demonstração, loading/empty states
      revisados, README com GIF do fluxo completo e links live

**Critérios de pronto:** erro em produção aparece no Sentry com release e
stack legível; cada alerta testado com um disparo provocado; e2e obrigatório
e verde no CI; preview OG validado nos debuggers do X/LinkedIn/WhatsApp;
demo executável do zero seguindo apenas o README.

---

## Como usar este documento

- Cada PR referencia a onda/itens que fecha e marca os checkboxes aqui no
  mesmo PR.
- Itens podem ser re-priorizados entre ondas, mas um item só é "pronto"
  quando seus critérios verificáveis passam — nada de checkbox por intenção.
