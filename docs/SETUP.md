# 🚀 Setup Guide - AI-DLH

Complete guide to set up the AI-Powered Decentralized Learning Hub.

**Estimated time:** 30-60 minutes (first time)

---

## 📋 Prerequisites

### Required Software

| Software | Version           | Check Command                                   |
| -------- | ----------------- | ----------------------------------------------- |
| Node.js  | 20+               | `node --version`                                |
| Git      | Any               | `git --version`                                 |
| MetaMask | Browser extension | Install from [metamask.io](https://metamask.io) |

### Required Accounts

- **Google Account** - For Gemini AI API
- **Infura Account** - For Ethereum RPC (free tier)

---

## ⚡ Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/orlandol23/ai-dlh.git
cd ai-dlh

# 2. Install all dependencies
npm run setup

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your API keys (see below)
```

---

## 🔑 Phase 1: Get API Keys (10 min)

### 1.1 Google Gemini API ⭐ REQUIRED

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click **"Create API Key"**
4. Copy the key (starts with `AIzaSy...`)

### 1.2 Infura RPC ⭐ REQUIRED

1. Go to: https://infura.io
2. Create free account
3. Create New Project → Name: "AI-DLH"
4. Go to Settings → Endpoints
5. Copy the **Sepolia URL**: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

### 1.3 Etherscan API (Optional)

Only needed to verify contract on Etherscan:

- https://etherscan.io/myapikey

---

## ⚙️ Phase 2: Environment Configuration (10 min)

### 2.1 Generate JWT Secret

```bash
# Option 1: Online generator
# https://generate-secret.vercel.app/32

# Option 2: PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Option 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.2 Generate Backend Wallet

```bash
cd contracts
npm run generate:wallet
```

This outputs:

- **Address**: Your wallet address (share this)
- **Private Key**: Your private key (NEVER share this!)

### 2.3 Get Testnet ETH

You need Sepolia ETH to deploy the contract:

1. Go to: https://sepoliafaucet.com
2. Paste your wallet address
3. Request 0.5 ETH (free)

### 2.4 Complete .env File

```bash
# AI - Google Gemini
GEMINI_API_KEY=AIzaSy_YOUR_KEY_HERE

# Blockchain - Ethereum Sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
CONTRACT_ADDRESS=  # Fill after deploying

# Authentication
JWT_SECRET=your_generated_secret_here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Server
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000/trpc
```

This covers the variables you need to get a local instance running. The
full list — including optional rate-limit, blockchain-queue, wallet-monitor
and Sentry knobs, each with its default and a comment explaining it — lives
in `.env.example` and `server/utils/env.ts`, which is the schema the backend
validates against at boot.

---

## 🔗 Phase 3: Deploy Smart Contract (10 min)

```bash
cd contracts

# Compile contract
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment, copy the contract address to `.env`:

```bash
CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

---

## 🗄️ Phase 4: Database Setup (10 min)

### Option A: Neon (Recommended for production)

1. Go to: https://neon.tech
2. Create a free project (serverless Postgres, scale-to-zero)
3. Copy the connection string to `DATABASE_URL`

Production runs on Neon's free tier, which has a monthly compute
allowance. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the operational
details — which health-check endpoint to probe, and why the queue
worker is event-driven — that keep an idle deployment from burning it.

### Option B: Local Docker (Development)

```bash
docker run --name ai-dlh-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aidlh \
  -p 5432:5432 \
  -d postgres
```

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aidlh
```

### Apply Migrations

```bash
cd server
npm run db:push
```

---

## 🧪 Phase 5: Test Locally (10 min)

### Start Development Servers

```bash
# From project root
npm run dev
```

This starts:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Test Checklist

- [ ] Open http://localhost:5173
- [ ] Click "Connect Wallet" → MetaMask opens
- [ ] Approve connection
- [ ] Generate a module with AI
- [ ] Complete the quiz
- [ ] Verify blockchain transaction

---

## 🚀 Phase 6: Production Deploy (Optional)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment guide.

---

## 🆘 Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.

### Quick Fixes

**MetaMask not connecting?**

- Ensure you're on Sepolia network
- Clear MetaMask cache

**Contract deployment fails?**

- Check wallet has Sepolia ETH
- Verify `PRIVATE_KEY` format (starts with `0x`)

**AI generation fails?**

- Verify `GEMINI_API_KEY` is correct
- Check API quota at Google Cloud Console

---

## 📚 Next Steps

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [adr/](./adr/) - Architecture decision records
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
