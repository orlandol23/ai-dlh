# 🚀 Guia de Deploy - AI-DLH

Guia completo para fazer deploy do projeto em produção.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação](#preparação)
3. [Deploy do Smart Contract](#deploy-do-smart-contract)
4. [Setup do Database](#setup-do-database)
5. [Deploy na Vercel](#deploy-na-vercel)
6. [Configurações Pós-Deploy](#configurações-pós-deploy)
7. [Verificação](#verificação)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requisitos

### Contas Necessárias

- [ ] **GitHub** - Para CI/CD
- [ ] **Vercel** - Para hospedagem
- [ ] **Infura/Alchemy** - RPC Ethereum
- [ ] **Google Cloud** - Gemini API
- [ ] **Etherscan** - Verificação de contrato

### Instalado Localmente

- [ ] Node.js 20+
- [ ] Git
- [ ] npm
- [ ] Vercel CLI (opcional)

---

## 🔧 Preparação

### 1. Obter API Keys

#### **Google Gemini API** (OBRIGATÓRIO)

```bash
# 1. Acesse: https://makersuite.google.com/app/apikey
# 2. Login com Google
# 3. Create API Key
# 4. Copie a chave
```

#### **Infura RPC** (OBRIGATÓRIO)

```bash
# 1. Acesse: https://infura.io
# 2. Crie conta gratuita
# 3. Create New Project
# 4. Copie o endpoint Sepolia:
#    https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

#### **Etherscan API** (OPCIONAL)

```bash
# Para verificação de contrato
# 1. Acesse: https://etherscan.io/myapikey
# 2. Crie conta
# 3. Add API Key
# 4. Copie a chave
```

### 2. Configurar Variáveis de Ambiente

Crie `.env` na raiz:

```bash
cp .env.example .env
```

Preencha **TODAS** as variáveis:

```bash
# IA (OBRIGATÓRIO)
GEMINI_API_KEY=AIzaSy...

# Database (configurar depois com Vercel)
DATABASE_URL=postgresql://...

# Blockchain (OBRIGATÓRIO para certificados)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_ID
PRIVATE_KEY=0x...  # Gerar na próxima etapa
CONTRACT_ADDRESS=0x...  # Deploy na próxima etapa

# Auth (OBRIGATÓRIO)
JWT_SECRET=  # openssl rand -base64 32

# Vercel (configurar depois)
ETHERSCAN_API_KEY=...  # Opcional
```

---

## ⛓️ Deploy do Smart Contract

### 1. Gerar Wallet Backend

```bash
cd contracts
npm run generate:wallet
```

**Importante:**
- Copie o `PRIVATE_KEY` para `.env`
- **NUNCA** commite esta chave!
- Esta wallet é APENAS para backend

### 2. Obter ETH Testnet

Você precisa de ~0.1 ETH Sepolia para deploy:

**Faucets:**
```bash
# Alchemy Sepolia Faucet
https://sepoliafaucet.com

# Chainlink Faucet
https://faucets.chain.link/sepolia

# Infura Faucet
https://www.infura.io/faucet/sepolia
```

**Verificar saldo:**
```bash
# Use o endereço gerado pelo script
https://sepolia.etherscan.io/address/0xSEU_ENDERECO
```

### 3. Deploy do Contrato

```bash
# Na pasta contracts
npm run deploy:sepolia
```

**Output esperado:**
```
🚀 Deploying LearningProgress contract...
📍 Deploying with account: 0x742d35Cc...
💰 Account balance: 0.1 ETH
✅ LearningProgress deployed successfully!
📍 Contract address: 0xABC123...
```

**Copie o endereço do contrato para `.env`:**
```bash
CONTRACT_ADDRESS=0xABC123...
```

### 4. Verificar Contrato (Opcional)

```bash
# Na pasta contracts
npx hardhat verify --network sepolia 0xSEU_CONTRACT_ADDRESS
```

Isso torna o código-fonte verificável no Etherscan.

---

## 🗄️ Setup do Database

### Opção 1: Vercel Postgres (Recomendado - FREE)

```bash
# 1. Crie projeto na Vercel (próxima seção)
# 2. Storage → Create Database → Postgres
# 3. Copie DATABASE_URL das variáveis
# 4. Cole no .env local
```

### Opção 2: Supabase (Alternativa FREE)

```bash
# 1. Acesse: https://supabase.com
# 2. New Project
# 3. Copie Connection String (Session mode)
# 4. Cole no .env
```

### Opção 3: PostgreSQL Local

```bash
# Docker
docker run --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres

# Conexão local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aidlh
```

### Aplicar Migrations

```bash
cd server
npm run db:generate
npm run db:push
```

Verifique se as tabelas foram criadas:
- `users`
- `modules`
- `progress_records`

---

## 🌐 Deploy na Vercel

### Método 1: Via Dashboard (Recomendado)

#### 1. Criar Projeto

```bash
# 1. Acesse: https://vercel.com
# 2. New Project
# 3. Import Git Repository
# 4. Selecione seu repositório GitHub
```

#### 2. Configurar Build

**Framework Preset:** Vite (detectado automaticamente)

**Build Settings:**
```bash
# Build Command
npm run build

# Output Directory
frontend/dist

# Install Command
npm run setup
```

**Root Directory:** `.` (deixar vazio)

#### 3. Adicionar Variáveis de Ambiente

Na aba **Environment Variables**, adicione:

```bash
NODE_ENV=production
PORT=3000

# IA
GEMINI_API_KEY=AIzaSy...

# Database
DATABASE_URL=postgresql://...

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
ETHERSCAN_API_KEY=...  # Opcional

# Auth
JWT_SECRET=seu_secret_super_seguro

# Frontend
FRONTEND_URL=https://seu-projeto.vercel.app
VITE_API_URL=https://seu-projeto.vercel.app/trpc
```

**⚠️ Importante:**
- Clique em **"Add to all environments"**
- Marque: Production, Preview, Development

#### 4. Deploy!

Clique em **Deploy** e aguarde (2-5 minutos).

### Método 2: Via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Seguir prompts
# Adicionar variáveis quando solicitado

# Deploy em produção
vercel --prod
```

---

## ⚙️ Configurações Pós-Deploy

### 1. Atualizar Frontend URL

Após deploy, atualize no Vercel:

```bash
FRONTEND_URL=https://seu-projeto.vercel.app
VITE_API_URL=https://seu-projeto.vercel.app/trpc
```

**Redeploy** para aplicar mudanças.

### 2. Configurar Domínio Customizado (Opcional)

```bash
# Vercel Dashboard
Settings → Domains → Add Domain
# Ex: aidlh.seudominio.com
```

Atualize DNS do seu domínio:
```
Type: CNAME
Name: aidlh
Value: cname.vercel-dns.com
```

### 3. Habilitar HTTPS (Automático)

Vercel ativa SSL automaticamente.
Verifique: https://seu-projeto.vercel.app

### 4. Configurar Redirects

Adicione em `vercel.json` se necessário:

```json
{
  "redirects": [
    {
      "source": "/app",
      "destination": "/dashboard"
    }
  ]
}
```

---

## ✅ Verificação

### Checklist Pós-Deploy

```bash
# 1. Health Check
curl https://seu-projeto.vercel.app/health

# Resposta esperada:
{
  "status": "healthy",
  "services": {
    "database": "ok",
    "blockchain": "ok",
    "ai": "ok"
  }
}

# 2. Frontend carrega
https://seu-projeto.vercel.app
# ✅ Deve mostrar landing page

# 3. Login funciona
# ✅ Conectar MetaMask deve funcionar

# 4. Gerar módulo funciona
# ✅ IA deve gerar conteúdo

# 5. Blockchain funciona
# ✅ Quiz aprovado deve registrar on-chain
```

### Testes Manuais

1. **Autenticação:**
   - Conectar MetaMask (Sepolia)
   - Assinar mensagem
   - Redirect para dashboard

2. **Geração de Módulo:**
   - Preencher formulário
   - Aguardar 3-8 segundos
   - Verificar módulo criado

3. **Quiz:**
   - Abrir módulo
   - Completar quiz
   - Verificar score

4. **Blockchain:**
   - Quiz com ≥70%
   - Verificar transação no Etherscan
   - Link deve funcionar

### Logs

```bash
# Vercel Dashboard
# Deployments → Latest → Function Logs

# Ou via CLI
vercel logs
```

---

## 🐛 Troubleshooting

### Deploy Falhou

**Erro: "Build failed"**

```bash
# Verifique logs na Vercel
# Causa comum: dependências faltando

# Solução:
# 1. Verifique package.json em todas pastas
# 2. npm install localmente
# 3. Commit e push
```

**Erro: "Function size exceeded"**

```bash
# Backend muito grande (limite: 50MB)

# Solução:
# 1. Remova dependências não usadas
# 2. Use external dependencies na Vercel config
```

### Health Check Falha

**Database: "error"**

```bash
# Verifique DATABASE_URL
# Teste conexão:
psql $DATABASE_URL

# Rode migrations:
npm run db:push
```

**AI: "error"**

```bash
# Verifique GEMINI_API_KEY
# Teste manualmente:
curl -X POST https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Blockchain: "error"**

```bash
# Verifique:
# 1. ETHEREUM_RPC_URL válido
# 2. CONTRACT_ADDRESS correto
# 3. Wallet tem ETH

# Teste RPC:
curl $ETHEREUM_RPC_URL \
  -X POST \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Erro ao Conectar Wallet

```bash
# Frontend não conecta MetaMask

# Verificar:
# 1. MetaMask instalado
# 2. Rede Sepolia selecionada
# 3. CORS permitindo origem

# Logs no navegador (F12)
```

### Transação Blockchain Falha

```bash
# "Insufficient funds"
# → Wallet backend sem ETH
# Solução: Envie ETH testnet

# "Gas too low"
# → Aumentar gasLimit no código
# Ou aguardar menor congestão

# "Nonce too low"
# → Transação duplicada
# Aguarde transação anterior confirmar
```

---

## 📊 Monitoring

### Métricas Importantes

**Vercel Analytics:**
```bash
# Dashboard → Analytics
- Page views
- Unique visitors
- Response time
```

**Function Logs:**
```bash
# Dashboard → Logs
- Erros 500
- Tempo de execução
- Memory usage
```

**Blockchain:**
```bash
# Etherscan
https://sepolia.etherscan.io/address/SEU_CONTRACT

- Transaction history
- Gas usage
- Event logs
```

---

## 🔄 CI/CD

GitHub Actions está configurado em `.github/workflows/ci.yml`:

**Triggers:**
- Push para `main` → Deploy produção
- Pull Request → Preview deploy
- Push para `develop` → Staging (se configurado)

**Pipeline:**
1. ✅ Testa smart contracts
2. ✅ Testa backend
3. ✅ Builda frontend
4. ✅ Deploy automático (se passar)

---

## 🔒 Segurança em Produção

### Checklist de Segurança

- [ ] HTTPS ativo (Vercel faz automaticamente)
- [ ] Variáveis de ambiente no Vercel (não commitadas)
- [ ] JWT_SECRET forte (min 32 chars)
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo (futuro)
- [ ] Logs sem informações sensíveis
- [ ] Database backups configurados
- [ ] Smart contract verificado no Etherscan

### Secrets Rotation

**Rotacione periodicamente:**
```bash
# JWT_SECRET - a cada 3 meses
openssl rand -base64 32

# Gemini API Key - se comprometida
# Regenerar no Google Cloud

# Database Password - anualmente
# Via dashboard do provider
```

---

## 📈 Scaling

### Quando Escalar

**Sinais:**
- Response time > 3s consistentemente
- Database queries > 1s
- Out of memory errors
- Rate limit atingido

### Como Escalar

**Vercel:**
```bash
# Upgrade para Pro ($20/mês)
- Serverless functions ilimitadas
- Mais compute time
- Advanced analytics
```

**Database:**
```bash
# Vercel Postgres
Storage → Upgrade Plan

# Ou migrar para:
- Supabase Pro
- AWS RDS
- DigitalOcean Managed DB
```

**Gemini API:**
```bash
# Se atingir 1500 req/dia:
# 1. Upgrade para plan pago
# 2. Ou implementar cache de módulos
```

---

## 📞 Suporte

**Problemas no deploy?**

1. Verifique logs na Vercel
2. Teste localmente: `npm run build`
3. Consulte docs: https://vercel.com/docs
4. Abra issue: GitHub Issues

**Problemas na blockchain?**

1. Verifique Etherscan
2. Teste com Hardhat local: `npx hardhat node`
3. Consulte docs: https://docs.ethers.org

---

**Deploy concluído com sucesso! 🎉**

Próximos passos:
1. Configure monitoring
2. Teste extensivamente
3. Documente seu domínio customizado
4. Adicione ao portfólio!
