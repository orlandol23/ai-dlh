# 🚀 Guia de Setup Completo - AI-DLH

**Tempo estimado:** 1-1.5 horas (primeira vez)

---

## ✅ Checklist de Progresso

Marque conforme avançar:

- [ ] **FASE 1:** API Keys obtidas (10 min)
- [ ] **FASE 2:** Setup local configurado (20 min)
- [ ] **FASE 3:** Blockchain deployado (10 min)
- [ ] **FASE 4:** Database configurado (10 min)
- [ ] **FASE 5:** Teste local funcionando (15 min)
- [ ] **FASE 6:** Deploy em produção (30 min)

---

## 📋 FASE 1: Obter API Keys (10 minutos)

### 1.1 Google Gemini API ⭐ OBRIGATÓRIO

```bash
# 1. Acesse:
https://makersuite.google.com/app/apikey

# 2. Faça login com Google
# 3. Clique "Create API Key"
# 4. Copie a chave (começa com AIzaSy...)
```

✅ **Checkpoint:** Você tem uma chave que começa com `AIzaSy...`

---

### 1.2 Infura RPC ⭐ OBRIGATÓRIO

```bash
# 1. Acesse:
https://infura.io

# 2. Crie conta gratuita
# 3. Dashboard → Create New Project
# 4. Nome: "AI-DLH" (ou qualquer nome)
# 5. Settings → Endpoints
# 6. Copie URL do SEPOLIA:
https://sepolia.infura.io/v3/SEU_PROJECT_ID
```

✅ **Checkpoint:** Você tem URL completa do Sepolia

---

### 1.3 Etherscan API (OPCIONAL)

```bash
# Apenas se quiser verificar contrato publicamente
https://etherscan.io/myapikey

# 1. Criar conta
# 2. Add API Key
# 3. Copiar chave
```

---

## 📋 FASE 2: Setup Local (15-20 minutos)

### 2.1 Clonar e Instalar Dependências

```powershell
# Você já tem o repositório, então:
cd f:\projects\all

# Instalar todas dependências
npm run setup

# Isso executa:
# - npm install (root)
# - npm install (frontend)
# - npm install (server)
# - npm install (contracts)
```

**Tempo:** ~5 minutos (depende da internet)

---

### 2.2 Criar arquivo .env

```powershell
# Copiar template
Copy-Item .env.example .env

# Abrir no VS Code
code .env
```

---

### 2.3 Preencher .env - Parte 1 (API Keys)

Abra `.env` e preencha:

```bash
# ==== EDITE ESTAS LINHAS ====

# 1. Cole sua Gemini API Key
GEMINI_API_KEY=AIzaSy_SUA_CHAVE_AQUI

# 2. Cole sua Infura RPC URL
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID

# 3. (Opcional) Etherscan
ETHERSCAN_API_KEY=SUA_CHAVE_AQUI
```

---

### 2.4 Gerar JWT Secret

No PowerShell (ou use gerador online):

```powershell
# Opção 1 - PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Opção 2 - Online
# https://generate-secret.vercel.app/32

# Copie o resultado e cole no .env:
JWT_SECRET=o_resultado_gerado_aqui
```

---

### 2.5 Gerar Wallet Backend

```powershell
cd contracts

# Instalar dependências (se ainda não fez)
npm install

# Gerar wallet
npm run generate:wallet
```

**Saída esperada:**

```
🔐 Generating new Ethereum wallet for backend...

═══════════════════════════════════════════════
           WALLET GENERATED
═══════════════════════════════════════════════

📍 Address:
   0x742d35Cc6634C0532925a3b844Bc454e4438f44e

🔑 Private Key:
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

⚠️  CRITICAL: NEVER commit this private key!
```

**Importante:**

1. ✅ Copie o `PRIVATE_KEY` (a linha com 0x...)
2. ✅ Cole no `.env`:
   ```bash
   PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. ❌ **NUNCA** commite o arquivo `.env`!

---

### 2.6 Obter ETH Testnet (~5 minutos)

Você precisa de ETH Sepolia para fazer o deploy do contrato.

**Endereço da sua wallet:** (o que foi gerado acima)

```bash
# Faucets disponíveis (escolha um):

1. Alchemy Sepolia Faucet (RECOMENDADO)
   https://sepoliafaucet.com
   → Cole seu endereço
   → Faça login com Alchemy (grátis)
   → Receba 0.5 ETH

2. Chainlink Faucet
   https://faucets.chain.link/sepolia
   → Cole seu endereço
   → Conecte wallet ou faça login
   → Receba 0.1 ETH

3. Infura Faucet
   https://www.infura.io/faucet/sepolia
   → Cole seu endereço
   → Receba ETH
```

**Verificar saldo:**

```bash
# Abra no navegador (substitua SEU_ENDERECO):
https://sepolia.etherscan.io/address/SEU_ENDERECO

# Deve mostrar: Balance: 0.5 ETH (ou similar)
```

⏳ **Aguarde 1-2 minutos** para transação confirmar.

✅ **Checkpoint:** Saldo > 0.05 ETH no Etherscan

---

### 2.7 Verificar .env até agora

Seu `.env` deve ter pelo menos:

```bash
✅ GEMINI_API_KEY=AIzaSy...
✅ ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/...
✅ PRIVATE_KEY=0x...
✅ JWT_SECRET=alguma_string_longa_e_aleatoria
⏳ DATABASE_URL=(vai configurar na Fase 4)
⏳ CONTRACT_ADDRESS=(vai obter na Fase 3)
```

---

## 📋 FASE 3: Deploy Blockchain (10 minutos)

### 3.1 Deploy do Smart Contract

```powershell
# Certifique-se de estar na pasta contracts
cd f:\projects\all\contracts

# Deploy para Sepolia
npm run deploy:sepolia
```

**Saída esperada:**

```
🚀 Deploying LearningProgress contract...

📍 Deploying with account: 0x742d35Cc...
💰 Account balance: 0.5 ETH

✅ LearningProgress deployed successfully!
📍 Contract address: 0xABC123456789...DEFG
📝 Transaction hash: 0x123abc...
⛽ Gas used: 1234567

🌐 Network: sepolia
🔗 Chain ID: 11155111

📋 Next steps:
1. Add to .env file:
   CONTRACT_ADDRESS=0xABC123456789...DEFG
```

---

### 3.2 Adicionar CONTRACT_ADDRESS ao .env

```bash
# Abra .env e adicione a linha:
CONTRACT_ADDRESS=0xABC123456789...DEFG
```

✅ **Checkpoint:** Contrato deployado e endereço no `.env`

---

### 3.3 Verificar Contrato (OPCIONAL)

```powershell
# Verificar no Etherscan
npx hardhat verify --network sepolia 0xSEU_CONTRACT_ADDRESS

# Se der certo:
# ✅ Successfully verified contract
```

**Ver no Etherscan:**

```
https://sepolia.etherscan.io/address/SEU_CONTRACT_ADDRESS
```

---

## 📋 FASE 4: Setup Database (10 minutos)

### Opção A: Vercel Postgres (RECOMENDADO - FREE) ⭐

```bash
# 1. Criar conta Vercel
https://vercel.com/signup

# 2. Após login, ir para Storage
https://vercel.com/dashboard/stores

# 3. Create Database → Postgres
# Nome: ai-dlh-db (ou qualquer)
# Region: Washington D.C. (ou mais próximo)

# 4. Após criar, ir para .env.local tab
# Copiar a variável DATABASE_URL
# Exemplo:
# postgresql://default:abc123@ep-cool-name.us-east-1.aws.neon.tech/verceldb

# 5. Colar no seu .env local:
DATABASE_URL=postgresql://default:abc123@ep-cool-name.us-east-1.aws.neon.tech/verceldb
```

---

### Opção B: PostgreSQL Local (para testes rápidos)

```powershell
# Com Docker
docker run --name ai-dlh-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=aidlh `
  -p 5432:5432 `
  -d postgres

# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aidlh
```

---

### 4.1 Aplicar Migrations

```powershell
cd f:\projects\all\server

# Instalar dependências (se ainda não fez)
npm install

# Gerar migrations
npm run db:generate

# Aplicar ao banco
npm run db:push
```

**Saída esperada:**

```
✅ Migrations applied successfully
✅ Tables created: users, modules, progress_records
```

✅ **Checkpoint:** Database configurado e migrations aplicadas

---

## 📋 FASE 5: Teste Local (15 minutos)

### 5.1 Verificar .env Final

Seu `.env` completo deve ter:

```bash
# API
✅ GEMINI_API_KEY=AIzaSy...

# Database
✅ DATABASE_URL=postgresql://...

# Blockchain
✅ ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/...
✅ PRIVATE_KEY=0x...
✅ CONTRACT_ADDRESS=0x...

# Auth
✅ JWT_SECRET=sua_string_longa

# App
✅ NODE_ENV=development
✅ PORT=3000
✅ FRONTEND_URL=http://localhost:5173
✅ VITE_API_URL=http://localhost:3000/trpc
```

---

### 5.2 Iniciar Backend

```powershell
# Terminal 1
cd f:\projects\all\server
npm run dev
```

**Saída esperada:**

```
═══════════════════════════════════════════════
  AI-DLH Backend Server Started
═══════════════════════════════════════════════
🚀 Server running on port 3000
📍 Environment: development
🔗 API: http://localhost:3000/trpc
❤️  Health: http://localhost:3000/health
═══════════════════════════════════════════════
```

✅ **Checkpoint:** Backend rodando sem erros

---

### 5.3 Testar Health Check

Abra navegador ou use PowerShell:

```powershell
# PowerShell
Invoke-WebRequest http://localhost:3000/health | Select-Object -Expand Content

# Ou abra no navegador:
# http://localhost:3000/health
```

**Resposta esperada:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "services": {
    "database": "ok",
    "blockchain": "ok",
    "ai": "ok"
  }
}
```

---

### 5.4 Iniciar Frontend

```powershell
# Terminal 2 (novo terminal)
cd f:\projects\all\frontend
npm run dev
```

**Saída esperada:**

```
VITE v5.0.11  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

✅ **Checkpoint:** Frontend rodando

---

### 5.5 Teste Manual Completo 🎮

Abra navegador: **http://localhost:5173**

#### Passo 1: Conectar MetaMask

- [ ] 1. Certifique-se de ter MetaMask instalado
- [ ] 2. Mude para rede **Sepolia**
- [ ] 3. Clique "Conectar Carteira"
- [ ] 4. MetaMask abre → Aprovar
- [ ] 5. MetaMask pede assinatura → Assinar
- [ ] 6. Redirect para `/dashboard`

#### Passo 2: Gerar Módulo

- [ ] 1. Preencher "Tópico": `TypeScript`
- [ ] 2. Selecionar "Nível": `Intermediário`
- [ ] 3. Clicar "🤖 Gerar com IA"
- [ ] 4. Aguardar 5-10 segundos
- [ ] 5. Ver módulo aparecer na lista

#### Passo 3: Fazer Quiz

- [ ] 1. Clicar "Estudar" no módulo
- [ ] 2. Ler conteúdo
- [ ] 3. Clicar "Iniciar Quiz"
- [ ] 4. Responder 4-5 perguntas
- [ ] 5. Clicar "Finalizar Quiz"

#### Passo 4: Resultado + Blockchain

- [ ] 1. Ver score (ex: 80%)
- [ ] 2. Se ≥70%, ver mensagem "Registrado na Blockchain"
- [ ] 3. Clicar "Ver no Etherscan"
- [ ] 4. Verificar transação confirmada

✅ **Checkpoint:** Tudo funcionando localmente!

---

## 📋 FASE 6: Deploy Produção (30 minutos)

### 6.1 Commit e Push para GitHub

```powershell
cd f:\projects\all

# Verificar o que será commitado
git status

# IMPORTANTE: .env NÃO deve aparecer!
# Se aparecer, adicione ao .gitignore

# Commit
git add .
git commit -m "feat: setup complete, ready for production"
git push origin main
```

---

### 6.2 Deploy na Vercel

#### Via Dashboard (Recomendado):

```bash
# 1. Acesse:
https://vercel.com/dashboard

# 2. New Project

# 3. Import Git Repository
# → Escolha seu repositório GitHub

# 4. Configure projeto:
```

**Configure Project:**

- **Framework Preset:** Vite
- **Root Directory:** `./` (deixar vazio)
- **Build Command:** `npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm run setup`

---

### 6.3 Adicionar Variáveis de Ambiente

Na seção **Environment Variables**, adicione **TODAS** essas:

```bash
# Copie do seu .env local e cole no Vercel:

NODE_ENV=production
PORT=3000

# API Keys
GEMINI_API_KEY=AIzaSy_SUA_CHAVE
DATABASE_URL=postgresql://...
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
ETHERSCAN_API_KEY=...
JWT_SECRET=sua_string_longa

# URLs (ATUALIZAR depois do primeiro deploy)
FRONTEND_URL=https://seu-projeto.vercel.app
VITE_API_URL=https://seu-projeto.vercel.app/trpc

# JWT
JWT_EXPIRES_IN=7d
```

**Importante:** Marque **"Add to all environments"**

---

### 6.4 Deploy!

Clique em **"Deploy"**

**Aguarde:** 2-5 minutos

**Saída esperada:**

```
✅ Build Successful
✅ Deployment Ready
🌍 https://seu-projeto.vercel.app
```

---

### 6.5 Atualizar URLs das Variáveis

Após primeiro deploy:

```bash
# 1. Copie a URL do Vercel
# Ex: https://ai-dlh-xyz.vercel.app

# 2. Vercel Dashboard → Settings → Environment Variables

# 3. Edite estas 2 variáveis:
FRONTEND_URL=https://ai-dlh-xyz.vercel.app
VITE_API_URL=https://ai-dlh-xyz.vercel.app/trpc

# 4. Redeploy:
# Deployments → ... → Redeploy
```

---

### 6.6 Teste em Produção 🎉

```bash
# 1. Abra sua URL:
https://seu-projeto.vercel.app

# 2. Repita os testes da Fase 5.5:
✅ Conectar MetaMask
✅ Gerar módulo
✅ Fazer quiz
✅ Verificar blockchain
```

---

## ✅ FINALIZAÇÃO

### Checklist Final:

- [ ] ✅ App rodando em produção
- [ ] ✅ Health check retorna OK
- [ ] ✅ Login MetaMask funciona
- [ ] ✅ Geração de módulo funciona
- [ ] ✅ Quiz funciona
- [ ] ✅ Blockchain registra certificados
- [ ] ✅ Links Etherscan funcionam

---

## 🎊 PARABÉNS!

Você completou o setup do AI-DLH!

**Seu projeto está:**

- ✅ Rodando em produção na Vercel
- ✅ Com smart contract na blockchain Ethereum
- ✅ IA Generativa criando conteúdo
- ✅ Certificados permanentes na blockchain

**Próximos passos:**

1. Compartilhe o link: `https://seu-projeto.vercel.app`
2. Adicione ao seu portfólio
3. Mostre para recrutadores
4. Continue desenvolvendo features

---

## 🆘 Se Algo Deu Errado

### Troubleshooting Rápido:

**Backend não inicia:**

```powershell
# Verifique .env
cat .env | Select-String "="

# Teste conexão database
cd server
npm run db:push
```

**Frontend não conecta:**

```powershell
# Verifique VITE_API_URL no .env
# Reinicie frontend:
cd frontend
npm run dev
```

**MetaMask não conecta:**

- Certifique-se de estar na rede Sepolia
- Limpe cache: MetaMask → Settings → Advanced → Clear activity tab data

**Deploy Vercel falha:**

- Verifique logs: Deployments → Function Logs
- Teste build local: `npm run build`

**Blockchain transaction falha:**

- Verifique saldo da wallet backend
- Verifique RPC_URL válido
- Consulte Etherscan para detalhes

---

## 📚 Documentação Adicional

- `PRODUCTION-CHECKLIST.md` - Checklist detalhado completo
- `docs/DEPLOYMENT.md` - Deploy avançado
- `docs/TROUBLESHOOTING.md` - Solução de problemas
- `docs/API.md` - Documentação da API
- `docs/ARCHITECTURE.md` - Arquitetura do sistema

---

**Boa sorte! 🚀**

Se precisar de ajuda, consulte os docs ou abra uma issue no GitHub.
