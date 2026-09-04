# 🔧 Troubleshooting - AI-DLH

Soluções para problemas comuns.

## 📋 Índice

- [Instalação e Setup](#instalação-e-setup)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Blockchain e Web3](#blockchain-e-web3)
- [IA e Gemini API](#ia-e-gemini-api)
- [Database](#database)
- [Deploy e Produção](#deploy-e-produção)

---

## 🔧 Instalação e Setup

### Erro: "Node version too old"

**Sintoma:**
```bash
npm ERR! engine Unsupported engine
```

**Solução:**
```bash
# Instale Node.js 20+
# Via NVM (recomendado):
nvm install 20
nvm use 20

# Ou baixe de: https://nodejs.org
```

---

### Erro: "npm install falha"

**Sintoma:**
```bash
npm ERR! code ENOENT
npm ERR! syscall open
```

**Soluções:**

```bash
# 1. Limpar cache
npm cache clean --force

# 2. Deletar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# 3. Usar versão específica do npm
npm install -g npm@latest
```

---

### Erro: "Cannot find module"

**Sintoma:**
```bash
Error: Cannot find module '@trpc/server'
```

**Solução:**
```bash
# Instale em TODAS as pastas
cd frontend && npm install
cd ../server && npm install
cd ../contracts && npm install

# Ou use o script:
npm run setup
```

---

## 💻 Desenvolvimento Local

### Frontend não inicia (Port 5173 em uso)

**Sintoma:**
```bash
Error: Port 5173 is already in use
```

**Soluções:**

```bash
# Opção 1: Matar processo
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Opção 2: Usar porta diferente
cd frontend
vite --port 3001
```

---

### Backend não conecta com frontend

**Sintoma:**
```bash
Access to XMLHttpRequest blocked by CORS policy
```

**Solução:**

```bash
# Em desenvolvimento, qualquer origem http://localhost:* já é liberada
# automaticamente (server/middleware/cors.middleware.ts + NODE_ENV=development),
# então isso normalmente não deveria acontecer em localhost.

# Se ainda assim bloquear, confirme:
# 1. O backend está rodando com NODE_ENV=development (não "production")
# 2. FRONTEND_URL no .env do backend aponta para a origem certa
FRONTEND_URL=http://localhost:5173

# Para uma origem que não é localhost (ex: um túnel ngrok), adicione-a a
# ALLOWED_ORIGINS (lista separada por vírgula, validada em server/utils/env.ts):
ALLOWED_ORIGINS=http://localhost:5173,https://minha-origem.example.com

# Reinicie backend:
cd server && npm run dev
```

---

### Hot Reload não funciona

**Sintoma:**
Alterações no código não refletem no navegador.

**Soluções:**

```bash
# Frontend (Vite)
# 1. Hard refresh: Ctrl+Shift+R (ou Cmd+Shift+R)
# 2. Limpar cache: DevTools → Application → Clear Storage

# Backend
# 1. Verifique se tsx watch está rodando
# 2. Reinicie: Ctrl+C e npm run dev

# Se persistir:
rm -rf .vite frontend/node_modules/.vite
```

---

## ⛓️ Blockchain e Web3

### MetaMask não detectado

**Sintoma:**
```bash
window.ethereum is undefined
```

**Soluções:**

```bash
# 1. Instale MetaMask
https://metamask.io/download/

# 2. Atualize navegador
# Chrome, Firefox, Brave suportados

# 3. Desative bloqueadores de script
# uBlock, Privacy Badger podem bloquear

# 4. Verifique console:
console.log(window.ethereum); // Deve existir
```

---

### MetaMask não conecta

**Sintoma:**
MetaMask abre mas não pede confirmação.

**Soluções:**

```bash
# 1. Desbloqueie MetaMask
# Digite senha

# 2. Resete solicitações pendentes
# MetaMask → Settings → Advanced → Clear activity tab data

# 3. Mude de rede e volte
# Ethereum Mainnet → Sepolia → Ethereum Mainnet

# 4. Reinicie navegador
```

---

### Erro: "Rede incorreta"

**Sintoma:**
```bash
Please switch to Sepolia network
```

**Solução:**

```bash
# Adicionar Sepolia ao MetaMask:
# 1. MetaMask → Networks → Add Network
# 2. Preencha:

Network Name: Sepolia
RPC URL: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
Chain ID: 11155111
Currency Symbol: ETH
Block Explorer: https://sepolia.etherscan.io

# Ou use: https://chainlist.org/?search=sepolia
```

---

### Transação falha: "Insufficient funds"

**Sintoma:**
```bash
Error: insufficient funds for gas * price + value
```

**Soluções:**

```bash
# 1. Obtenha ETH testnet
https://sepoliafaucet.com
https://faucets.chain.link/sepolia

# 2. Verifique saldo
https://sepolia.etherscan.io/address/SEU_ENDERECO

# 3. Aguarde 1-2 minutos após faucet
# Transação pode demorar

# 4. Se backend: verifique PRIVATE_KEY
# Wallet deve ter ~0.05 ETH mínimo
```

---

### Smart Contract não deployado

**Sintoma:**
```bash
Error: call revert exception
```

**Soluções:**

```bash
# 1. Verifique se deployou
cd contracts
npm run deploy:sepolia

# 2. Copie CONTRACT_ADDRESS para .env
CONTRACT_ADDRESS=0xABC123...

# 3. Reinicie backend
cd server && npm run dev

# 4. Verifique no Etherscan
https://sepolia.etherscan.io/address/SEU_CONTRACT
```

---

### Gas muito alto

**Sintoma:**
```bash
Transaction cost exceeds 1 ETH
```

**Solução:**

```bash
# Isso não deve acontecer no Sepolia

# Se acontecer:
# 1. Verifique se está na rede correta
# 2. Aguarde menor congestão
# 3. Revise código do contrato (possível loop infinito)
```

---

## 🤖 IA e Gemini API

### Erro: "API key inválida"

**Sintoma:**
```bash
Error: API key not valid
```

**Soluções:**

```bash
# 1. Verifique .env
cat .env | grep GEMINI_API_KEY
# Deve começar com: AIzaSy...

# 2. Regenere chave
https://makersuite.google.com/app/apikey
# Delete antiga, crie nova

# 3. Remova espaços/quebras
# .env NÃO pode ter:
GEMINI_API_KEY=AIzaSy...
# (sem espaços, sem aspas)

# 4. Reinicie servidor
```

---

### Módulo não é gerado

**Sintoma:**
Timeout ou erro após 30+ segundos.

**Soluções:**

```bash
# 1. Verifique internet
ping 8.8.8.8

# 2. Verifique quota da API
# Google Cloud Console → Gemini API → Quotas
# Free tier: 1500 req/dia

# 3. Simplifique tópico
# Ao invés de: "Arquitetura hexagonal em microserviços"
# Use: "Microserviços"

# 4. Verifique logs backend
cd server
npm run dev
# Veja erro específico no console
```

---

### IA retorna JSON inválido

**Sintoma:**
```bash
Error: No JSON found in AI response
```

**Soluções:**

```bash
# 1. Bug raro da Gemini API
# Tente novamente (retry)

# 2. Ajuste temperatura no código
# server/services/providers/gemini.provider.ts (cada provedor tem seu próprio
# arquivo em server/services/providers/ — gemini, claude, qwen — roteados por
# server/services/providers/router.ts)
generationConfig: {
  temperature: 0.5,  // Mais determinístico (default atual: 0.7)
}

# 3. Verifique prompt
# Pode estar confundindo a IA
# Simplifique tópico
```

---

## 🗄️ Database

### Erro: "Cannot connect to database"

**Sintoma:**
```bash
Error: connect ECONNREFUSED
```

**Soluções:**

```bash
# PostgreSQL local
# 1. Inicie Postgres
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Docker: docker start postgres

# 2. Verifique DATABASE_URL
# Deve estar correto no .env

# Neon (produção)
# 1. Copie a connection string exata do dashboard do Neon
# 2. Inclua ?sslmode=require se necessário
# 3. Um DATABASE_URL correto mas com a cota mensal de compute esgotada dá o
#    mesmo ECONNREFUSED — veja "Database: error" em Health check acima

# Teste conexão:
psql $DATABASE_URL
```

---

### Migrations não aplicadas

**Sintoma:**
```bash
Error: relation "users" does not exist
```

**Solução:**

```bash
cd server

# 1. Gerar migrations
npm run db:generate

# 2. Aplicar
npm run db:push

# 3. Verificar tabelas
psql $DATABASE_URL
\dt
# Deve listar: users, modules, progress_records, auth_nonces
```

---

### Erro: "Too many connections"

**Sintoma:**
```bash
Error: sorry, too many clients already
```

**Solução:**

```bash
# 1. Reduza pool de conexões
# server/db/index.ts
const client = postgres(connectionString, {
  max: 5,  // Reduzir de 10 para 5
});

# 2. Use connection pooling
# Neon oferece um endpoint pooled (PgBouncer) — use-o em DATABASE_URL
# se a conexão direta estiver esgotando o limite do plano free

# 3. Feche conexões antigas
# Reinicie servidor
```

---

## 🚀 Deploy e Produção

O frontend roda na Vercel e o backend roda na Railway — são dois deploys
separados. Veja [DEPLOYMENT.md](./DEPLOYMENT.md) para a topologia completa.

### Build do frontend falha na Vercel

**Sintoma:**
```bash
Error: Build failed
```

**Soluções:**

```bash
# 1. Teste build localmente
cd frontend && npm run build

# Se falhar localmente:
# - Corrija erros TypeScript
# - Verifique dependências

# 2. Verifique Node version na Vercel
# Settings → General → Node.js Version
# Deve ser: 20.x

# 3. Limpe cache na Vercel
# Deployments → ... → Redeploy → Clear cache
```

### Build do backend falha na Railway

**Sintoma:** o deploy falha antes do health check, ou o health check nunca
fica verde.

**Soluções:**

```bash
# 1. Teste build localmente
cd server && npm run build

# 2. Veja os logs de build/deploy no dashboard da Railway
# (Root Directory do serviço é "server" — server/railway.toml documenta isso)

# 3. Se o build passou mas o health check falha: migrations rodam ANTES do
# app.listen(), então um DATABASE_URL inválido ou um Neon sem cota derruba
# o processo antes de responder a /healthz. Veja "Erro: Cannot connect to
# database" acima.
```

---

### Health check retorna erro

O backend expõe dois endpoints distintos — não confunda os dois:

- `/healthz` — sem I/O, sempre 200. É o que a Railway usa como probe de deploy.
- `/health` — faz round-trips reais (Postgres, RPC, Gemini) e retorna 503 se
  algo estiver quebrado. Serve para diagnóstico manual, **nunca** para um
  monitor de uptime automatizado: cada chamada acorda um Postgres Neon
  suspenso, e cada wakeup cobra a janela de suspensão inteira (~5 min no
  plano free) — um monitor batendo nele a cada poucos minutos estoura a
  franquia mensal sozinho.

**Sintoma:**
```bash
/health retorna status 503
```

**Diagnóstico:**

```bash
# Troque pela URL real do serviço backend na Railway
curl https://SEU-SERVICO.up.railway.app/health

# Veja qual serviço falhou:
{
  "services": {
    "database": "error",  ← Problema aqui
    "blockchain": "ok",
    "ai": "ok"
  }
}
```

**Soluções por serviço:**

```bash
# database: "error"
# → Verifique DATABASE_URL na Railway (Neon pode estar sem cota do mês)

# blockchain: "error"
# → Verifique ETHEREUM_RPC_URL e CONTRACT_ADDRESS

# ai: "error"
# → Verifique GEMINI_API_KEY
```

---

### CORS erro em produção

**Sintoma:**
```bash
Access-Control-Allow-Origin error
```

**Solução:**

CORS é resolvido por env vars validadas em `server/utils/env.ts`
(`server/middleware/cors.middleware.ts` só as lê), não por uma lista
hardcoded no código:

```bash
# 1. Na Railway, confirme FRONTEND_URL — é sempre liberada:
FRONTEND_URL=https://seu-projeto.vercel.app

# 2. Para origens extras (ex: um domínio customizado), use ALLOWED_ORIGINS
# (lista separada por vírgula, uma origem exata por entrada):
ALLOWED_ORIGINS=https://outra-origem.example.com

# 3. Para preview deploys da Vercel, use ALLOWED_ORIGIN_SUFFIXES em vez de
# liberar "vercel.app" inteiro (rejeitado no boot por ser amplo demais):
ALLOWED_ORIGIN_SUFFIXES=-meuuser.vercel.app

# 4. Redeploy o serviço backend na Railway para aplicar
```

---

## 🔍 Debugging Geral

### Como debugar

```bash
# Frontend
# 1. Console do navegador (F12)
console.log('Debug:', variavel);

# 2. React DevTools
# Chrome Extension: React Developer Tools

# 3. Network tab
# Veja requisições tRPC

# Backend
# 1. Console logs
cd server && npm run dev
# Veja logs no terminal

# 2. Winston logs
cat server/logs/combined.log
cat server/logs/error.log

# 3. Logs em produção
# Backend (Railway): Dashboard → Deployments → View Logs
# Frontend (Vercel): Dashboard → Deployments → Logs, ou `vercel logs`

# Smart Contracts
# 1. Hardhat console
npx hardhat console --network sepolia

# 2. Etherscan
https://sepolia.etherscan.io
# Veja transações, eventos, estado

# 3. Event logs
# Verifique ModuleCompleted events
```

---

## 📞 Ainda com problemas?

### Checklist Final

```bash
# ✅ Node.js 20+ instalado
node -v

# ✅ Dependências instaladas
npm run setup

# ✅ .env configurado corretamente
cat .env | grep -v "^#" | grep "="

# ✅ Database rodando
psql $DATABASE_URL -c "SELECT 1"

# ✅ Migrations aplicadas
npm run db:push

# ✅ Smart contract deployado
# Verifique no Etherscan

# ✅ API keys válidas
# Teste cada uma manualmente

# ✅ Ports livres
# 3000 (backend), 5173 (frontend)
```

### Obter Ajuda

1. **GitHub Issues:**
   ```bash
   https://github.com/seu-usuario/ai-dlh/issues
   ```

2. **Stack Overflow:**
   - Tag: `[trpc]` `[ethers.js]` `[react]`

3. **Documentação:**
   - [tRPC](https://trpc.io/docs)
   - [ethers.js](https://docs.ethers.org)
   - [Gemini API](https://ai.google.dev/docs)
   - [Vercel](https://vercel.com/docs)

4. **Discord Communities:**
   - tRPC Discord
   - Ethereum Discord
   - React Discord

---

**Não encontrou solução?**

Abra uma issue com:
- ✅ Descrição do problema
- ✅ Steps para reproduzir
- ✅ Logs (console, servidor, blockchain)
- ✅ Versões (Node, npm, etc)
- ✅ Screenshot (se visual)

Responderemos em breve! 🚀
