# AI-DLH: AI-Powered Decentralized Learning Hub

A full-stack Web3 learning platform: generative AI builds a study module on demand, the quiz is graded entirely server-side, and a passing score is written to Ethereum by an asynchronous, crash-safe on-chain queue.

![CI](https://github.com/orlandol23/ai-dlh/actions/workflows/ci.yml/badge.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FFF100)
![viem](https://img.shields.io/badge/viem-2-1B1B1F)
![ethers](https://img.shields.io/badge/ethers.js-v6%20(server)-2535a0)
[![Sepolia](https://img.shields.io/badge/Sepolia-contract%20verified-2ea44f)](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE#code)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6)
![tRPC](https://img.shields.io/badge/tRPC-10-398CCB)
![Tests](https://img.shields.io/badge/tests-216%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

> ### 🔗 The fastest way to inspect this project
>
> **[Read the contract on Etherscan](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE#code)** — [`0x3C399AdD53c70DC828db096d6b953757494427CE`](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE) on Sepolia, deployed with **verified source**. No wallet, no signup, no clone, and nothing that can go offline. The two `recordCompletion` transactions on it were placed by the queue described below, so it is also the pipeline's own receipt.

**🔗 Live demo:** **[ai-dlh.vercel.app](https://ai-dlh.vercel.app)**

Two caveats worth knowing before you click, because both are deliberate trade-offs rather than bugs:

- **It requires MetaMask.** Login is a wallet signature, so without an injected wallet the app stops at the connect screen. The screenshots below show what is behind it.
- **The backend may be temporarily unavailable.** The API runs against serverless Postgres on a free tier with a monthly compute allowance. When that allowance is exhausted the database refuses connections until it resets, and the API goes down with it — the frontend still loads, but anything that needs data will fail. The contract link above is the artefact that never has this problem.

---

## Screenshots

The live demo is gated behind a wallet connection, so these show the screens
that a reviewer without MetaMask cannot reach. The public certificate page is
the one exception — it needs no wallet and can be opened directly.

<!--
  Drop the images in docs/screenshots/ using exactly these filenames and the
  references below will resolve with no further edits.

  Capture at 1440px wide, in light mode, with the UI in English (use the
  language selector in the header, or open in a private window with an
  English browser locale). Crop out browser chrome and any real wallet
  address.
-->

| Screen | Route | Image |
|---|---|---|
| **Dashboard** — progress, generated modules, on-chain status | `/dashboard` | `docs/screenshots/dashboard.png` |
| **Module + quiz** — AI-generated content, server-graded quiz | `/module/:id` | `docs/screenshots/module.png` |
| **Certificate** — public, no wallet needed | `/cert/:hash` | `docs/screenshots/certificate.png` |
| **VARK profile** — learning-style questionnaire | `/vark` | `docs/screenshots/vark.png` |

<!-- Uncomment each line once the corresponding file exists:

![Dashboard](docs/screenshots/dashboard.png)
![Module and quiz](docs/screenshots/module.png)
![Public certificate](docs/screenshots/certificate.png)
![VARK profile](docs/screenshots/vark.png)

-->

> **Not added yet.** The table above is the placeholder; the images are still
> to be captured.

---

## The Web3 problem this project actually solves

Writing to a blockchain from a web backend is not a function call, it is a distributed systems problem. Transactions get stuck, gas spikes, the RPC node times out, the process restarts mid-flight, and the user is still waiting on an HTTP response. Most portfolio dApps ignore this and call `contract.method()` inside the request handler.

This project treats the chain write as what it is: an unreliable, asynchronous side effect that must happen **exactly once**.

### The on-chain write pipeline

When a user passes a quiz (score >= 70), the API returns immediately and the write is handed to a queue backed by Postgres, not by an in-memory job runner:

- **Atomic claim.** A worker takes a row with a single conditional `UPDATE ... WHERE id = ? AND (claimable) RETURNING`. Losers of the race get an empty result and exit cleanly, so multiple workers never grab the same job.
- **Attempt counted at claim time.** A process that dies mid-broadcast still consumes an attempt, which prevents infinite retry loops after a crash.
- **Exponential backoff with an error taxonomy.** Retries follow a fixed schedule and errors are classified: a contract revert is permanent and parks the row as `failed_permanent`, while `INSUFFICIENT_FUNDS` stays retryable on purpose because the wallet can be topped up.
- **Replace-by-fee.** A transaction that does not confirm within the timeout is re-sent on the same nonce with fees bumped 25 percent, and a transaction that gets replaced or repriced is recovered as a success rather than double-sent.
- **Idempotency enforced by the database.** A partial unique index guarantees at most one on-chain payout per (user, module). The application also checks first, and a lost race surfaces as a `23505` unique violation that is caught and downgraded instead of double-paying.
- **Stale lock recovery.** Rows stuck in `processing` past a timeout are reclaimed, so a hard kill does not strand work.
- **Wallet balance monitor.** The custodial wallet balance is polled and exposed on the health endpoint, because a rail that runs out of gas should be visible before it fails.
- **Event-driven worker, polling only as a safety net.** The endpoints that enqueue work wake the worker directly, so a fresh record is processed in milliseconds; while the queue drains it re-polls at the fast interval. Once empty, the worker sleeps until the earliest scheduled retry (or stale lock), capped at a safety-net ceiling measured in hours. This is not micro-optimisation — it is what stops a background worker from bankrupting a serverless database, and it took two lessons to learn. A fixed 15-second poll never lets a scale-to-zero Postgres suspend, which burned the entire monthly compute allowance with zero traffic and took the deployment offline. The first fix — exponential idle backoff up to a 30-minute ceiling — cut queries 120× yet still blew the allowance, because the provider bills a full suspend-window minimum (~5 minutes on Neon's free plan) for every wakeup: 48 wakeups a day is ~4 hours of billed compute regardless of how little the polls do. What a scale-to-zero database bills for is the number of times it is woken, so the design goal is not "poll less often" but "do not poll at all unless something is scheduled".

State machine: `pending -> processing -> confirmed | failed | failed_permanent`.

### Wallet-signature authentication

Login is a signed message, not a password. The server verifies the signature with ethers v6 and binds it against replay and misuse:

- the recovered address must match the address the client claims,
- the message is **domain-bound**, so a signature from another site cannot be replayed here,
- a **timestamp window** bounds how long a signature stays valid,
- the **nonce is consumed atomically inside a transaction**, backed by a unique index on `(nonce, wallet)`, so a replayed signature loses the race at the database level rather than in application logic,
- `users.walletAddress` is unique, so one wallet maps to exactly one account.

This is a hand-rolled scheme with the properties SIWE standardizes. Adopting EIP-4361 proper is on the roadmap below.

### The smart contract

[`contracts/contracts/LearningProgress.sol`](contracts/contracts/LearningProgress.sol) is a small append-only progress registry: Solidity 0.8.20, OpenZeppelin v5, one state-changing function, four views, one indexed event, covered by 23 Hardhat tests using ethers v6 and TypeChain bindings.

**It is live on Sepolia, with verified source:**

| | |
|---|---|
| Address | [`0x3C399AdD53c70DC828db096d6b953757494427CE`](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE) |
| Network | Ethereum Sepolia (chain ID 11155111) |
| Source code | [Verified on Etherscan](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE#code), readable without cloning |
| On-chain activity | Two `recordCompletion` calls, both sent by the custodial backend wallet |

Deployment is the tail end of the pipeline described above, so those two transactions are the pipeline proving itself end to end: quiz graded server-side, row queued in Postgres, worker claimed it, transaction signed and broadcast, receipt confirmed.

**Honest scope.** This contract is deliberately simple, and it is worth being precise about what it is and is not:

- Writes are made by a **custodial backend wallet**, so `msg.sender` is the server, not the learner. That is visible on Etherscan: the contract creator and the sender of both transactions are the same backend address. Records are attributable through the indexed `ModuleCompleted` event, not through per-user on-chain ownership.
- It is **not** a token, an NFT, a soulbound credential, or an ERC-4626 vault. There is no `onlyOwner` logic, no pausing, no upgradeability.
- Two transactions is **demo volume**, not production traffic. The interesting engineering is the queue that puts them there reliably, not the count.
- To run your own instance, deploy your own copy and set `CONTRACT_ADDRESS`, or point it at the address above for read-only use.

Moving to a user-owned, soulbound credential (ERC-5192) is the next step on the contract roadmap, and it is a redesign rather than a patch, for the reason stated above.

---

## Type safety from the database to the UI

The API is tRPC v10, so the React client consumes the server's router **type**, not a generated SDK or a hand-written fetch wrapper:

```ts
// frontend/src/lib/trpc.ts
import type { AppRouter } from '../../../server/routers';
export const trpc = createTRPCReact<AppRouter>();
```

Rename a procedure or change a return shape on the server and the frontend fails to compile. Zod validates every input at the boundary, and Drizzle types the Postgres schema, so a column rename propagates the same way. The contract layer is typed by TypeChain inside the Hardhat test suite, while the server talks to the chain through an explicit minimal ABI.

---

## AI layer: multi-provider with failover

Content generation is not tied to a single vendor. A router picks the provider and falls back **across vendors** when one fails:

| Provider | Model | Role |
|---|---|---|
| Google Gemini | 2.5 Flash | default |
| Anthropic Claude | Sonnet | premium tier |
| Alibaba Qwen | DashScope | region-specific routing |

The response shape is validated with Zod regardless of provider, and the module records which provider actually served it. Prompts are assembled by a shared builder that injects the learner's VARK profile (visual, auditory, reading, kinesthetic), so the same topic is explained differently depending on the learner.

### Quiz integrity: graded server-side, in three layers

The answer key never reaches the browser:

1. **Sanitized output.** Every module egress point strips `correctAnswer` and `explanation`; the public type is literally `Pick<QuizQuestion, 'question' | 'options'>`.
2. **Per-question reveal.** After grading, the correct answer comes back **only for the questions the user already got right**, even on a passing attempt. Passing does not unlock the full key.
3. **One payout per module.** The partial unique index described above makes a second on-chain write for the same (user, module) impossible at the database level.

---

## Architecture

```
React 18 + Vite            Node 20 + Express            Ethereum Sepolia
+-------------------+      +---------------------+      +------------------+
|  UI, Zustand      |      |  tRPC routers       |      |  LearningProgress|
|  tRPC client      |<---->|  Zod validation     |      |  (Solidity 0.8.20)|
|  viem wallet      |      |  rate limiting      |      +--------^---------+
+-------------------+      |  AI provider router |               |
                           |  on-chain queue ----|---------------+
                           +----------+----------+   ethers v6, custodial
                                      |                signer, RBF, retry
                                +-----v-----+
                                | Postgres  |
                                | Drizzle   |
                                | (queue is |
                                |  the SoR) |
                                +-----------+
```

Postgres is the system of record for queue state, which is why a restart never loses a pending chain write.

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript 5.3, Vite 5, Tailwind, Zustand, TanStack Query v4, Radix UI, i18next, viem, Sentry |
| Backend | Node 20, Express, tRPC v10, Drizzle ORM, PostgreSQL, Zod, Winston, JWT, Vitest |
| Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin v5, ethers v6, TypeChain |
| Web3 client | viem 2 in the frontend (wallet login, since #29; no wagmi, see limitations); ethers v6 server-side (signature verification + custodial queue signer) |
| AI | Google Gemini, Anthropic Claude, Alibaba Qwen |
| CI | GitHub Actions: lint, typecheck, tests and build for frontend and backend; compile and tests for contracts |

---

## Running it locally

Requires Node 20+, PostgreSQL, a Sepolia RPC URL, a funded test wallet, and at least a Gemini API key. The backend validates its environment on boot and exits if anything required is missing, so there is no half-configured state.

```bash
git clone https://github.com/orlandol23/ai-dlh.git
cd ai-dlh
npm install

cp .env.example .env
# fill in: DATABASE_URL, ETHEREUM_RPC_URL, PRIVATE_KEY,
#          CONTRACT_ADDRESS, GEMINI_API_KEY, JWT_SECRET (32+ chars)

npm run generate:wallet          # creates the custodial backend wallet
npm run deploy:contract          # deploy to Sepolia, then paste the address into .env
npm run db:push                  # apply the schema

npm run dev                      # frontend on :5173, backend on :3000
```

There is no Docker setup and no mock mode: a real database, a real RPC endpoint and a real API key are needed to run the full flow.

## Tests

216 tests pass across the three workspaces. Run each one directly:

```bash
cd server    && npx vitest run     # 144 tests, 12 files
cd frontend  && npx vitest run     #  49 tests,  5 files
cd contracts && npx hardhat test   #  23 tests
```

Use those three commands rather than the root `npm test`, which only covers contracts and backend and starts Vitest in watch mode.

Coverage percentages are not published because they are not measured in CI.

## Performance work

The frontend entry chunk was cut by lazy-loading routes and splitting vendor bundles:

| | Entry chunk | gzip |
|---|---|---|
| Before | 1,044.91 kB | 344.57 kB |
| After | 259.94 kB | 82.68 kB |
| Change | **-75.1%** | **-76.0%** |

Measured by building the commit before the change and the current HEAD with the same toolchain. To be precise about what that number means: vendor chunks are module-preloaded, so the **first-paint payload** drops by roughly 30 percent, while the **entry chunk itself** drops 75 percent. The app grew from 2,730 to 4,213 modules over the same period and the entry still shrank.

---

## Project status

**Working:** wallet-signature auth, AI module generation with cross-vendor failover, server-side quiz grading, the asynchronous on-chain write queue with retry and idempotency, VARK learning-style adaptation, public certificate page, progress dashboard, internationalization scaffolding for 6 locales, Sentry instrumentation (activates when a DSN is set).

**Not built yet:** user profiles, rankings and badges, PWA support.

## Known limitations

Stated explicitly, because a portfolio that hides its edges is not worth reading:

- **The frontend and the API are deployed separately.** The frontend runs on Vercel, the backend on Railway, and the contract lives on Sepolia. The frontend reaches the API through `VITE_API_URL`, which is baked in at build time, so a frontend redeploy is required whenever the API URL changes.
- **The contract writes custodially.** Completions are recorded under the backend wallet's address, not the learner's, so a per-user on-chain read would return empty. The UI reads queue status and the transaction hash from Postgres instead. Per-user on-chain reads will only make sense once the ERC-5192 redesign puts records under the learner's own wallet.
- **Rate limiting is in-memory.** It is per-instance and resets on redeploy. That is a deliberate trade-off for a single-instance deployment and needs Redis before scaling horizontally.
- **The database is a free-tier serverless Postgres with a monthly compute allowance.** When it is exhausted the database refuses connections until the allowance resets, and the API is down for the remainder of the month. The queue worker is event-driven precisely so an idle deployment wakes the database only a handful of times a day (the safety-net poll); the allowance is a free-tier constraint, not an architectural one. Two operational corollaries: point uptime monitors at `/healthz` (no I/O), never at `/health`, whose database probe would keep the compute awake around the clock; and treat any unexplained allowance burn as "something is waking the database" — the provider's monitoring dashboard shows compute-active periods, which reveal the wakeup cadence and therefore the culprit.
- **Translations are partly machine-generated.** English and Brazilian Portuguese are human-written; Spanish, French, Japanese and Arabic are machine-translated and flagged in the source as pending human review.
- **No end-to-end tests.** The test suite is unit-level, and router tests mock the database. E2E coverage is planned, not present, and is tracked in the roadmap below.
- **Solidity static analysis is gated, not audited.** CI runs Slither (fails on medium and high findings) and a gas regression gate (2% tolerance against `contracts/gas-baseline.json`). That is a lint, not a security audit; the contract has not been audited.
- **Reference documentation is thin.** The standalone architecture and API documents described an earlier single-provider version without the queue or VARK, so they were removed rather than left to mislead. This README and the ADRs under `docs/adr/` are the current source of truth; `docs/DEPLOYMENT.md` carries a staleness banner.

## Roadmap

- [ ] ERC-5192 soulbound certificate minted to the learner's own wallet
- [ ] SIWE / EIP-4361 to replace the hand-rolled signature scheme
- [x] Slither and a gas regression gate in CI ([#35](https://github.com/orlandol23/ai-dlh/pull/35))
- [ ] Multi-chain queue: keep the free tier on a testnet, mint paid certificates on an L2
- [ ] Playwright smoke tests as a release gate
- [ ] Human review pass over the machine-translated locales

## License

MIT, see [LICENSE](LICENSE).

Built by [@orlandol23](https://github.com/orlandol23).
