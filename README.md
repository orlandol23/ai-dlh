# AI-DLH: AI-Powered Decentralized Learning Hub

A full-stack Web3 learning platform: generative AI builds a study module on demand, the quiz is graded entirely server-side, and a passing score is written to Ethereum by an asynchronous, crash-safe on-chain queue.

![CI](https://github.com/orlandol23/ai-dlh/actions/workflows/ci.yml/badge.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FFF100)
![ethers](https://img.shields.io/badge/ethers.js-v6-2535a0)
[![Sepolia](https://img.shields.io/badge/Sepolia-contract%20verified-2ea44f)](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE#code)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6)
![tRPC](https://img.shields.io/badge/tRPC-10-398CCB)
![Tests](https://img.shields.io/badge/tests-175%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

> **Contract on Sepolia:** [`0x3C399AdD53c70DC828db096d6b953757494427CE`](https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE#code) - deployed, with **verified source**, so you can read the Solidity on Etherscan without cloning anything.
> **Live demo:** _not deployed yet. The URL goes here once it is up._
> **Screenshots:** _to be added._

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
|  ethers v6 signer |      |  rate limiting      |      +--------^---------+
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
| Frontend | React 18, TypeScript 5.3, Vite 5, Tailwind, Zustand, TanStack Query v4, Radix UI, i18next, Sentry |
| Backend | Node 20, Express, tRPC v10, Drizzle ORM, PostgreSQL, Zod, Winston, JWT, Vitest |
| Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin v5, ethers v6, TypeChain |
| Web3 client | ethers v6 (no wagmi, see limitations) |
| AI | Google Gemini, Anthropic Claude, Alibaba Qwen |
| CI | GitHub Actions: lint, typecheck, tests and build for all three workspaces |

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

175 tests pass across the three workspaces. Run each one directly:

```bash
cd server    && npx vitest run     # 124 tests, 12 files
cd frontend  && npx vitest run     #  28 tests,  4 files
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

- **The app is not hosted anywhere.** The contract is live on Sepolia, but there is no public URL for the frontend or the API yet, so the only thing you can inspect without running it yourself is the contract on Etherscan.
- **The contract writes custodially.** As a consequence, the per-user read endpoints in `server/routers/web3.router.ts` query the learner's address while the data sits under the backend wallet's address, so they return empty. The UI does not use them: it reads the persisted queue status and transaction hash from Postgres. Those endpoints are stale and are removed or reworked as part of the ERC-5192 redesign.
- **Rate limiting is in-memory.** It is per-instance and resets on redeploy. That is a deliberate trade-off for a single-instance deployment and needs Redis before scaling horizontally.
- **Translations are partly machine-generated.** English and Brazilian Portuguese are human-written; Spanish, French, Japanese and Arabic are machine-translated and flagged in the source as pending human review.
- **No end-to-end tests.** Cypress is present as a dependency but no specs exist. The test suite is unit-level, and router tests mock the database.
- **No Solidity static analysis in CI.** Slither and a gas regression gate are planned, not present.
- **`docs/ARCHITECTURE.md` and `docs/API.md` are outdated.** They describe an earlier single-provider version without the queue or VARK. `docs/DEPLOYMENT.md` carries a staleness banner.

## Roadmap

- [ ] ERC-5192 soulbound certificate minted to the learner's own wallet
- [ ] SIWE / EIP-4361 to replace the hand-rolled signature scheme
- [ ] Slither and a gas regression gate in CI
- [ ] Multi-chain queue: keep the free tier on a testnet, mint paid certificates on an L2
- [ ] Playwright smoke tests as a release gate
- [ ] Human review pass over the machine-translated locales

## License

MIT, see [LICENSE](LICENSE).

Built by [@orlandol23](https://github.com/orlandol23).
