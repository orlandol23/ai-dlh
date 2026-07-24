# Plano-Mestre — all (AI-DLH)

> Status: **VIGENTE na main** (PR #22) — em execução PR a PR. Revisões R1–R4 + correções de gestão (PR-0.5) aplicadas.

## Estado de execução (fonte da verdade)

> Regra (herdada do ROADMAP): **nada de checkbox por intenção** — o status de um item só muda no PR que o conclui (com link) ou por decisão datada em "Decisões durante a execução".

_Atualizado em: 2026-07-24_

| Item | Status | Referência |
|---|---|---|
| PR-0 — Plano-Mestre na main | ✅ | [#22](https://github.com/orlandol23/all/pull/22) |
| PR-0.5 — correções de gestão do plano | ✅ | [#26](https://github.com/orlandol23/all/pull/26) |
| C1 — Sentry front+server | ✅ | [#23](https://github.com/orlandol23/all/pull/23) |
| Órfão resgatado: stats do dashboard | ✅ | [#24](https://github.com/orlandol23/all/pull/24) |
| Órfão resgatado: legibilidade do módulo | 🔄 PR aberto | [#25](https://github.com/orlandol23/all/pull/25) |
| C1b — Slither + gas-gate no CI | ⬜ | — |
| Fase 1 — A1–A7 | ⬜ | — |
| Fase 2 — B1–B7 | ⬜ | — |
| Fase 3 — C2–C8 | ⬜ | — |
| Fase 4 — D1–D3 | ⬜ | — |

**Pendências imediatas fora do código (dono):**
- 🔴 **Rotacionar/remover o usuário MongoDB Atlas do aprendaMais** — secret em histórico público é incidente ativo, não "ajuste menor" (~15 min).
- Arquivar o repositório aprendaMais (FUSION Fase 4): README de redirecionamento + estado `archived` — fechar junto com a rotação acima.
- Fiscal BR: receita em cripto tem obrigação acessória (IN 1888) — lembrete não-técnico.

**Nomenclatura (sem colisões):** PRs de execução = `C1/C1b, A1–A7, B1–B7, C2–C8, D1–D3`. Especificações técnicas = **E0–E5**. Bloqueadores das revisões R1–R4 = **RB\*** (ex.: RB4 = creditar o signatário). As invariantes A5/A6 do Passo 0 têm o nome do PR que as implementa.

### Decisões durante a execução

| Data | Decisão |
|---|---|
| 2026-07-24 | **A7 passa a depender de B1+B5** (telemetria+tutor): o go-live não vende features inexistentes — no lançamento, premium = modelo top + quotas + tutor. |
| 2026-07-24 | **C6a (smoke E2E)** extraído do C6 e promovido a gate do A7 — o gate precisa fechar **antes** do evento irreversível (mainnet), não depois. |
| 2026-07-24 | **C1b (Slither + gas-gate)** extraído do A4 — CI de segurança antecipada já roda contra o `LearningProgress.sol` atual e destrava o A4. |
| 2026-07-24 | **A6 fatiado em A6a/A6b/A6c** (fluxo core / onramp fiat / i18n+QA RTL); o onramp pode deslizar para pós-go-live sem bloquear o A7. |
| 2026-07-24 | Seções renumeradas **E0–E5** e bloqueadores de revisão renomeados **RB1/RB4/RB6** (colisão de IDs eliminada). |

## Changelog desta revisão (o que mudou vs. versão anterior)

**Correções factuais:** Slither/gas-gate são trabalho NOVO (não "já existem"); `fugu.provider` reusa o qwen só na estrutura (endpoint/body diferentes); Gemini free tier corrigido de "~1.500/dia" para **250 RPD por projeto** (orçar como pago); Fugu **via API oficial desde o dia 1** (assinatura pessoal viola ToS e não economiza); PR #21 **já mergeado**; `LearningProgress.sol` atual grava no endereço custodial (não do usuário) → não reaproveitar no C4.

**Bloqueadores de design corrigidos:** preço agora é `mapping(planId → {weeks, priceUsdc})` (US$ 1,99/sem e US$ 6,99/4-sem exatos, sem resíduo); quota mensal e saldo PAYG movidos para **Postgres com UPDATE condicional atômico** (in-memory era paywall fictício); permit/EIP-3009 creditam o **signatário**, nunca `msg.sender`; C4 vira **fila multi-chain** de verdade; COGS de pior caso recalculado e quotas dimensionadas por ele.

**Contrato endurecido:** EIP-3009 como caminho principal; `maxTotal` anti-front-run; USDC nativo Base fixo + validação em runtime; domain EIP-712 lido do contrato + fork test; **owner = multisig Safe**; cap de prepay; eventos com `payer indexed`.

**Sequência:** **C1 (Sentry) sobe para antes do A1**; A4 deploya em Base Sepolia cedo (paralelo a A2/A3); C4/C5 dependem de wallet provada.

**R4 (review final do dono):** resolvida a contradição meta×tabela do COGS — **opção (a)**: modelo top capado em **30/mês** (excedente roda em Gemini com badge; premium nunca bloqueia) + meta reescrita honestamente (típico ≤ ~40%; pior caso absoluto ≤ preço — nunca prejuízo por assinante). Cosméticos: quiz/h e retry/h devolvidos à tabela única de quotas; eventos do contrato listados por completo.

---

## Passo 0 — Vínculo wallet↔usuário (ARBITRADO com o código)

**Pergunta:** o login já prova posse da wallet por assinatura? → **SIM (confirmado).**
Evidência: `server/services/auth.service.ts` — `authenticateWithSignature` faz `web3Service.verifySignature(message, signature, normalizedWallet)` (~linha 122), com match de endereço declarado, **domain binding**, janela de tempo (±skew) e **nonce anti-replay atômico** por índice único `(nonce, wallet)`. `users.walletAddress` é UNIQUE.

**Consequências registradas:**
- **SIWE fica em C3 (padronização, não bloqueador).** Spoofing de wallet não é furo hoje.
- **Invariante A5:** `billing.getPlan/refresh` recebem **input vazio** — a wallet vem exclusivamente de `ctx.user.walletAddress` (padrão de `web3.router.ts`). Nunca aceitar wallet do cliente.
- **Invariante A6:** bloquear compra se a wallet **conectada** ≠ wallet **autenticada** (ou rotear para `subscribeFor(walletAutenticada)`). Travar troca de wallet do usuário enquanto houver plano ativo/créditos pendentes.
- **C4/C5:** o mint do certificado usa a wallet **provada** do usuário como destinatário.

---

## Contexto

Transição de carreira do dono para Web3. O **all** é o produto principal: Hub de conhecimento adaptativo (a IA analisa o estilo VARK e se adapta para ensinar melhor) com **tiers pagos** — free continua ótimo; premium tem vantagem clara (modelo de IA superior, quotas maiores, features exclusivas, certificado NFT premium).

### Decisões do dono
1. **Cobrança**: crypto on-chain, USDC na **Base**, via smart contract — com **assinatura (semanal/mensal)** E **PAYG por créditos** (para quem só quer testar).
2. **Premium**: modelo premium + quotas maiores + tutor conversacional + prática verbal + trilhas + certificado NFT premium.
3. **Chains**: **free continua em Sepolia** (custo zero, "test drive" honesto); pago na **Base**; **Solana** (cNFT/Anchor) como fase futura, alinhada ao estudo de Rust do dono.
4. **Prioridade**: `all` primeiro, até o plano completar; boxing depois (plano separado); swiss-defi/portfolio pausados.
5. Fugu (Sakana) via **API oficial** desde o dia 1 — nunca a assinatura consumer pessoal (viola ToS e não economiza).

### Princípio inegociável
**Free nunca piora.** Premium degrada com transparência (badge do provider realmente usado).

## Estado atual verificado (origin/main)

### all (Ondas 1-2 concluídas; **PR #21 já mergeado** — quiz server-side + code-splitting no topo da main)
- Login por assinatura (Passo 0). `users.preferred_tier` ligável de graça via `auth.router.updatePreferences` — ponto de enforcement.
- Router multi-provider (`server/services/providers/router.ts`): premium→Claude Sonnet, default→Gemini Flash, `region==='cn'`→Qwen; fallback cross-vendor; prompt comum (`prompt-builder.ts`) já injeta VARK.
- Rate limiting in-memory por env (`rate-limit.ts` / `trpc.ts`): generate 10/h, quiz 30/h, retry 10/h. **Reset a cada redeploy** — aceitável para janela de 1h, NÃO para 30 dias.
- Fila on-chain (`blockchain-queue.service.ts`) com claim atômico e 1 payout/user+module; **conhece UMA chain** (`env.ts`: um RPC/PRIVATE_KEY/CONTRACT_ADDRESS; um `Web3Service`).
- `LearningProgress.sol`: grava tudo em `msg.sender` (wallet **custodial**, não do usuário), `string` + array unbounded. **Não reaproveitar no C4.**
- CI (`ci.yml`): `test-contracts` roda Hardhat, **mas NÃO tem Slither nem gate de gas** — ambos são trabalho novo. `hardhat-gas-reporter` (1.0.9) está presente mas é opt-in (`REPORT_GAS`) e só imprime tabela.
- Sem nenhum código/tabela de billing.

### boxing — fora deste plano (ver "Fora do escopo").

---

# A. Sistema de assinatura + PAYG on-chain (núcleo novo)

## E0 — Estratégia de chains

| Tier | Chain | Certificado | Gas real |
|---|---|---|---|
| **Free** | **Sepolia (como hoje)** | UI rotula "certificado de demonstração (testnet)" | **US$ 0** (faucet) |
| **Premium / PAYG** | **Base mainnet** | NFT soulbound ERC-5192 verificável, no endereço provado do usuário | US$ 0,01–0,05/mint |
| **Futuro (Fase 4)** | **Solana** (Anchor/Rust) | cNFT Bubblegum: ~US$ 0,0001/mint | desprezível |

Coluna `chain` (`'sepolia'|'base'|'solana'`) entra em `progress_records` **no C4** (migrations livres a partir da 0005) — Solana depois não exige migração de schema.

## E1 — Contrato `SubscriptionManager.sol` — Base mainnet, USDC nativo

**Assinatura + créditos PAYG no mesmo contrato.** OZ 5: `Ownable2Step` + `Pausable` + `SafeERC20`. **Sem ReentrancyGuard** (USDC sem hooks, nenhum ETH; CEI basta).

### Preço por plano (corrige a tabela — RB1)
```solidity
struct Plan { uint32 weeks; uint256 priceUsdc; }   // priceUsdc em unidades de 6 casas
mapping(uint8 => Plan) public plans;               // plans[1]={1, 1_990_000}  → US$ 1,99 / 1 semana
                                                    // plans[2]={4, 6_990_000}  → US$ 6,99 / 4 semanas (28 dias)
uint256 public pricePerCredit;                      // ex.: 500_000 = US$ 0,50
```
Rótulo honesto na UI: **"4 semanas (28 dias)"**, nunca "1 mês" (12×4 sem = 48 sem ≠ 52). US$ 6,99 < 4×1,99 **já é** desconto de pacote embutido.

### Storage (packing)
```solidity
IERC20 public immutable usdc;                       // imutável, sem SSTORE
struct Subscription { uint64 expiresAt; uint8 planId; }   // 1 slot
mapping(address => Subscription) public subscriptions;
mapping(address => uint32) public creditsPurchased;       // TOTAL CUMULATIVO (nunca decrementa; consumo é off-chain)
```

### Funções (todas com `maxTotal` anti-front-run — sem timelock no setPrice)
- `subscribe(uint8 planId, uint32 qty, uint256 maxTotal)` — cobra `plans[planId].priceUsdc * qty`; `require(total <= maxTotal)`; renovação estende de `max(now, expiresAt)`; **cap** `newExpiresAt <= now + 104 weeks`.
- **`subscribeWithAuthorization(...)` (EIP-3009 `receiveWithAuthorization`) — CAMINHO PRINCIPAL**: single-call, imune a front-running/griefing de nonce (nonce aleatório de 32 bytes; melhor UX multi-abas). Credita o **`from`** (signatário), exige `to == address(this)`.
- `subscribeWithPermit(...)` (EIP-2612) — **fallback**, com `try usdc.permit(...) catch {}` + checagem de allowance antes (evita griefing de nonce). Credita o **`owner`** (signatário).
- `subscribe(...)` puro (approve+subscribe) — fallback final para wallets sem assinatura tipada.
- `subscribeFor(beneficiary, planId, qty, maxTotal)` — presente/patrocínio/venda assistida.
- `purchaseCredits(uint32 credits, uint256 maxTotal)` + `purchaseCreditsWithAuthorization` + `purchaseCreditsFor(beneficiary, ...)` — **PAYG**; incrementa `creditsPurchased[dest]`; emite `CreditsPurchased(account indexed, payer indexed, credits, amount)`.
- `setPlan(planId, weeks, price)` / `setPricePerCredit` (onlyOwner) · `withdraw(to)` · `pause()/unpause()` (só bloqueia vendas; leituras nunca).
- Views: `isActive(address)`, `getSubscription(address)`, `creditsPurchased(address)`, `plans(id)`.

**Eventos (lista completa — transparência sem timelock, barata):**
`Subscribed(address indexed account, address indexed payer, uint8 planId, uint32 qty, uint64 newExpiresAt, uint256 amountPaid)` · `CreditsPurchased(address indexed account, address indexed payer, uint32 credits, uint256 amountPaid)` · `PlanUpdated(uint8 indexed planId, uint32 weeks, uint256 priceUsdc)` · `PricePerCreditUpdated(uint256 oldPrice, uint256 newPrice)` · `Withdrawn(address indexed to, uint256 amount)` · `Paused/Unpaused` (herdados de Pausable).

**REGRA CRÍTICA (RB4):** todo caminho assinado credita o **signatário** (`from`/`owner`), nunca `msg.sender` (pode ser relayer). Teste obrigatório: **"relayer submete a tx, signatário recebe a assinatura/créditos"**.

**Fora de escopo v1 (decisões certas):** ETH nativo, refund, auto-renovação pull (allowance infinita = anti-pattern), proxy upgradeable.

**Nota de passivo (corrige o invariante):** `withdraw` saca 100% do USDC, mas **créditos são passivo pré-pago** — o invariante correto é "créditos consumidos ≤ comprados" (vive no **servidor**, testado no A5), NÃO "saldo do contrato == vendas − withdraws".

### Orçamento de gas (METAS a validar no gas-reporter, não fatos)

| Função | Gas alvo | Notas |
|---|---|---|
| `subscribe`/renovação | ~75–95k | 1 SSTORE quente (slot packed) + transferFrom + evento |
| `subscribeWithAuthorization` | ~110–140k | 3009 embute a autorização; elimina a tx de approve |
| `purchaseCredits*` | ~70–90k | 1 SSTORE + transferFrom + evento |
| views | 0 (`eth_call`) | é o que o server consulta |
| Mint ERC-5192 (C4) | ~100–140k | storage packed (`score uint16`+`timestamp uint64`+`topicHash bytes32`); metadata via `tokenURI` (IPFS); histórico via eventos indexados; **sem ERC721Enumerable**; soulbound = revert no transfer |

Regras p/ todos os contratos: custom errors, `calldata`>`memory`, `immutable`/`constant`, `unchecked` só com prova, CEI, eventos `indexed` certos.

### Segurança/tooling — TUDO NOVO, entregue em C1b + A4 (corrige "já existe")
- **Adicionar Slither ao CI** (job novo em `ci.yml`).
- **Gate de regressão de gas**: job de CI que commita/diffa `gasReporterOutput.json` como artifact (ou `forge snapshot` + action de gas-diff) — o "snapshot por PR via Codechecks" mencionado antes **não existe mais**; nomear a ferramenta escolhida no PR.
- **USDC nativo da Base fixo**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`; **nunca USDbC** (bridged, sem permit). Validar em runtime `decimals()==6` + `symbol()`.
- **Domain EIP-712 vem do contrato, nunca hardcoded**: o USDC da Base usa `{name:'USD Coin', version:'2', chainId:8453}` — a UI que disser só "USDC" quebra **100%** das assinaturas. Frontend lê `name()`/`version()`/`DOMAIN_SEPARATOR()`/`nonces()`. **Fork test** contra o USDC real da Base Sepolia validando que a assinatura passa (pega o bug que derruba o 1-tx silenciosamente).
- **Owner mainnet = multisig (Safe) ou hardware wallet**, nunca EOA quente (`withdraw`+`setPrice` = chave de altíssimo valor). Entra no runbook.
- `hardhat.config.ts`: adicionar redes `base`/`baseSepolia` + Basescan API key (verify) + `evmVersion` explícito; avaliar bump do solc 0.8.20 → 0.8.2x recente antes de um contrato que segura dinheiro.
- Nota: permit/3009 do USDC aceitam **ERC-1271** → funciona com Coinbase Smart Wallet (relevante na Base).

### Checklist de verificação manual do dono
Ownable2Step · SafeERC20 · sem reentrância (CEI mesmo assim) · Pausable kill-switch · sem loop unbounded/selfdestruct/delegatecall/assembly · `unchecked` só com prova · fuzz/invariantes: `expiresAt` nunca diminui, `creditsPurchased` monotônico, prepay ≤ 104 semanas · deploy testnet → **revisão manual do dono** → mainnet (owner=Safe).

## E2 — Verificação server-side do plano

**Leitura RPC on-demand + cache em coluna com TTL** (rejeitados listener/subgraph). `server/services/billing.service.ts`:
- `getPlan(user)` — **input vazio; wallet só de `ctx.user.walletAddress`** (invariante A5). Cache no DB (`BILLING_SYNC_TTL_MS`, default 10 min); expirado → `eth_call subscriptions(wallet)` na Base e persiste.
- **Ponto único de escrita do cache** (`syncPlanFromChain`), usado por login e por `billing.refresh`.
- **Distinguir erro de transporte** (RPC fora → stale-while-error, NUNCA rebaixa) **de resposta válida "sem assinatura"** (→ downgrade com re-leitura 1x antes de confirmar).
- Hot path: `resolveEffectiveTier` **nunca bloqueia a geração em RPC** — stale-while-revalidate fire-and-forget (com `.catch`, precedente `auth.service.ts`).
- `plan_tx_hash`: `eth_call` não retorna tx — ou o **frontend envia o hash e o server valida o receipt**, ou tratar como campo informativo não-confiável.
- Observabilidade dentro do A5: alerta de falhas RPC consecutivas; idade de `plan_synced_at` exposta no `/healthz`; teto de staleness documentado.
- **Downgrade gracioso**: expirou → `free`; modelo volta a Gemini; quotas free; módulos/certificados/histórico intactos; tutor/trilhas ficam read-only com CTA. `BILLING_GRACE_HOURS` (default 0).

## E3 — Modelo de dados + quotas

Migration `0005` em `users`: `plan` (default 'free'), `plan_expires_at`, `plan_synced_at`, `plan_tx_hash`. `preferredTier` continua = preferência de modelo DENTRO do plano. Novo `server/services/entitlements.ts`: `resolvePlan(user)`, `resolveEffectiveTier(user)`.
**Critério de aceite (grep no review):** nenhuma leitura crua de `preferredTier` fora de `entitlements.ts` (hoje `ai.router.ts:61` lê cru — corrigir). Definir precedência **`cn` vs `premium`** (hoje `region==='cn'` ganha → um pagante em região cn receberia Qwen; decidir).

Gates: `updatePreferences` premium sem plano = `FORBIDDEN 'PLAN_REQUIRED'`. Flag `BILLING_ENFORCED` (default false até go-live; legados premium-grátis resolvem `default` quando ligar — changelog).

### Quotas (dimensionadas por COGS de pior caso — RB6, ajuste R4)

| Quota | Free | Premium | Semanal (=¼ das mensais) |
|---|---|---|---|
| generate/h | 10 | 50 | 50 |
| **generate/mês (total)** | **30** | **100** | 25 |
| — **dos quais com modelo top** | 0 | **30** (excedente roda em **Gemini com badge** — premium **não bloqueia**, só troca o modelo com transparência) | 8 |
| quiz/h | 30 | 150 | 150 |
| retry/h | 10 | 30 | 30 |
| tutor msgs/dia | 0 | 100 | 25 |
| **tutor msgs/mês** | 0 | **500** | 125 |
| trilhas/mês | 0 | 10 | 2 |

(Limites HORÁRIOS são guarda anti-abuso e não variam entre semanal/mensal; só as franquias mensais escalam.)

- Excedente premium de generate (além dos 30 top) → Gemini com badge, ou consome crédito PAYG se o usuário preferir modelo top.
- Tutor roteia para **Haiku 4.5** (mais barato) por padrão; Claude Sonnet só se a conversa exigir.
- **Quotas MENSAIS vão para Postgres** (não in-memory): tabela `usage_counters(user_id, metric, period 'YYYY-MM', count)` com `UNIQUE(user_id, metric, period)`; consumo em **um único statement atômico** `INSERT ... ON CONFLICT DO UPDATE SET count = count+1 WHERE count < $max RETURNING` (precedente: claim atômico da fila `blockchain-queue.service.ts`, índice parcial `schema.ts`). Horária continua no SlidingWindow in-memory. `rate-limit.ts`: `consume(key, maxOverride?)`; `trpc.ts`: `max` como função; log usa o **max efetivo**.

## E4 — Router de modelo por plano + provider Fugu

`server/services/providers/fugu.provider.ts` — reusa do `qwen.provider.ts` **só a estrutura** (classe/axios/Zod). ⚠️ o qwen usa DashScope nativo (`/services/aigc/text-generation/generation`, body `{input:{prompt}}`), NÃO OpenAI-compatible — o endpoint/body/parse do Fugu (`/chat/completions`, `response_format: json_object` com fallback) são diferentes. Envs `SAKANA_API_KEY`/`SAKANA_BASE_URL`/`FUGU_MODEL`. **Timeout curto + circuit breaker agressivo** (fallback só funciona com timeout curto).

Flag `PREMIUM_PROVIDER=claude|fugu` (**Claude default**, estável e com caching garantido; Fugu atrás de flag). Premium só roteia Claude se `ANTHROPIC_API_KEY` setada (refletir no runbook). Roteamento: `cn→qwen | premium→(flag) | senão→gemini`; fallbacks preservam "free nunca piora"; badge do provider no módulo; alerta se degradação premium >5%/dia.

## E5 — UX de upgrade (frontend — ethers v6 existente, sem wagmi)

- `/plans` (lazy): cards Free/Premium/PAYG, preços/domain **lidos do contrato**, seletor semanal(planId 1)/mensal(planId 2)/créditos.
- `lib/subscription.ts`: 3009 `receiveWithAuthorization` (1 tx) → fallback permit → fallback approve+subscribe. Estados: rede/saldo → assinar (**exibir claramente o valor assinado — anti-phishing**) → tx (link Basescan) → `billing.refresh(hash)` → premium.
- **Invariante A6:** bloquear compra se wallet conectada ≠ autenticada (ou `subscribeFor(autenticada)`).
- **Onramp fiat→USDC de primeira classe** (Coinbase Onramp na Base: Apple Pay/cartão → USDC), não só link — checkout crypto-only esmaga conversão de público edtech. Instrumentar **drop-off da `/plans` desde o dia 1**; a projeção de 10% de conversão é otimista → revisar OU assumir público cripto-nativo.
- QA de **RTL para `plans.json` em árabe**. i18n ×6; chaves `PLAN_REQUIRED`/`MONTHLY_QUOTA_EXCEEDED`.

# B. Loop de aprendizado adaptativo v2

**FREE:** VARK + dificuldade progressiva + reforço de conceitos fracos. **PREMIUM:** trilhas, tutor, prática verbal.

- **B1 Telemetria** (migration `0006`): `learning_events` (por quiz: topic, level, score, `weakConcepts`, `timeSpentSeconds` clamp 0..7200) + `topic_mastery` (EWMA, `nextReviewAt`/`reviewStage` 1d/3d/7d/14d/30d). Quiz schema ganha `concept` **opcional** por questão. Coleta no `submitQuiz`.
- **B2 Prompt adaptativo (free):** `adaptive.service.ts` monta `performanceContext` (exposição prévia, média, conceitos errados → "re-explicar por outro ângulo + 2 questões dirigidas"). avg≥85→"stretch"; <60→"scaffolding". Nunca sobrescreve `level`; não muda o JSON.
- **B3 Insights (free):** `learning.getInsights` + card "revisar agora" no Dashboard.
- **B4 Quiz por estilo (free, F2 FUSION).**
- **B5 Tutor (premium):** `tutor.*` + `tutor_sessions`/`tutor_messages`; contexto = módulo + N msgs com **prompt caching** (Claude garantido; Fugu verificar); middleware `requirePlan('premium')`; quota diária+mensal. **Auditar cache na prática** (`usage.cache_read_input_tokens > 0`) — sem cache real custa 2–3×.
- **B6 Trilhas (premium):** `path.*` + `learning_paths`; **pré-gerar steps via Batch API da Anthropic (−50%)** (batch serve para pré-geração, não para geração interativa).
- **B7 Prática verbal (premium, F3).**

# C. Sequenciamento em PRs (P ≤1d · M 2-4d · G ~1sem)

**C1 (Sentry) sobe para o INÍCIO da Fase 1**, antes do A1: stale-while-error e fire-and-forget escondem falhas por design; sem observabilidade, no go-live não se distingue "billing ok" de "RPC quebrado há uma semana".

## Fase 0 — Observabilidade
| PR | Escopo | Esf. |
|---|---|---|
| C1 | Sentry front+server (release/sourcemaps) — cobre Fases 1-2 inteiras | P |
| C1b | **Slither + gate de regressão de gas no CI** (extraído do A4) — já roda contra o `LearningProgress.sol` atual e destrava o A4 | P |

## Fase 1 — Receita
| PR | Escopo | Esf. | Dep. | Pronto quando |
|---|---|---|---|---|
| A1 | Provider Fugu (endpoint próprio) + flag `PREMIUM_PROVIDER` + timeout/circuit-breaker + fallback + testes HTTP-mock | M | C1 | módulo real via Fugu em staging; `provider` gravado |
| A2 | Migration 0005 + `entitlements.ts` + gate `PLAN_REQUIRED` + `resolveEffectiveTier` (grep: zero leitura crua de preferredTier) — atrás de `BILLING_ENFORCED=false`; decidir cn×premium | M | — | flag off = idêntico; flag on = FORBIDDEN sem plano |
| A3 | Quotas por plano: horária (in-memory) + **mensal DB-backed** (`usage_counters`, UPDATE atômico) | M | A2 | tetos por plano; free inalterado; mensal sobrevive a redeploy (teste) |
| A4 | `SubscriptionManager.sol` (planos+PAYG, 3009+permit, maxTotal, owner=Safe) + fork test USDC + deploy/verify **Base Sepolia** + runbook (incl. **rollback**: playbook de `pause()`, migração de contrato honrando `subscriptions`/`creditsPurchased` do antigo, refund manual via `withdraw`) | G | C1b | orçamento de gas batido no gate do C1b; **checkpoint de revisão manual do dono** |
| A5 | `billing.service.ts` (wallet só do ctx; transporte×"sem assinatura"; ponto único de escrita) + `billing.refresh(hash→receipt)` + **consumo PAYG atômico** (UPDATE condicional, débito antes do provider + estorno em falha, idempotência) + validação vs `creditsPurchased` confirmado + ingestão on-chain (polling da view + diff persistido) + saúde no /healthz | M | A2,A4,C1 | subscribe/purchaseCredits refletem no DB; double-spend impossível sob concorrência (teste); re-check antes de rebaixar |
| A6a | `/plans` core: 3009→permit→approve; **valor assinado visível** (anti-phishing); wallet match (invariante A6); saldo/plano no perfil + banners; **ToS + política de reembolso**; drop-off instrumentado | M | A4,A5 | fluxo completo Base Sepolia <30s (pt-BR/en) |
| A6b | Onramp fiat→USDC (Coinbase Onramp na Base: Apple Pay/cartão) — **pode deslizar p/ pós-go-live** | M | A6a | compra fiat em staging |
| A6c | i18n ×6 da `/plans` + QA RTL (ar) — exige **revisão humana** das traduções de máquina; go-live mínimo aceitável: pt-BR/en | M | A6a | QA 6 idiomas OU escopo reduzido documentado no changelog |
| C6a | **Smoke E2E** (Playwright: login→generate→quiz + `/plans` com chain mockada) rodando em todo PR | M | A6a | verde no CI; **gate do A7** |
| A7 | Go-live: deploy Base mainnet (owner=Safe, pós-revisão) + `BILLING_ENFORCED=true` + quotas mensais + changelog legados | P | A1–A5, A6a, **B1, B5, C6a** | 1º pagamento real; smoke E2E verde; kill-switch de rollback (`BILLING_ENFORCED=false`) documentado |

**Esforço somado (honesto):** Fase 1 + B1/B5 ≈ 25–33 dias úteis focados — **~3 meses em ritmo part-time**. Plano completo (Fases 1–3) ≈ 4–6 meses. **Marco intermediário demonstrável:** A1–A3 + B1 + B2 (adaptativo free melhorado) já tem valor de portfólio mesmo se o billing atrasar — não existe cenário em que meses de trabalho fiquem sem nada mostrável.

## Fase 2 — Adaptativo (intercalável a partir do A2; **B1+B5 são gate do A7**)

| PR | Escopo | Esf. | Dep. | Pronto quando |
|---|---|---|---|---|
| B1 | Telemetria (migration 0006: `learning_events` + `topic_mastery`) + coleta no `submitQuiz` | M | A2 | quiz grava eventos e mastery (teste) |
| B2 | Prompt adaptativo free (`adaptive.service.ts`, `performanceContext`) | M | B1 | snapshot tests do prompt + verificação manual (histórico bom×ruim) |
| B3 | Insights free (`learning.getInsights` + card "revisar agora") | P | B1 | card no Dashboard com dados reais |
| B4 | Quiz por estilo VARK (F2 da FUSION) | M | — | variante por estilo validada pelo schema |
| B5 | Tutor premium (`tutor.*` + `tutor_sessions`/`tutor_messages`; **prompt caching auditado**) | **G** | A2, A3, B1 | `usage.cache_read_input_tokens > 0` comprovado; quotas diária+mensal aplicadas |
| B6 | Trilhas premium (`path.*` + `learning_paths`; pré-geração via Batch API −50%) | M–G | B2, B5 | trilha pré-gerada em batch e navegável |
| B7 | Prática verbal premium (F3 da FUSION, Web Speech API) | M | B5 | prática funcional em Chrome/Edge com fallback gracioso |

## Fase 3 — Web3 core + ops
| PR | Escopo | Esf. | Dep. |
|---|---|---|---|
| C2 | Alertas: gas das wallets custodiais **por chain** + **saldo USDC do contrato** (lembrete de withdraw) + degradação de provider + falha de tx + **uptime monitoring externo** de `/healthz` (UptimeRobot/BetterStack) | M | C1 |
| C3 | SIWE/EIP-4361 (padronização) | M | — |
| C4 | **Fila multi-chain**: destino (chain+contrato+tipo) gravado no **enqueue** conforme plano; 2º `Web3Service` (RPC/wallet Base + ABI ERC-5192); regra p/ plano que expira entre enqueue e processamento; coluna `chain`; `LearningCertificate.sol` ERC-5192 soulbound com `mint(to=wallet provada)` restrito ao minter custodial; `/cert` dual-chain (Sepolia legado verificável); gas report — **entregar em 2 PRs**: C4a (contrato ERC-5192 + testes de soulbound) e C4b (fila multi-chain + `/cert`) | G | A4, Passo 0 |
| C5 | Certificado NFT **premium** (metadata/arte no tokenURI) + **pinning IPFS/Arweave** | M | C4,A5 |
| C6b | Suíte E2E completa (Playwright: cert público, retries, i18n) — expande o smoke C6a | G | C6a |
| C7 | OG image do certificado + demo polish | M | C4 |
| C8 | ERC-4337/vouchers + subgraph — **adiado até volume** | G | C4 |

## Fase 4 — Multi-chain Solana (quando o dono estiver confortável em Rust)
D1 (formaliza `CertChain`, se preciso; a coluna `chain` já veio no C4) · **D2** (programa Anchor/Rust de cNFT Bubblegum na Solana ~US$ 0,0001/mint + writer `@solana/web3.js` + `/cert` triple-chain — ótimo projeto de aprendizado de Rust) · D3 (opcional: pagamento em USDC-SPL).
**Solana é viável e recomendada como fase futura** — mint ~100× mais barato que a Base; não fazer antes por dobrar superfície de teste/ops sem volume que justifique.

---

# D. Cálculo de custo honesto (base do preço)

## Custo unitário por ação (tabelas públicas; reconferir por trimestre)

| Ação | Recurso | Custo honesto |
|---|---|---|
| Módulo FREE | **Gemini Flash-Lite** (free tier é só **250 RPD/projeto**, compartilhado — tratar como pago acima disso) | ~US$ 0,0026/módulo |
| Certificado FREE | Sepolia | US$ 0 (faucet) |
| Módulo PREMIUM (Claude Sonnet 5) | preço introdutório **US$ 2/US$ 10 até 31/08/2026**; tokenizer ~+30% tokens | **~US$ 0,10–0,12/módulo** (conservador pós-agosto) |
| Módulo PREMIUM (Fugu Ultra) | US$ 5/US$ 30 | ~US$ 0,19 (**2× o Claude** — por isso Claude é default) |
| Certificado PREMIUM (mint Base) | ~120k gas | US$ 0,01–0,05 |
| Tutor: conversa (10 msgs, Haiku + cache real) | — | ~US$ 0,02–0,05 (**se o cache funcionar** — auditar) |
| Trilha (pré-gerada em Batch, −50%) | — | ~US$ 0,02 |
| Verificação de plano | `eth_call` | US$ 0 |
| Infra fixa (Railway+Postgres+**backup**) | — | US$ 10–20/mês |

## COGS de pior caso e dimensionamento (matemática fechada — R4)

Sem tetos mensais, um premium de US$ 6,99 chegaria a **US$ 34–49/mês**. Com as quotas de E3, a conta fecha assim (assinante mensal de US$ 6,99, **pior caso absoluto**):

| Componente | Cap | Custo pior caso |
|---|---|---|
| 30 módulos com modelo top (Sonnet 5, pós-agosto) | 30 × US$ 0,12 | US$ 3,60 |
| 70 módulos excedentes em Gemini Flash-Lite | 70 × US$ 0,0026 | US$ 0,18 |
| Tutor 500 msgs/mês (Haiku + cache) | — | US$ 1,00–2,50 |
| Mints na Base (só quizzes aprovados) | ≤100 × US$ 0,01 (pico 0,05) | US$ 0,30–1,50 |
| **Total pior caso absoluto** | | **US$ 5,1–7,8** |

**Meta (reescrita com honestidade):** COGS **típico ≤ ~40%** do preço (uso real: 10–40 módulos + tutor moderado ≈ US$ 1,5–3); **pior caso absoluto ≤ preço** — nunca prejuízo por assinante, garantido pelo cap de 30 módulos top/mês (excedente degrada para Gemini com badge; premium nunca bloqueia). Cauda de pior caso monitorada via alerta de COGS por usuário (C2); se >5% dos assinantes rodarem acima de 60% do preço, revisar caps ou preço. Semanal = ¼ das franquias mensais (senão US$ 1,99 daria direito ao mesmo custo do mensal).

## Preços (margem honesta)

| Oferta | Preço USDC | COGS típico | Margem |
|---|---|---|---|
| Free | US$ 0 | ~US$ 0 (Flash-Lite + Sepolia; teto 30/mês) | funil |
| **Semanal** | **US$ 1,99** (`plans[1]`) | US$ 0,3–1,5 | teste |
| **4 semanas** | **US$ 6,99** (`plans[2]`) | US$ 1–4 típico | >50% |
| **PAYG crédito** | **US$ 0,50** (mín. 5) | 1 crédito = 1 módulo premium+mint (~US$ 0,11–0,20) ou 1 conversa tutor | **22–52%** (não ">55%") |

Break-even da infra fixa ≈ **5 assinantes** (margem de contribuição ~US$ 4–5). Mercado 2026: **Khanmigo US$ 4 · ChatGPT Go US$ 8 · Duolingo Max US$ 30 · Coursera Plus ~US$ 59** → **US$ 6,99 no sweet spot**; PAYG por crédito é raro em edtech (diferencial de honestidade). POAP/Galxe/Layer3 validam a ideia futura de **pools patrocinados** (empresa paga os certificados de um curso) + referral via `subscribeFor` — growth v2.

## Custo operacional projetado (revisado)

| Cenário | Usuários | Custo/mês | Receita | Nota |
|---|---|---|---|---|
| Início | 50 ativos, 5 pagos | US$ 15–25 | ~US$ 35 | ✅ |
| Tração | 200, 20 pagos | US$ 25–70 | ~US$ 140 | ✅ |
| Escala | 1.000, 100 pagos | US$ 150–350 (Flash-Lite pago; Redis; RPC pago) | ~US$ 700 | ✅ com gates (Redis, RPC, quotas) — free capado em 30/mês evita estouro |

# Riscos principais

| Risco | Mitigação |
|---|---|
| Domain EIP-712 errado quebra 100% das assinaturas | Ler do contrato + fork test contra USDC real |
| Creditar `msg.sender` em vez do signatário | Regra RB4 + teste de relayer |
| Double-spend de crédito sob concorrência | UPDATE condicional atômico + débito-antes-estorno |
| Quota mensal in-memory = paywall furado | `usage_counters` em Postgres |
| Pagou e não virou premium | `billing.refresh(hash)` + validação de receipt + stale-while-error |
| COGS > preço | Quotas por pior caso + tutor em Haiku + Claude default (não Fugu) |
| Conversão crypto-only baixa | Onramp fiat first-class; instrumentar drop-off; rever projeção |
| Fugu novo/ToS | API oficial; flag Claude-default; fallback |
| Owner EOA comprometido | Safe multisig no mainnet |

# Verificação (fim a fim)
1. Cada PR: CI estrita + testes novos; nada mergeia sem verde + **review do dono**.
2. Contrato: Hardhat + **Slither + gas-gate (C1b)** + **fork test** do USDC; deploy/verify Base Sepolia antes do mainnet; runbook (incl. rollback) em `docs/`.
3. Billing: teste manual Base Sepolia (sem USDC→msg; com USDC→premium <30s; expiração→downgrade; **relayer→signatário recebe**; concorrência→sem double-spend).
4. Adaptativo: snapshot tests do prompt + verificação manual (histórico bom×ruim).
5. Go-live: 1º pagamento real mainnet + smoke.
6. Smoke E2E (C6a) é **gate do go-live A7**; a suíte completa (C6b) fecha a Fase 3.

# Ajustes menores / pendências do dono
- Backup do Postgres é parte do dinheiro (consumo de créditos é off-chain) — no runbook.
- Quota mensal free é anti-abuso (hoje não há teto) — registrar honestamente no changelog ("free nunca piora" preservado no essencial).
- Reescrever `docs/DEPLOYMENT.md` para a realidade **Railway (backend) + Vercel (frontend)** — banner de aviso adicionado no PR-0.5; reescrita completa pendente.
- Rotação do MongoDB Atlas, arquivamento do aprendaMais e fiscal BR: **promovidos para "Pendências imediatas" no topo** (Estado de execução).

# Fora do escopo deste plano
- **boxing-instructor** (plano separado, depois): 🔴 `api/coach.ts` público sem rate limit/origin/budget (mitigação provisória: alerta de billing Anthropic + `max_tokens:400`); sem CSP no vercel.json; pose na main thread; modelo MediaPipe sem cache offline; engine frame-based; F8/F9/F10/F6b.
- swiss-defi e portfolio pausados.
