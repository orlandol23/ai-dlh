# Master Plan: all (AI-DLH)

> Status: **CURRENT on main** (PR #22), executed PR by PR. Reviews R1–R4 plus the plan-management fixes (PR-0.5) are applied.

## Execution state (source of truth)

> Rule (inherited from the ROADMAP): **no checkbox by intention**. An item's status changes only in the PR that completes it (with a link), or by a dated decision in "Decisions during execution".

_Updated: 2026-09-01_

| Item | Status | Reference |
|---|---|---|
| PR-0: master plan on main | ✅ | [#22](https://github.com/orlandol23/ai-dlh/pull/22) |
| PR-0.5: plan-management fixes | ✅ | [#26](https://github.com/orlandol23/ai-dlh/pull/26) |
| C1: Sentry front+server | ✅ | [#23](https://github.com/orlandol23/ai-dlh/pull/23) |
| Orphan rescued: dashboard stats | ✅ | [#24](https://github.com/orlandol23/ai-dlh/pull/24) |
| Orphan rescued: module readability | ✅ | [#25](https://github.com/orlandol23/ai-dlh/pull/25) |
| Outside the plan: honest README (showcase) | ✅ | [#27](https://github.com/orlandol23/ai-dlh/pull/27) |
| Outside the plan: CU-7 brought forward, frontend ethers→viem | ✅ | [#29](https://github.com/orlandol23/ai-dlh/pull/29) |
| Outside the plan: showcase audit (URLs, counts, demo) | ✅ | [#30](https://github.com/orlandol23/ai-dlh/pull/30) |
| Outside the plan: queue, idle backoff in the on-chain poller | ✅ | [#31](https://github.com/orlandol23/ai-dlh/pull/31) |
| Outside the plan: queue, event-driven worker (wake on enqueue) | ✅ | [#33](https://github.com/orlandol23/ai-dlh/pull/33) |
| Outside the plan: security, drizzle-orm 0.45.2 + react-router 7 | ✅ | [#34](https://github.com/orlandol23/ai-dlh/pull/34) |
| C1b: Slither + gas gate in CI | ✅ | [#35](https://github.com/orlandol23/ai-dlh/pull/35) |
| Phase 1: A1–A7 | ⬜ | none |
| Phase 2: B1–B7 | ⬜ | none |
| Phase 3: C2–C8 | ⬜ | none |
| Phase 4: D1–D3 | ⬜ | none |

**Immediate non-code items (owner):**
- ✅ ~~Rotate or remove the aprendaMais MongoDB Atlas user~~. **Resolved on 2026-07-24**: the owner deleted the whole database, so the credential exposed in the history has no target left.
- Archive the aprendaMais repository (FUSION Phase 4): a redirect README plus the `archived` state. Still pending, but with **no security urgency**.
- Create the Sentry projects and set `SENTRY_DSN` (Railway) / `VITE_SENTRY_DSN` (Vercel). This activates C1, which is already merged (#23).
- Brazilian tax: crypto revenue carries a reporting obligation (IN 1888). A non-technical reminder.

**Naming (no collisions):** execution PRs = `C1/C1b, A1–A7, B1–B7, C2–C8, D1–D3`. Technical specs = **E0–E5**. Blockers from reviews R1–R4 = **RB\*** (for example RB4 = credit the signer). The A5/A6 invariants from Step 0 are named after the PR that implements them.

### Decisions during execution

| Date | Decision |
|---|---|
| 2026-07-24 | **A7 now depends on B1+B5** (telemetry and tutor): go-live does not sell features that do not exist. At launch, premium = top model + quotas + tutor. |
| 2026-07-24 | **C6a (E2E smoke)** extracted from C6 and promoted to a gate on A7: the gate has to close **before** the irreversible event (mainnet), not after. |
| 2026-07-24 | **C1b (Slither + gas gate)** extracted from A4: security CI brought forward already runs against the current `LearningProgress.sol` and unblocks A4. |
| 2026-07-24 | **A6 sliced into A6a/A6b/A6c** (core flow / fiat onramp / i18n and RTL QA); the onramp can slip to post-go-live without blocking A7. |
| 2026-07-24 | Sections renumbered **E0–E5** and review blockers renamed **RB1/RB4/RB6** (ID collision eliminated). |
| 2026-07-24 | **MongoDB Atlas incident closed**: the owner deleted the database (the exposed credential has no target). Only archiving the aprendaMais repo is left, with no security urgency. |
| 2026-07-26 | **ADR layer created** (`docs/adr/`, 6 decisions already taken, recorded with their course source) plus a "Course items" section (CU-1…CU-8, additive, the PR sequence unchanged) plus `docs/SOLIDITY_REVIEW_CHECKLIST.md` as a gate on every contract PR. **Open pending decision: CU-5** (Arweave as primary in C5). |
| 2026-08-27 | **CU-7 executed ahead of schedule** ([#29](https://github.com/orlandol23/ai-dlh/pull/29), 2026-07-27): the frontend wallet login moved from ethers v6 to **viem** before Phase 1, and the "decide after Phase 1" assessment was overtaken by the facts. wagmi stays out (not needed until A6). E5 and the CU-7 row updated. |
| 2026-09-01 | **Gas gate tool chosen: a script of our own** ([#35](https://github.com/orlandol23/ai-dlh/pull/35)), closing the "name the chosen tool in the PR" item. Rejected: `gasReporterOutput.json` as an artifact (`hardhat-gas-reporter` 1.0.9 prints a table, does not fail the build, and the JSON format varies between versions) and `forge snapshot` (it would require Foundry in a Hardhat project, for this alone). The script measures named scenarios, has an explicit tolerance and fails with an actionable message. |

## Changelog for this revision (what changed vs. the previous version)

**Factual corrections:** Slither and the gas gate are NEW work (not "they already exist"); `fugu.provider` reuses qwen only in structure (different endpoint and body); the Gemini free tier corrected from "~1,500/day" to **250 RPD per project** (budget it as paid); Fugu **through the official API from day 1** (a personal subscription violates the ToS and saves nothing); PR #21 is **already merged**; the current `LearningProgress.sol` writes to the custodial address, not the user's, so do not reuse it in C4.

**Design blockers fixed:** the price is now `mapping(planId → {weeks, priceUsdc})` (US$ 1.99/week and US$ 6.99/4 weeks exactly, no remainder); the monthly quota and the PAYG balance moved to **Postgres with an atomic conditional UPDATE** (in-memory was a fictional paywall); permit and EIP-3009 credit the **signer**, never `msg.sender`; C4 becomes a real **multi-chain queue**; worst-case COGS recalculated, and the quotas sized by it.

**Contract hardened:** EIP-3009 as the primary path; `maxTotal` anti-front-run; native Base USDC pinned plus runtime validation; the EIP-712 domain read from the contract plus a fork test; **owner = Safe multisig**; a prepay cap; events with `payer indexed`.

**Sequence:** **C1 (Sentry) moves ahead of A1**; A4 deploys to Base Sepolia early (in parallel with A2/A3); C4 and C5 depend on a proven wallet.

**R4 (the owner's final review):** the contradiction between the COGS target and the COGS table is resolved with **option (a)**: the top model capped at **30/month** (the overflow runs on Gemini with a badge; premium never blocks) plus the target rewritten honestly (typical ≤ ~40%; absolute worst case ≤ the price, so never a loss per subscriber). Cosmetic: quiz/h and retry/h returned to the single quota table; the contract events listed in full.

---

## Step 0: wallet↔user binding (SETTLED against the code)

**Question:** does login already prove wallet ownership by signature? → **YES (confirmed).**
Evidence: `server/services/auth.service.ts`. `authenticateWithSignature` calls `web3Service.verifySignature(message, signature, normalizedWallet)` (~line 122), with a match against the declared address, **domain binding**, a time window (±skew) and an **atomic anti-replay nonce** backed by the unique index `(nonce, wallet)`. `users.walletAddress` is UNIQUE.

**Recorded consequences:**
- **SIWE stays in C3 (standardization, not a blocker).** Wallet spoofing is not a hole today.
- **Invariant A5:** `billing.getPlan/refresh` take an **empty input**. The wallet comes exclusively from `ctx.user.walletAddress` (the pattern in `web3.router.ts`). Never accept a wallet from the client.
- **Invariant A6:** block the purchase if the **connected** wallet ≠ the **authenticated** wallet (or route it to `subscribeFor(authenticatedWallet)`). Lock the user's wallet against being changed while there is an active plan or pending credits.
- **C4/C5:** the certificate mint uses the user's **proven** wallet as the recipient.

---

## Context

The owner's career transition into Web3. **all** is the main product: an adaptive knowledge hub (the AI reads the VARK style and adapts in order to teach better) with **paid tiers**. Free stays excellent; premium has a clear edge (a better AI model, larger quotas, exclusive features, a premium NFT certificate).

### The owner's decisions
1. **Billing**: on-chain crypto, USDC on **Base**, through a smart contract, with both a **subscription (weekly/monthly)** AND **PAYG by credits** (for people who only want to try it).
2. **Premium**: premium model + larger quotas + conversational tutor + spoken practice + learning paths + premium NFT certificate.
3. **Chains**: **free stays on Sepolia** (zero cost, an honest "test drive"); paid on **Base**; **Solana** (cNFT/Anchor) as a future phase, aligned with the owner's Rust study.
4. **Priority**: `all` first, until the plan is complete; boxing afterwards (separate plan); swiss-defi and portfolio paused.
5. Fugu (Sakana) through the **official API** from day 1, never the personal consumer subscription (it violates the ToS and saves nothing).

### Non-negotiable principle
**Free never gets worse.** Premium degrades transparently (a badge naming the provider actually used).

## Current state, verified (origin/main)

### all (Waves 1-2 complete; **PR #21 already merged**: server-side quiz plus code splitting at the top of main)
- Signature login (Step 0). `users.preferred_tier` can be switched on for free through `auth.router.updatePreferences`, which is the enforcement point.
- Multi-provider router (`server/services/providers/router.ts`): premium→Claude Sonnet, default→Gemini Flash, `region==='cn'`→Qwen; cross-vendor fallback; the shared prompt (`prompt-builder.ts`) already injects VARK.
- In-memory rate limiting configured by env (`rate-limit.ts` / `trpc.ts`): generate 10/h, quiz 30/h, retry 10/h. **Resets on every redeploy**, which is acceptable for a 1h window, NOT for 30 days.
- On-chain queue (`blockchain-queue.service.ts`) with atomic claim and 1 payout per user+module; it **knows ONE chain** (`env.ts`: one RPC/PRIVATE_KEY/CONTRACT_ADDRESS; one `Web3Service`). Since #31/#33: idle backoff in the poller and an event-driven worker (it wakes on enqueue; idle sleep measured in hours).
- `LearningProgress.sol`: writes everything under `msg.sender` (the **custodial** wallet, not the user's), `string` plus an unbounded array. **Do not reuse it in C4.**
- CI (`ci.yml`): `test-contracts` runs Hardhat, **but has neither Slither nor a gas gate**. Both are new work. `hardhat-gas-reporter` (1.0.9) is present but opt-in (`REPORT_GAS`) and only prints a table.
- No billing code or tables at all.

### boxing: outside this plan (see "Out of scope").

---

# A. On-chain subscription + PAYG system (new core)

## E0: chain strategy

| Tier | Chain | Certificate | Real gas |
|---|---|---|---|
| **Free** | **Sepolia (as today)** | the UI labels it "demonstration certificate (testnet)" | **US$ 0** (faucet) |
| **Premium / PAYG** | **Base mainnet** | a verifiable ERC-5192 soulbound NFT, at the user's proven address | US$ 0.01–0.05/mint |
| **Future (Phase 4)** | **Solana** (Anchor/Rust) | Bubblegum cNFT: ~US$ 0.0001/mint | negligible |

The `chain` column (`'sepolia'|'base'|'solana'`) lands in `progress_records` **in C4** (migrations are free from 0005 onwards), so adding Solana later requires no schema migration.

## E1: the `SubscriptionManager.sol` contract, Base mainnet, native USDC

**Subscription and PAYG credits in the same contract.** OZ 5: `Ownable2Step` + `Pausable` + `SafeERC20`. **No ReentrancyGuard** (USDC has no hooks and no ETH is involved; CEI is enough).

### Price per plan (fixes the table, RB1)
```solidity
struct Plan { uint32 weeks; uint256 priceUsdc; }   // priceUsdc in 6-decimal units
mapping(uint8 => Plan) public plans;               // plans[1]={1, 1_990_000}  → US$ 1.99 / 1 week
                                                    // plans[2]={4, 6_990_000}  → US$ 6.99 / 4 weeks (28 days)
uint256 public pricePerCredit;                      // e.g. 500_000 = US$ 0.50
```
Honest label in the UI: **"4 weeks (28 days)"**, never "1 month" (12×4 weeks = 48 weeks ≠ 52). US$ 6.99 < 4×1.99 **already is** a built-in bundle discount.

### Storage (packing)
```solidity
IERC20 public immutable usdc;                       // immutable, no SSTORE
struct Subscription { uint64 expiresAt; uint8 planId; }   // 1 slot
mapping(address => Subscription) public subscriptions;
mapping(address => uint32) public creditsPurchased;       // CUMULATIVE TOTAL (never decrements; consumption is off-chain)
```

### Functions (all with `maxTotal` anti-front-run; no timelock on setPrice)
- `subscribe(uint8 planId, uint32 qty, uint256 maxTotal)`: charges `plans[planId].priceUsdc * qty`; `require(total <= maxTotal)`; a renewal extends from `max(now, expiresAt)`; **cap** `newExpiresAt <= now + 104 weeks`.
- **`subscribeWithAuthorization(...)` (EIP-3009 `receiveWithAuthorization`): the PRIMARY PATH.** Single-call, immune to front-running and nonce griefing (a random 32-byte nonce; better multi-tab UX). It credits the **`from`** (the signer) and requires `to == address(this)`.
- `subscribeWithPermit(...)` (EIP-2612): the **fallback**, with `try usdc.permit(...) catch {}` plus an allowance check beforehand (which avoids nonce griefing). It credits the **`owner`** (the signer).
- plain `subscribe(...)` (approve+subscribe): the final fallback, for wallets without typed signatures.
- `subscribeFor(beneficiary, planId, qty, maxTotal)`: gifting, sponsorship, assisted sales.
- `purchaseCredits(uint32 credits, uint256 maxTotal)` + `purchaseCreditsWithAuthorization` + `purchaseCreditsFor(beneficiary, ...)`: **PAYG**; increments `creditsPurchased[dest]`; emits `CreditsPurchased(account indexed, payer indexed, credits, amount)`.
- `setPlan(planId, weeks, price)` / `setPricePerCredit` (onlyOwner) · `withdraw(to)` · `pause()/unpause()` (it only blocks sales; reads never).
- Views: `isActive(address)`, `getSubscription(address)`, `creditsPurchased(address)`, `plans(id)`.

**Events (complete list; transparency without a timelock, and cheap):**
`Subscribed(address indexed account, address indexed payer, uint8 planId, uint32 qty, uint64 newExpiresAt, uint256 amountPaid)` · `CreditsPurchased(address indexed account, address indexed payer, uint32 credits, uint256 amountPaid)` · `PlanUpdated(uint8 indexed planId, uint32 weeks, uint256 priceUsdc)` · `PricePerCreditUpdated(uint256 oldPrice, uint256 newPrice)` · `Withdrawn(address indexed to, uint256 amount)` · `Paused/Unpaused` (inherited from Pausable).

**CRITICAL RULE (RB4):** every signed path credits the **signer** (`from`/`owner`), never `msg.sender` (which may be a relayer). Mandatory test: **"the relayer submits the tx, the signer receives the subscription and the credits"**.

**Out of scope for v1 (the right calls):** native ETH, refunds, pull auto-renewal (an infinite allowance is an anti-pattern), an upgradeable proxy.

**Liability note (fixes the invariant):** `withdraw` takes out 100% of the USDC, but **credits are a prepaid liability**, so the correct invariant is "credits consumed ≤ credits purchased" (it lives on the **server** and is tested in A5), NOT "contract balance == sales − withdrawals".

### Gas budget (TARGETS to validate in the gas reporter, not facts)

| Function | Target gas | Notes |
|---|---|---|
| `subscribe`/renewal | ~75–95k | 1 warm SSTORE (packed slot) + transferFrom + event |
| `subscribeWithAuthorization` | ~110–140k | 3009 embeds the authorization; it removes the approve tx |
| `purchaseCredits*` | ~70–90k | 1 SSTORE + transferFrom + event |
| views | 0 (`eth_call`) | this is what the server queries |
| ERC-5192 mint (C4) | ~100–140k | packed storage (`score uint16`+`timestamp uint64`+`topicHash bytes32`); metadata through `tokenURI` (IPFS); history through indexed events; **no ERC721Enumerable**; soulbound = revert on transfer |

Rules for every contract: custom errors, `calldata`>`memory`, `immutable`/`constant`, `unchecked` only with a proof, CEI, the right `indexed` on events.

### Security and tooling: ALL NEW, delivered in C1b + A4 (fixes "it already exists")
- ✅ **Slither in CI** (C1b, [#35](https://github.com/orlandol23/ai-dlh/pull/35)): a step in the `test-contracts` job, reusing the `hardhat compile` build (`ignore-compile`). **Gate on medium/high**; low and informational appear in the log without blocking. Config in `contracts/slither.config.json`. Current state of `LearningProgress.sol`: **0 medium/high findings, 0 low**, 8 informational (all `naming-convention`, from the `_param` prefix).
- ✅ **Gas regression gate** (C1b, [#35](https://github.com/orlandol23/ai-dlh/pull/35)): the chosen tool is **a script of our own** (`contracts/scripts/gas-report.ts`), not `gasReporterOutput.json` and not `forge snapshot`. `hardhat-gas-reporter` prints a table but does not fail the build; the script measures deploy plus `recordCompletion` (first and subsequent), compares against `contracts/gas-baseline.json` and exits with code 1 above a **2%** tolerance. Current baseline: deploy **826,203**, first **184,039**, subsequent **149,839**. Regenerate with `npm run gas:update`, justifying the delta in the PR. This is the gate A4 uses to hit its gas budget.
- **Native Base USDC, pinned**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`; **never USDbC** (bridged, no permit). Validate `decimals()==6` and `symbol()` at runtime.
- **The EIP-712 domain comes from the contract, never hardcoded**: Base USDC uses `{name:'USD Coin', version:'2', chainId:8453}`, so a UI that says only "USDC" breaks **100%** of signatures. The frontend reads `name()`/`version()`/`DOMAIN_SEPARATOR()`/`nonces()`. A **fork test** against the real Base Sepolia USDC, validating that the signature passes (it catches the bug that silently kills the single-tx path).
- **Mainnet owner = a multisig (Safe) or a hardware wallet**, never a hot EOA (`withdraw`+`setPrice` is a very high value key). It goes in the runbook.
- `hardhat.config.ts`: add the `base`/`baseSepolia` networks, a Basescan API key (verify) and an explicit `evmVersion`; consider bumping solc 0.8.20 → a recent 0.8.2x before shipping a contract that holds money.
- Note: USDC's permit and 3009 accept **ERC-1271**, so it works with Coinbase Smart Wallet (relevant on Base).

### The owner's manual verification checklist
Ownable2Step · SafeERC20 · no reentrancy (CEI anyway) · Pausable kill-switch · no unbounded loop, selfdestruct, delegatecall or assembly · `unchecked` only with a proof · fuzz and invariants: `expiresAt` never decreases, `creditsPurchased` monotonic, prepay ≤ 104 weeks · testnet deploy → **the owner's manual review** → mainnet (owner=Safe).

## E2: server-side plan verification

**On-demand RPC read plus a column cache with a TTL** (a listener and a subgraph were rejected). `server/services/billing.service.ts`:
- `getPlan(user)`: **empty input; the wallet only from `ctx.user.walletAddress`** (invariant A5). Cached in the DB (`BILLING_SYNC_TTL_MS`, default 10 min); once expired it does `eth_call subscriptions(wallet)` on Base and persists the result.
- **A single write point for the cache** (`syncPlanFromChain`), used by login and by `billing.refresh`.
- **Distinguish a transport error** (RPC down → stale-while-error, NEVER downgrade) **from a valid "no subscription" answer** (→ downgrade, with one re-read before confirming).
- Hot path: `resolveEffectiveTier` **never blocks generation on RPC**. It is stale-while-revalidate, fire-and-forget (with `.catch`, following the precedent in `auth.service.ts`).
- `plan_tx_hash`: `eth_call` does not return a tx, so either the **frontend sends the hash and the server validates the receipt**, or the field is treated as informational and untrusted.
- Observability inside A5: an alert on consecutive RPC failures; the age of `plan_synced_at` exposed on `/healthz`; a documented staleness ceiling.
- **Graceful downgrade**: expired → `free`; the model goes back to Gemini; free quotas; modules, certificates and history untouched; the tutor and the learning paths become read-only with a CTA. `BILLING_GRACE_HOURS` (default 0).

## E3: data model + quotas

Migration `0005` on `users`: `plan` (default 'free'), `plan_expires_at`, `plan_synced_at`, `plan_tx_hash`. `preferredTier` remains the model preference WITHIN the plan. New `server/services/entitlements.ts`: `resolvePlan(user)`, `resolveEffectiveTier(user)`.
**Acceptance criterion (grep during review):** no raw read of `preferredTier` outside `entitlements.ts` (today `ai.router.ts:61` reads it raw, so fix that). Define the precedence of **`cn` vs `premium`** (today `region==='cn'` wins, so a paying user in the cn region would get Qwen; decide it).

Gates: `updatePreferences` to premium with no plan = `FORBIDDEN 'PLAN_REQUIRED'`. Flag `BILLING_ENFORCED` (default false until go-live; legacy free-premium users resolve to `default` when it is switched on, and that goes in the changelog).

### Quotas (sized by worst-case COGS; RB6, R4 adjustment)

| Quota | Free | Premium | Weekly (=¼ of the monthly ones) |
|---|---|---|---|
| generate/h | 10 | 50 | 50 |
| **generate/month (total)** | **30** | **100** | 25 |
| ↳ **of which on the top model** | 0 | **30** (the overflow runs on **Gemini with a badge**: premium **does not block**, it only swaps the model, transparently) | 8 |
| quiz/h | 30 | 150 | 150 |
| retry/h | 10 | 30 | 30 |
| tutor messages/day | 0 | 100 | 25 |
| **tutor messages/month** | 0 | **500** | 125 |
| learning paths/month | 0 | 10 | 2 |

(HOURLY limits are an anti-abuse guard and do not vary between weekly and monthly; only the monthly allowances scale.)

- Premium generate overflow (beyond the 30 on the top model) → Gemini with a badge, or it consumes a PAYG credit if the user prefers the top model.
- The tutor routes to **Haiku 4.5** (cheaper) by default; Claude Sonnet only when the conversation demands it.
- **MONTHLY quotas go to Postgres** (not in-memory): a `usage_counters(user_id, metric, period 'YYYY-MM', count)` table with `UNIQUE(user_id, metric, period)`; consumption in **a single atomic statement**, `INSERT ... ON CONFLICT DO UPDATE SET count = count+1 WHERE count < $max RETURNING` (precedent: the atomic claim in the queue, `blockchain-queue.service.ts`, and the partial index in `schema.ts`). The hourly limit stays in the in-memory SlidingWindow. `rate-limit.ts`: `consume(key, maxOverride?)`; `trpc.ts`: `max` as a function; the log uses the **effective max**.

## E4: model router by plan + the Fugu provider

`server/services/providers/fugu.provider.ts` reuses **only the structure** of `qwen.provider.ts` (class/axios/Zod). ⚠️ qwen uses native DashScope (`/services/aigc/text-generation/generation`, body `{input:{prompt}}`), NOT OpenAI-compatible, so Fugu's endpoint, body and parsing (`/chat/completions`, `response_format: json_object` with a fallback) are different. Envs `SAKANA_API_KEY`/`SAKANA_BASE_URL`/`FUGU_MODEL`. **Short timeout plus an aggressive circuit breaker** (the fallback only works with a short timeout).

Flag `PREMIUM_PROVIDER=claude|fugu` (**Claude by default**, stable and with guaranteed caching; Fugu behind the flag). Premium only routes to Claude when `ANTHROPIC_API_KEY` is set (reflect that in the runbook). Routing: `cn→qwen | premium→(flag) | otherwise→gemini`; the fallbacks preserve "free never gets worse"; a provider badge on the module; an alert if premium degradation exceeds 5%/day.

## E5: upgrade UX (frontend, **viem** since #29; no wagmi)

- `/plans` (lazy): Free/Premium/PAYG cards, prices and domain **read from the contract**, a selector for weekly (planId 1) / monthly (planId 2) / credits.
- `lib/subscription.ts`: 3009 `receiveWithAuthorization` (1 tx) → permit fallback → approve+subscribe fallback. States: network and balance → sign (**show the signed amount clearly, anti-phishing**) → tx (Basescan link) → `billing.refresh(hash)` → premium.
- **Invariant A6:** block the purchase if the connected wallet ≠ the authenticated one (or use `subscribeFor(authenticated)`).
- **A first-class fiat→USDC onramp** (Coinbase Onramp on Base: Apple Pay or card → USDC), not just a link: a crypto-only checkout crushes conversion for an edtech audience. Instrument the **`/plans` drop-off from day 1**; the 10% conversion projection is optimistic, so either revise it OR assume a crypto-native audience.
- **RTL QA for `plans.json` in Arabic**. i18n ×6; keys `PLAN_REQUIRED`/`MONTHLY_QUOTA_EXCEEDED`.

# B. Adaptive learning loop v2

**FREE:** VARK + progressive difficulty + reinforcement of weak concepts. **PREMIUM:** learning paths, tutor, spoken practice.

- **B1 Telemetry** (migration `0006`): `learning_events` (per quiz: topic, level, score, `weakConcepts`, `timeSpentSeconds` clamped to 0..7200) plus `topic_mastery` (EWMA, `nextReviewAt`/`reviewStage` 1d/3d/7d/14d/30d). The quiz schema gains an **optional** `concept` per question. Collected in `submitQuiz`.
- **B2 Adaptive prompt (free):** `adaptive.service.ts` builds `performanceContext` (prior exposure, average, missed concepts → "re-explain from another angle + 2 targeted questions"). avg≥85→"stretch"; <60→"scaffolding". It never overwrites `level` and does not change the JSON.
- **B3 Insights (free):** `learning.getInsights` plus a "review now" card on the Dashboard.
- **B4 Quiz by learning style (free, FUSION F2).**
- **B5 Tutor (premium):** `tutor.*` plus `tutor_sessions`/`tutor_messages`; context = the module plus N messages with **prompt caching** (guaranteed on Claude; check Fugu); `requirePlan('premium')` middleware; daily and monthly quota. **Audit the cache in practice** (`usage.cache_read_input_tokens > 0`): with no real cache it costs 2–3× more.
- **B6 Learning paths (premium):** `path.*` plus `learning_paths`; **pre-generate the steps through the Anthropic Batch API (−50%)** (batch is for pre-generation, not for interactive generation).
- **B7 Spoken practice (premium, F3).**

# C. PR sequencing (S ≤1d · M 2-4d · L ~1 week)

**C1 (Sentry) moves to the START of Phase 1**, before A1: stale-while-error and fire-and-forget hide failures by design, and without observability there is no way, at go-live, to tell "billing is fine" from "the RPC has been broken for a week".

## Phase 0: observability
| PR | Scope | Effort |
|---|---|---|
| C1 | Sentry front+server (release and sourcemaps); covers the whole of Phases 1-2 | S |
| C1b | **Slither + gas regression gate in CI** (extracted from A4); it already runs against the current `LearningProgress.sol` and unblocks A4 | S |

## Phase 1: revenue
| PR | Scope | Effort | Dep. | Done when |
|---|---|---|---|---|
| A1 | Fugu provider (its own endpoint) + `PREMIUM_PROVIDER` flag + timeout and circuit breaker + fallback + HTTP-mock tests | M | C1 | a real module generated through Fugu in staging; `provider` recorded |
| A2 | Migration 0005 + `entitlements.ts` + the `PLAN_REQUIRED` gate + `resolveEffectiveTier` (grep: zero raw reads of preferredTier), behind `BILLING_ENFORCED=false`; decide cn vs premium | M | none | flag off = identical; flag on = FORBIDDEN with no plan |
| A3 | Per-plan quotas: hourly (in-memory) plus **monthly, DB-backed** (`usage_counters`, atomic UPDATE) | M | A2 | per-plan ceilings; free unchanged; the monthly counter survives a redeploy (tested) |
| A4 | `SubscriptionManager.sol` (plans+PAYG, 3009+permit, maxTotal, owner=Safe) + a USDC fork test + deploy and verify on **Base Sepolia** + a runbook (including **rollback**: a `pause()` playbook, contract migration honoring the old contract's `subscriptions`/`creditsPurchased`, manual refunds through `withdraw`) | L | C1b | the gas budget met at the C1b gate; **the owner's manual review checkpoint** |
| A5 | `billing.service.ts` (the wallet only from ctx; a transport error vs "no subscription"; a single write point) + `billing.refresh(hash→receipt)` + **atomic PAYG consumption** (conditional UPDATE, debit before the provider call plus a reversal on failure, idempotency) + validation against the confirmed `creditsPurchased` + on-chain ingestion (polling the view plus a persisted diff) + health on /healthz | M | A2,A4,C1 | subscribe and purchaseCredits are reflected in the DB; double-spend impossible under concurrency (tested); a re-check before downgrading |
| A6a | `/plans` core: 3009→permit→approve; **the signed amount visible** (anti-phishing); wallet match (invariant A6); balance and plan in the profile plus banners; **ToS and refund policy**; drop-off instrumented | M | A4,A5 | the full flow on Base Sepolia in under 30s (pt-BR/en) |
| A6b | Fiat→USDC onramp (Coinbase Onramp on Base: Apple Pay or card). **May slip to post-go-live** | M | A6a | a fiat purchase in staging |
| A6c | i18n ×6 for `/plans` + RTL QA (ar); requires **human review** of the machine translations; minimum acceptable go-live: pt-BR/en | M | A6a | QA in 6 languages OR a reduced scope documented in the changelog |
| C6a | **E2E smoke** (Playwright: login→generate→quiz plus `/plans` with a mocked chain) running on every PR | M | A6a | green in CI; **a gate on A7** |
| A7 | Go-live: deploy to Base mainnet (owner=Safe, after the review) + `BILLING_ENFORCED=true` + monthly quotas + a changelog for legacy users | S | A1–A5, A6a, **B1, B5, C6a** | the first real payment; the E2E smoke green; the rollback kill-switch (`BILLING_ENFORCED=false`) documented |

**Total effort (honest):** Phase 1 plus B1/B5 ≈ 25–33 focused working days, which is **~3 months at a part-time pace**. The full plan (Phases 1–3) ≈ 4–6 months. **Demonstrable intermediate milestone:** A1–A3 + B1 + B2 (an improved free adaptive loop) already has portfolio value even if billing slips. There is no scenario in which months of work end up with nothing to show.

## Phase 2: adaptive (can be interleaved from A2 onwards; **B1+B5 are a gate on A7**)

| PR | Scope | Effort | Dep. | Done when |
|---|---|---|---|---|
| B1 | Telemetry (migration 0006: `learning_events` + `topic_mastery`) plus collection in `submitQuiz` | M | A2 | the quiz writes events and mastery (tested) |
| B2 | Free adaptive prompt (`adaptive.service.ts`, `performanceContext`) | M | B1 | prompt snapshot tests plus manual verification (good vs bad history) |
| B3 | Free insights (`learning.getInsights` plus a "review now" card) | S | B1 | the card on the Dashboard with real data |
| B4 | Quiz by VARK style (FUSION F2) | M | none | a per-style variant validated by the schema |
| B5 | Premium tutor (`tutor.*` plus `tutor_sessions`/`tutor_messages`; **prompt caching audited**) | **L** | A2, A3, B1 | `usage.cache_read_input_tokens > 0` proven; daily and monthly quotas enforced |
| B6 | Premium learning paths (`path.*` plus `learning_paths`; pre-generation through the Batch API, −50%) | M–L | B2, B5 | a path pre-generated in batch and navigable |
| B7 | Premium spoken practice (FUSION F3, Web Speech API) | M | B5 | working practice in Chrome/Edge with a graceful fallback |

## Phase 3: Web3 core + ops
| PR | Scope | Effort | Dep. |
|---|---|---|---|
| C2 | Alerts: custodial wallet gas **per chain** + **the contract's USDC balance** (a withdraw reminder) + provider degradation + tx failure + **external uptime monitoring** of `/healthz` (UptimeRobot/BetterStack) | M | C1 |
| C3 | SIWE/EIP-4361 (standardization) | M | none |
| C4 | **Multi-chain queue**: the destination (chain+contract+type) written at **enqueue** time according to the plan; a 2nd `Web3Service` (Base RPC and wallet + an ERC-5192 ABI); a rule for a plan that expires between enqueue and processing; the `chain` column; `LearningCertificate.sol`, ERC-5192 soulbound, with `mint(to=the proven wallet)` restricted to the custodial minter; dual-chain `/cert` (the legacy Sepolia one still verifiable); a gas report. **Deliver it in 2 PRs**: C4a (the ERC-5192 contract plus soulbound tests) and C4b (the multi-chain queue plus `/cert`) | L | A4, Step 0 |
| C5 | **Premium** NFT certificate (metadata and artwork in the tokenURI) + **IPFS/Arweave pinning** | M | C4,A5 |
| C6b | Full E2E suite (Playwright: public cert, retries, i18n); it expands the C6a smoke | L | C6a |
| C7 | Certificate OG image + demo polish | M | C4 |
| C8 | ERC-4337/vouchers + a subgraph. **Deferred until there is volume** | L | C4 |

## Phase 4: multi-chain Solana (when the owner is comfortable in Rust)
D1 (formalizes `CertChain`, if needed; the `chain` column already arrived in C4) · **D2** (an Anchor/Rust Bubblegum cNFT program on Solana at ~US$ 0.0001/mint + a `@solana/web3.js` writer + a triple-chain `/cert`; an excellent Rust learning project) · D3 (optional: payment in USDC-SPL).
**Solana is viable and recommended as a future phase**: the mint is ~100× cheaper than Base. Do not do it earlier, because it doubles the test and ops surface with no volume to justify it.

---

# D. Honest cost calculation (the basis of the price)

## Unit cost per action (public price lists; re-check every quarter)

| Action | Resource | Honest cost |
|---|---|---|
| FREE module | **Gemini Flash-Lite** (the free tier is only **250 RPD per project**, shared, so treat anything above that as paid) | ~US$ 0.0026/module |
| FREE certificate | Sepolia | US$ 0 (faucet) |
| PREMIUM module (Claude Sonnet 5) | introductory price **US$ 2/US$ 10 until 2026-08-31**; the tokenizer adds ~30% more tokens | **~US$ 0.10–0.12/module** (conservative, after August) |
| PREMIUM module (Fugu Ultra) | US$ 5/US$ 30 | ~US$ 0.19 (**2× Claude**, which is why Claude is the default) |
| PREMIUM certificate (Base mint) | ~120k gas | US$ 0.01–0.05 |
| Tutor: one conversation (10 messages, Haiku + a real cache) | none | ~US$ 0.02–0.05 (**if the cache works**, so audit it) |
| Learning path (pre-generated in Batch, −50%) | none | ~US$ 0.02 |
| Plan verification | `eth_call` | US$ 0 |
| Fixed infrastructure (Railway+Postgres+**backup**) | none | US$ 10–20/month |

## Worst-case COGS and sizing (the arithmetic closed, R4)

With no monthly ceilings, a US$ 6.99 premium user would reach **US$ 34–49/month**. With the E3 quotas the arithmetic closes like this (a US$ 6.99 monthly subscriber, **absolute worst case**):

| Component | Cap | Worst-case cost |
|---|---|---|
| 30 modules on the top model (Sonnet 5, after August) | 30 × US$ 0.12 | US$ 3.60 |
| 70 overflow modules on Gemini Flash-Lite | 70 × US$ 0.0026 | US$ 0.18 |
| Tutor, 500 messages/month (Haiku + cache) | none | US$ 1.00–2.50 |
| Base mints (passing quizzes only) | ≤100 × US$ 0.01 (peak 0.05) | US$ 0.30–1.50 |
| **Absolute worst-case total** | | **US$ 5.1–7.8** |

**Target (rewritten honestly):** **typical** COGS **≤ ~40%** of the price (real usage: 10–40 modules plus a moderate tutor ≈ US$ 1.5–3); **absolute worst case ≤ the price**, so never a loss per subscriber, guaranteed by the cap of 30 top-model modules per month (the overflow degrades to Gemini with a badge; premium never blocks). The worst-case tail is monitored through a per-user COGS alert (C2); if more than 5% of subscribers run above 60% of the price, revise the caps or the price. Weekly = ¼ of the monthly allowances (otherwise US$ 1.99 would buy the same cost as the monthly plan).

## Prices (honest margin)

| Offer | USDC price | Typical COGS | Margin |
|---|---|---|---|
| Free | US$ 0 | ~US$ 0 (Flash-Lite + Sepolia; ceiling of 30/month) | funnel |
| **Weekly** | **US$ 1.99** (`plans[1]`) | US$ 0.3–1.5 | trial |
| **4 weeks** | **US$ 6.99** (`plans[2]`) | US$ 1–4 typical | >50% |
| **PAYG credit** | **US$ 0.50** (min. 5) | 1 credit = 1 premium module plus mint (~US$ 0.11–0.20), or 1 tutor conversation | **22–52%** (not ">55%") |

Break-even on the fixed infrastructure ≈ **5 subscribers** (contribution margin ~US$ 4–5). The 2026 market: **Khanmigo US$ 4 · ChatGPT Go US$ 8 · Duolingo Max US$ 30 · Coursera Plus ~US$ 59**, which puts **US$ 6.99 in the sweet spot**; per-credit PAYG is rare in edtech (an honesty differentiator). POAP/Galxe/Layer3 validate the future idea of **sponsored pools** (a company pays for a course's certificates) plus referral through `subscribeFor`, which is growth v2.

## Projected operating cost (revised)

| Scenario | Users | Cost/month | Revenue | Note |
|---|---|---|---|---|
| Start | 50 active, 5 paying | US$ 15–25 | ~US$ 35 | ✅ |
| Traction | 200, 20 paying | US$ 25–70 | ~US$ 140 | ✅ |
| Scale | 1,000, 100 paying | US$ 150–350 (paid Flash-Lite; Redis; paid RPC) | ~US$ 700 | ✅ with gates (Redis, RPC, quotas); free capped at 30/month prevents a blow-out |

# Main risks

| Risk | Mitigation |
|---|---|
| A wrong EIP-712 domain breaks 100% of signatures | Read it from the contract + a fork test against real USDC |
| Crediting `msg.sender` instead of the signer | Rule RB4 + a relayer test |
| Credit double-spend under concurrency | Atomic conditional UPDATE + debit-before-reversal |
| An in-memory monthly quota = a leaky paywall | `usage_counters` in Postgres |
| Paid but did not become premium | `billing.refresh(hash)` + receipt validation + stale-while-error |
| COGS > price | Quotas sized by the worst case + the tutor on Haiku + Claude as the default (not Fugu) |
| Low crypto-only conversion | A first-class fiat onramp; instrument the drop-off; revise the projection |
| Fugu is new, and its ToS | The official API; a Claude-default flag; a fallback |
| A compromised owner EOA | A Safe multisig on mainnet |

# Verification (end to end)
1. Every PR: strict CI + new tests; nothing merges without green + **the owner's review**.
2. Contract: Hardhat + **Slither and the gas gate (C1b)** + a USDC **fork test**; deploy and verify on Base Sepolia before mainnet; the runbook (including rollback) in `docs/`.
3. Billing: a manual test on Base Sepolia (no USDC→message; with USDC→premium in under 30s; expiry→downgrade; **relayer→the signer receives**; concurrency→no double-spend).
4. Adaptive: prompt snapshot tests + manual verification (good vs bad history).
5. Go-live: the first real payment on mainnet + a smoke test.
6. The E2E smoke (C6a) is a **gate on the A7 go-live**; the full suite (C6b) closes Phase 3.

# Minor adjustments / the owner's open items
- The Postgres backup is part of the money (credit consumption is off-chain), so it goes in the runbook.
- The free monthly quota is an anti-abuse measure (today there is no ceiling). Record it honestly in the changelog ("free never gets worse" is preserved in essence).
- Rewrite `docs/DEPLOYMENT.md` for the real **Railway (backend) + Vercel (frontend)** setup. A warning banner was added in PR-0.5; the full rewrite is pending.
- MongoDB Atlas rotation, archiving aprendaMais and the Brazilian tax item: **promoted to "Immediate non-code items" at the top** (Execution state).

# Course items (Bootcamp Borderless), recorded on 2026-07-26

> Source: the "Improvements × Bootcamp knowledge" compilation, validated item by item against this plan (source tags: `docs/adr/README.md`). They are **additive**: they change neither the PR sequence (§C) nor scopes already defined, and each item states where it anchors. Decisions already taken that the course validates became ADRs (`docs/adr/`), not items.

| # | Anchor | Item | Source |
|---|---|---|---|
| CU-1 | C1b/A4 | Formalize the E1 checklist invariants (`expiresAt` never decreases; `creditsPurchased` monotonic; prepay ≤ 104 weeks; Σ credits and weeks granted ↔ USDC received from sales, through events) as an **invariant test suite with handlers** running in CI, not only the owner's manual verification | `[W5P1]` |
| CU-2 | A4+ (gate) | Every contract PR goes through `docs/SOLIDITY_REVIEW_CHECKLIST.md` (it complements the E1 checklist) | `[W5P2]` `[QA-JT]` |
| CU-3 | E1 (note) | On-chain automation of expiry and renewal: **not needed in the v1 design**. Expiry is `expiresAt` read through a view; renewal is started by the user; no keeper. Documented trade-off: if some on-chain job does appear, use Chainlink Automation/Gelato/Defender rather than a centralized cron | `[QA-JT]` |
| CU-4 | C2, pre-A7 | **On-chain** monitoring of the contract (events + triggering `pause()`): evaluate OpenZeppelin Defender/Forta or a watcher of our own. The pause runbook already exists in A4; this item picks the tooling and makes it a **prerequisite for `BILLING_ENFORCED=true`** (adding to the A7 gates) | `[W5P2]` |
| CU-5 | C5, **the owner's decision is pending** | Certificate metadata: **Arweave as primary** (pay once, permanent, because a certificate must not be allowed to "unpin") with IPFS as a mirror. C5 already mentions "IPFS/Arweave"; what is missing is fixing the primary. Recorded as pending, without overriding anything | `[W4]` |
| CU-6 | C4b | Import the **reorg and finality** model from the stablerails relayer (`docs/design/relayer.md` v2 in the sibling repo): the premium mint on Base only after an adequate finality depth; a canonical re-check before marking it confirmed | sibling synergy |
| CU-7 | E5, **✅ executed ahead of schedule** | The ethers v6 → **viem** migration shipped in [#29](https://github.com/orlandol23/ai-dlh/pull/29) (wallet login; ethers removed from the frontend). wagmi not adopted, since it is unnecessary until A6. Decision dated in "Decisions during execution" (2026-08-27) | `[W9]` |
| CU-8 | D2 (a 1-day spike) | Anchor spike: the certificate's PDA schema with seeds `[b"cert", user_pubkey, module_id]`. A deterministic address replaces the mapping; 1 record per (user, module) for free; the PDA as the cNFT's tree authority (details: ADR-0006) | `[RS2–4]` |

**Validated as already covered (no action):** fuzz and invariants named in the E1 checklist (CU-1 only formalizes them in CI); Arweave already mentioned in C5 (CU-5 only fixes the primary); SIWE is already C3; pause and rollback are already in the A4 runbook; human review of the es/fr/ja/ar translations is already an A6c criterion.

# Out of scope for this plan
- **boxing-instructor** (separate plan, later): 🔴 `api/coach.ts` is public with no rate limit, origin check or budget (interim mitigation: an Anthropic billing alert plus `max_tokens:400`); no CSP in vercel.json; pose on the main thread; the MediaPipe model has no offline cache; a frame-based engine; F8/F9/F10/F6b.
- swiss-defi and portfolio are paused.
