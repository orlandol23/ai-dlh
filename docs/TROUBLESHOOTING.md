# 🔧 Troubleshooting - AI-DLH

Solutions to common problems.

## 📋 Index

- [Installation and setup](#installation-and-setup)
- [Local development](#local-development)
- [Blockchain and Web3](#blockchain-and-web3)
- [AI and the Gemini API](#ai-and-the-gemini-api)
- [Database](#database)
- [Deployment and production](#deployment-and-production)

---

## 🔧 Installation and setup

### Error: "Node version too old"

**Symptom:**
```bash
npm ERR! engine Unsupported engine
```

**Solution:**
```bash
# Install Node.js 20+
# Through NVM (recommended):
nvm install 20
nvm use 20

# Or download it from: https://nodejs.org
```

---

### Error: "npm install fails"

**Symptom:**
```bash
npm ERR! code ENOENT
npm ERR! syscall open
```

**Solutions:**

```bash
# 1. Clear the cache
npm cache clean --force

# 2. Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Use a specific npm version
npm install -g npm@latest
```

---

### Error: "Cannot find module"

**Symptom:**
```bash
Error: Cannot find module '@trpc/server'
```

**Solution:**
```bash
# Install in EVERY folder
cd frontend && npm install
cd ../server && npm install
cd ../contracts && npm install

# Or use the script:
npm run setup
```

---

## 💻 Local development

### The frontend does not start (port 5173 in use)

**Symptom:**
```bash
Error: Port 5173 is already in use
```

**Solutions:**

```bash
# Option 1: kill the process
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Option 2: use a different port
cd frontend
vite --port 3001
```

---

### The backend does not connect to the frontend

**Symptom:**
```bash
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

```bash
# In development, any http://localhost:* origin is already allowed
# automatically (server/middleware/cors.middleware.ts + NODE_ENV=development),
# so this should not normally happen on localhost.

# If it still blocks, confirm:
# 1. The backend is running with NODE_ENV=development (not "production")
# 2. FRONTEND_URL in the backend .env points at the right origin
FRONTEND_URL=http://localhost:5173

# For an origin that is not localhost (an ngrok tunnel, say), add it to
# ALLOWED_ORIGINS (a comma-separated list, validated in server/utils/env.ts):
ALLOWED_ORIGINS=http://localhost:5173,https://my-origin.example.com

# Restart the backend:
cd server && npm run dev
```

---

### Hot reload does not work

**Symptom:**
Code changes are not reflected in the browser.

**Solutions:**

```bash
# Frontend (Vite)
# 1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
# 2. Clear the cache: DevTools → Application → Clear Storage

# Backend
# 1. Check that tsx watch is running
# 2. Restart: Ctrl+C then npm run dev

# If it persists:
rm -rf .vite frontend/node_modules/.vite
```

---

## ⛓️ Blockchain and Web3

### MetaMask not detected

**Symptom:**
```bash
window.ethereum is undefined
```

**Solutions:**

```bash
# 1. Install MetaMask
https://metamask.io/download/

# 2. Update the browser
# Chrome, Firefox and Brave are supported

# 3. Disable script blockers
# uBlock and Privacy Badger can block it

# 4. Check the console:
console.log(window.ethereum); // It must exist
```

---

### MetaMask does not connect

**Symptom:**
MetaMask opens but does not ask for confirmation.

**Solutions:**

```bash
# 1. Unlock MetaMask
# Type the password

# 2. Reset the pending requests
# MetaMask → Settings → Advanced → Clear activity tab data

# 3. Switch networks and back
# Ethereum Mainnet → Sepolia → Ethereum Mainnet

# 4. Restart the browser
```

---

### Error: "Wrong network"

**Symptom:**
```bash
Please switch to Sepolia network
```

**Solution:**

```bash
# Add Sepolia to MetaMask:
# 1. MetaMask → Networks → Add Network
# 2. Fill in:

Network Name: Sepolia
RPC URL: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
Chain ID: 11155111
Currency Symbol: ETH
Block Explorer: https://sepolia.etherscan.io

# Or use: https://chainlist.org/?search=sepolia
```

---

### Transaction fails: "Insufficient funds"

**Symptom:**
```bash
Error: insufficient funds for gas * price + value
```

**Solutions:**

```bash
# 1. Get testnet ETH
https://sepoliafaucet.com
https://faucets.chain.link/sepolia

# 2. Check the balance
https://sepolia.etherscan.io/address/YOUR_ADDRESS

# 3. Wait 1-2 minutes after the faucet
# The transaction can take a while

# 4. If this is the backend: check PRIVATE_KEY
# The wallet needs ~0.05 ETH minimum
```

---

### Smart contract not deployed

**Symptom:**
```bash
Error: call revert exception
```

**Solutions:**

```bash
# 1. Check that you deployed it
cd contracts
npm run deploy:sepolia

# 2. Copy CONTRACT_ADDRESS into .env
CONTRACT_ADDRESS=0xABC123...

# 3. Restart the backend
cd server && npm run dev

# 4. Check it on Etherscan
https://sepolia.etherscan.io/address/YOUR_CONTRACT
```

---

### Gas far too high

**Symptom:**
```bash
Transaction cost exceeds 1 ETH
```

**Solution:**

```bash
# This should not happen on Sepolia

# If it does:
# 1. Check that you are on the right network
# 2. Wait for less congestion
# 3. Review the contract code (possibly an infinite loop)
```

---

## 🤖 AI and the Gemini API

### Error: "Invalid API key"

**Symptom:**
```bash
Error: API key not valid
```

**Solutions:**

```bash
# 1. Check .env
cat .env | grep GEMINI_API_KEY
# It must start with: AIzaSy...

# 2. Regenerate the key
https://makersuite.google.com/app/apikey
# Delete the old one, create a new one

# 3. Remove spaces and line breaks
# .env must NOT have:
GEMINI_API_KEY=AIzaSy...
# (no spaces, no quotes)

# 4. Restart the server
```

---

### The module is not generated

**Symptom:**
A timeout or an error after 30+ seconds.

**Solutions:**

```bash
# 1. Check the internet connection
ping 8.8.8.8

# 2. Check the API quota
# Google Cloud Console → Gemini API → Quotas
# Free tier: 250 req/day per project (shared across every Flash model); above that it is paid

# 3. Simplify the topic
# Instead of: "Hexagonal architecture in microservices"
# Use: "Microservices"

# 4. Check the backend logs
cd server
npm run dev
# Look for the specific error in the console
```

---

### The AI returns invalid JSON

**Symptom:**
```bash
Error: No JSON found in AI response
```

**Solutions:**

```bash
# 1. A rare Gemini API bug
# Try again (retry)

# 2. Adjust the temperature in the code
# server/services/providers/gemini.provider.ts (each provider has its own
# file in server/services/providers/, gemini, claude and qwen, routed by
# server/services/providers/router.ts)
generationConfig: {
  temperature: 0.5,  // More deterministic (current default: 0.7)
}

# 3. Check the prompt
# It may be confusing the AI
# Simplify the topic
```

---

## 🗄️ Database

### Error: "Cannot connect to database"

**Symptom:**
```bash
Error: connect ECONNREFUSED
```

**Solutions:**

```bash
# Local PostgreSQL
# 1. Start Postgres
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Docker: docker start postgres

# 2. Check DATABASE_URL
# It must be correct in .env

# Neon (production)
# 1. Copy the exact connection string from the Neon dashboard
# 2. Include ?sslmode=require if needed
# 3. A correct DATABASE_URL whose monthly compute allowance is exhausted gives
#    the same ECONNREFUSED. See "database: error" under Health check

# Test the connection:
psql $DATABASE_URL
```

---

### Migrations not applied

**Symptom:**
```bash
Error: relation "users" does not exist
```

**Solution:**

```bash
cd server

# 1. Generate the migrations
npm run db:generate

# 2. Apply them
npm run db:push

# 3. Check the tables
psql $DATABASE_URL
\dt
# It must list: users, modules, progress_records, auth_nonces
```

---

### Error: "Too many connections"

**Symptom:**
```bash
Error: sorry, too many clients already
```

**Solution:**

```bash
# 1. Reduce the connection pool
# server/db/index.ts
const client = postgres(connectionString, {
  max: 5,  // Down from 10 to 5
});

# 2. Use connection pooling
# Neon offers a pooled endpoint (PgBouncer); use it in DATABASE_URL
# if the direct connection is exhausting the free plan's limit

# 3. Close old connections
# Restart the server
```

---

## 🚀 Deployment and production

The frontend runs on Vercel and the backend runs on Railway. They are two
separate deployments. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full topology.

### The frontend build fails on Vercel

**Symptom:**
```bash
Error: Build failed
```

**Solutions:**

```bash
# 1. Test the build locally
cd frontend && npm run build

# If it fails locally:
# - Fix the TypeScript errors
# - Check the dependencies

# 2. Check the Node version on Vercel
# Settings → General → Node.js Version
# It must be: 20.x

# 3. Clear the cache on Vercel
# Deployments → ... → Redeploy → Clear cache
```

### The backend build fails on Railway

**Symptom:** the deploy fails before the health check, or the health check
never goes green.

**Solutions:**

```bash
# 1. Test the build locally
cd server && npm run build

# 2. Read the build and deploy logs in the Railway dashboard
# (the service's Root Directory is "server"; server/railway.toml documents it)

# 3. If the build passed but the health check fails: migrations run BEFORE
# app.listen(), so an invalid DATABASE_URL or a Neon instance out of allowance
# kills the process before it answers /healthz. See "Error: Cannot connect to
# database" above.
```

---

### The health check returns an error

The backend exposes two distinct endpoints. Do not confuse them:

- `/healthz`: no I/O, always 200. This is what Railway uses as its deploy probe.
- `/health`: it makes real round-trips (Postgres, RPC, Gemini) and returns 503
  if something is broken. It is meant for manual diagnosis, **never** for an
  automated uptime monitor: every call wakes a suspended Neon Postgres, and
  every wakeup is billed for the whole suspend window (~5 min on the free
  plan), so a monitor hitting it every few minutes burns the monthly
  allowance on its own.

**Symptom:**
```bash
/health returns status 503
```

**Diagnosis:**

```bash
# Replace this with the real backend service URL on Railway
curl https://YOUR-SERVICE.up.railway.app/health

# See which service failed:
{
  "services": {
    "database": "error",  ← The problem is here
    "blockchain": "ok",
    "ai": "ok"
  }
}
```

**Solutions per service:**

```bash
# database: "error"
# → Check DATABASE_URL on Railway (Neon may be out of allowance for the month)

# blockchain: "error"
# → Check ETHEREUM_RPC_URL and CONTRACT_ADDRESS

# ai: "error"
# → Check GEMINI_API_KEY
```

---

### CORS error in production

**Symptom:**
```bash
Access-Control-Allow-Origin error
```

**Solution:**

CORS is settled by env vars validated in `server/utils/env.ts`
(`server/middleware/cors.middleware.ts` only reads them), not by a list
hardcoded in the code:

```bash
# 1. On Railway, confirm FRONTEND_URL; it is always allowed:
FRONTEND_URL=https://your-project.vercel.app

# 2. For extra origins (a custom domain, say), use ALLOWED_ORIGINS
# (a comma-separated list, one exact origin per entry):
ALLOWED_ORIGINS=https://another-origin.example.com

# 3. For Vercel preview deploys, use ALLOWED_ORIGIN_SUFFIXES instead of
# allowing the whole of "vercel.app" (rejected at boot for being too broad):
ALLOWED_ORIGIN_SUFFIXES=-myuser.vercel.app

# 4. Redeploy the backend service on Railway to apply it
```

---

## 🔍 General debugging

### How to debug

```bash
# Frontend
# 1. Browser console (F12)
console.log('Debug:', variable);

# 2. React DevTools
# Chrome Extension: React Developer Tools

# 3. Network tab
# Look at the tRPC requests

# Backend
# 1. Console logs
cd server && npm run dev
# Read the logs in the terminal

# 2. Winston logs
cat server/logs/combined.log
cat server/logs/error.log

# 3. Logs in production
# Backend (Railway): Dashboard → Deployments → View Logs
# Frontend (Vercel): Dashboard → Deployments → Logs, or `vercel logs`

# Smart Contracts
# 1. Hardhat console
npx hardhat console --network sepolia

# 2. Etherscan
https://sepolia.etherscan.io
# Look at transactions, events and state

# 3. Event logs
# Check the ModuleCompleted events
```

---

## 📞 Still stuck?

### Final checklist

```bash
# ✅ Node.js 20+ installed
node -v

# ✅ Dependencies installed
npm run setup

# ✅ .env configured correctly
cat .env | grep -v "^#" | grep "="

# ✅ Database running
psql $DATABASE_URL -c "SELECT 1"

# ✅ Migrations applied
npm run db:push

# ✅ Smart contract deployed
# Check it on Etherscan

# ✅ API keys valid
# Test each one by hand

# ✅ Ports free
# 3000 (backend), 5173 (frontend)
```

### Getting help

1. **GitHub Issues:**
   ```bash
   https://github.com/your-username/ai-dlh/issues
   ```

2. **Stack Overflow:**
   - Tag: `[trpc]` `[ethers.js]` `[react]`

3. **Documentation:**
   - [tRPC](https://trpc.io/docs)
   - [ethers.js](https://docs.ethers.org)
   - [Gemini API](https://ai.google.dev/docs)
   - [Vercel](https://vercel.com/docs)

4. **Discord Communities:**
   - tRPC Discord
   - Ethereum Discord
   - React Discord

---

**Did not find a solution?**

Open an issue with:
- ✅ A description of the problem
- ✅ Steps to reproduce
- ✅ Logs (console, server, blockchain)
- ✅ Versions (Node, npm and so on)
- ✅ A screenshot, if it is visual

We will reply soon! 🚀
