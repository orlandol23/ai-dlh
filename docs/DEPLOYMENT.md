# Deployment

How AI-DLH is actually deployed: frontend and backend are two independent
services on two platforms, talking to a serverless Postgres and a public
testnet contract.

## Topology

| Component | Platform | Notes |
| --- | --- | --- |
| Frontend | Vercel | Static Vite build, root directory `frontend` |
| Backend | Railway | Long-running Node process, root directory `server` |
| Database | Neon (Postgres) | Free tier, scale-to-zero, monthly compute allowance |
| Contract | Ethereum Sepolia | `contracts/contracts/LearningProgress.sol`, custodial signer |
| Errors (optional) | Sentry | One project for the backend, one for the frontend |

The frontend and backend are deployed independently by each platform's git
integration — see `.github/workflows/ci.yml`: CI runs lint/typecheck/tests/
build on every push and pull request, but there is no deploy job. Vercel and
Railway pick up pushes to `main` on their own.

## Prerequisites

- GitHub repository connected to both Vercel and Railway
- A Neon project (or any Postgres reachable over the network)
- An Ethereum Sepolia RPC URL (Infura, Alchemy, or similar)
- A Google Gemini API key (the only AI provider that's required)
- Sepolia ETH in the custodial wallet (see below)
- Optional: Etherscan API key (contract verification),
  `ANTHROPIC_API_KEY`/`DASHSCOPE_API_KEY` (extra AI providers), Sentry DSNs
  (error tracking)

## Contract

The contract is deployed once, ahead of the backend that writes to it.

```bash
# 1. Generate a custodial wallet for the backend (do this once)
npm run generate:wallet
# Prints an address + private key. Put the private key in PRIVATE_KEY
# (root .env for local runs, or the Railway dashboard for production).
# Never commit it.

# 2. Fund the wallet with Sepolia ETH
# Any Sepolia faucet works; the wallet address is printed by the step above.

# 3. Deploy
npm run deploy:contract
# Runs `hardhat run scripts/deploy.ts --network sepolia` from contracts/.
# Copy the printed address into CONTRACT_ADDRESS.

# 4. Verify (optional, needs ETHERSCAN_API_KEY)
npm run deploy:verify -- <CONTRACT_ADDRESS>
```

`ETHEREUM_RPC_URL` and `PRIVATE_KEY` are read by `contracts/hardhat.config.ts`
from the same root `.env` the backend uses, so the wallet that deploys the
contract is the same one the backend later signs `recordCompletion` calls
with.

## Backend on Railway

Railway's Root Directory for this service is `server`. There is no
`server/package-lock.json` (the lockfile lives at the repository root,
outside that root directory), so the build cannot use `npm ci` — Railway's
Railpack builder auto-detects `npm install && npm run build`, which resolves
to `server/package.json`'s `build` (`tsc`) and `start` (`node dist/index.js`)
scripts. `server/railway.toml` is the only deploy config Railway reads for
this service; it sets the health check path/timeout and restart policy —
everything else (root directory, build affinity, environment variables) is
set in the Railway dashboard and isn't captured in the repo.

### Environment variables

Validated at boot by `server/utils/env.ts` (Zod) — a missing or malformed
required variable exits the process before it binds a port. These have no
default and must be set in the Railway dashboard:

| Variable | Meaning | Example |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `ETHEREUM_RPC_URL` | Sepolia RPC endpoint | `https://sepolia.infura.io/v3/<project-id>` |
| `PRIVATE_KEY` | Custodial wallet private key (from `npm run generate:wallet`) | `0x` + 64 hex chars |
| `CONTRACT_ADDRESS` | Deployed `LearningProgress` address | `0x3C399AdD53c70DC828db096d6b953757494427CE` |
| `GEMINI_API_KEY` | Google Gemini API key, primary AI provider | `AIzaSy...` |
| `JWT_SECRET` | Session signing secret, 32+ chars | output of `openssl rand -base64 32` |

These have a default but should still be set explicitly in production:

| Variable | Default | Set to |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` |
| `FRONTEND_URL` | `http://localhost:5173` | the Vercel deployment URL |
| `PORT` | `3000` | usually left unset — Railway injects its own `PORT` |

Everything else — rate limits, the blockchain queue's polling and retry
knobs, the wallet-balance monitor, `SKIP_MIGRATIONS` — has a working default
documented inline in `server/utils/env.ts` and mirrored in `.env.example`;
only override them if you have a specific reason to (see Rollback notes
below for the queue knobs).

Optional providers/observability: `ANTHROPIC_API_KEY`, `DASHSCOPE_API_KEY`,
`SENTRY_DSN` — unset means that provider or Sentry is a no-op, not an error.

### CORS: `ALLOWED_ORIGINS` and `ALLOWED_ORIGIN_SUFFIXES`

`FRONTEND_URL` is always allowed. Beyond that:

- `ALLOWED_ORIGINS` — comma-separated **exact** origins, e.g.
  `https://admin.example.com,https://staging.example.com`.
- `ALLOWED_ORIGIN_SUFFIXES` — comma-separated **host suffixes** for preview
  deploys, e.g. `-myorg.vercel.app`. Each entry must start with `-` or `.`
  so the match lands on a label boundary; a bare platform domain like
  `vercel.app` is rejected at boot because it would let any tenant on that
  platform call the API.
- In development, any `http://localhost:*` origin is allowed automatically.

### Health checks

The backend exposes two endpoints; they are not interchangeable:

- **`/healthz`** — no I/O, always returns 200. This is what Railway's
  `healthcheckPath` (in `server/railway.toml`) probes on every deploy, and
  the only endpoint an uptime monitor should ever hit.
- **`/health`** — round-trips to Postgres, the RPC endpoint and Gemini, and
  returns 503 if any of them fail. Useful for a human debugging an incident.
  Never point automated monitoring at it: it wakes a suspended Neon compute,
  and every wakeup bills a full suspend-window minimum. A monitor polling it
  every few minutes burns the monthly compute allowance on its own.

### Migrations

Drizzle migrations run on boot, before the process starts listening — a
partially-migrated database never serves traffic, and a failed migration
exits the process non-zero so Railway restarts the deployment rather than
serving against a stale schema. Set `SKIP_MIGRATIONS=true` if migrations are
applied by a separate release job instead.

### Neon free tier and the event-driven worker

Neon's free plan bills compute by time-awake, and each wakeup from suspend
costs a full suspend-window minimum (about 5 minutes). A worker that polls
on a fixed short interval keeps the database awake around the clock and can
exhaust a ~100 CU-hour monthly allowance with zero real traffic. The
blockchain queue worker avoids this by being event-driven: the endpoints
that enqueue work call `wake()` directly, so new work is picked up in
milliseconds without polling, and the worker only falls back to polling
(`BLOCKCHAIN_QUEUE_INTERVAL_MS` while busy, backing off toward
`BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS` while idle) as a safety net for work
inserted outside the normal enqueue path.

## Frontend on Vercel

Root directory `frontend`; Vercel auto-detects the Vite framework preset
(`npm run build`, output `dist`). `frontend/vercel.json` rewrites all routes
to `index.html` for client-side routing.

| Variable | Meaning |
| --- | --- |
| `VITE_API_URL` | Backend tRPC endpoint, e.g. `https://<railway-service>.up.railway.app/trpc` |
| `VITE_SENTRY_DSN` | Optional — frontend error tracking |

`VITE_API_URL` is a Vite build-time variable: it's baked into the static
bundle at build time, not read at runtime. Changing the backend's URL — a
Railway service rename, a custom domain — requires updating the variable in
the Vercel dashboard **and** triggering a new frontend deploy; the old
bundle keeps calling the old URL until then.

## Observability

Sentry is entirely optional in both workspaces — unset, it's a silent
no-op and nothing else changes. To enable it: create two free-tier Sentry
projects (Node for the backend, React for the frontend) and set `SENTRY_DSN`
on Railway and `VITE_SENTRY_DSN` on Vercel. `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG` and `SENTRY_PROJECT` additionally enable sourcemap upload on
the frontend build; without them the build just skips that step.

## Post-deploy checklist

```bash
# 1. Backend is up
curl https://<railway-service>.up.railway.app/healthz
# {"status":"ok","walletBalanceLow":false}

# 2. Custodial wallet has gas
# walletBalanceLow above should be false. If true, top up the wallet
# (address printed by `npm run generate:wallet`) with Sepolia ETH.

# 3. Frontend loads and reaches the backend
# Open the Vercel URL, connect MetaMask on Sepolia, generate a module,
# complete a quiz with a passing score, and confirm the completion shows
# up as queued/confirmed on the dashboard (and eventually on Etherscan).
```

## Rollback notes

- **Backend:** redeploy a previous build from the Railway dashboard
  (Deployments → pick an earlier one → Redeploy). Migrations are additive
  and idempotent (Drizzle records what's applied), so rolling back the
  binary while keeping the database forward-migrated is the expected path;
  rolling the schema itself back is a manual operation, not something this
  repo automates.
- **Frontend:** redeploy a previous build from the Vercel dashboard the same
  way, or push a revert commit — either works since Vercel deploys from git.
- **Stuck or misbehaving on-chain queue:** the knobs are all in
  `server/utils/env.ts` and settable per-environment on Railway —
  `BLOCKCHAIN_QUEUE_MAX_ATTEMPTS` (attempts before a row is marked
  `failed_permanent`), `BLOCKCHAIN_STALE_LOCK_MS` (how long a `processing`
  row can sit before it's reclaimed), `BLOCKCHAIN_TX_TIMEOUT_MS` (how long
  to wait before a replace-by-fee bump), and `BLOCKCHAIN_QUEUE_INTERVAL_MS`
  / `BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS` (poll cadence, busy and idle). None
  of them require a code change or redeploy of a new binary — only a
  variable update and a restart.
