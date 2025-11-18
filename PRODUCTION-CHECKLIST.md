# ✅ Checklist de Produção - AI-DLH

Este documento guia a preparação final do projeto para produção.

## 📋 Fase 1: Verificação de Dependências e Build

### Smart Contracts

```bash
cd contracts

# Instalar dependências
npm install

# Compilar contratos
npx hardhat compile

# Rodar testes
npx hardhat test

# Status esperado: ✅ Todos os testes passando
```

### Backend

```bash
cd server

# Instalar dependências
npm install

# Build TypeScript
npm run build

# Verificar erros
npm run lint

# Status esperado: ✅ Build sem erros
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Build produção
npm run build

# Verificar erros
npm run lint

# Status esperado: ✅ Build gera dist/ com sucesso
```

---

## 📋 Fase 2: Configuração de Ambiente

### 2.1 Obter API Keys

- [ ] **Google Gemini API**
  ```
  URL: https://makersuite.google.com/app/apikey
  Tempo: 2 minutos
  Free tier: 1500 req/dia
  ```

- [ ] **Infura RPC** (Ethereum Sepolia)
  ```
  URL: https://infura.io
  Tempo: 3 minutos
  Free tier: 100k req/dia
  ```

- [ ] **Etherscan API** (opcional - para verificação)
  ```
  URL: https://etherscan.io/myapikey
  Tempo: 2 minutos
  ```

### 2.2 Gerar Wallet Backend

```bash
cd contracts
npm run generate:wallet

# Anote:
# - Address: 0x...
# - Private Key: 0x...

# ⚠️ NUNCA commitar a private key!
```

### 2.3 Obter ETH Testnet

```bash
# Faucets (escolha um):
# 1. https://sepoliafaucet.com
# 2. https://faucets.chain.link/sepolia
# 3. https://www.infura.io/faucet/sepolia

# Quantidade necessária: ~0.1 ETH Sepolia
# Tempo de espera: 1-2 minutos

# Verificar saldo:
# https://sepolia.etherscan.io/address/SEU_ADDRESS
```

### 2.4 Criar arquivo .env

```bash
# Na raiz do projeto
cp .env.example .env

# Editar .env com suas chaves:
nano .env  # ou code .env
```

**Template .env completo:**
```bash
# IA (OBRIGATÓRIO)
GEMINI_API_KEY=AIzaSy...

# Database (configurar com Vercel Postgres)
DATABASE_URL=postgresql://...

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=  # Preencher após deploy
ETHERSCAN_API_KEY=...

# Auth
JWT_SECRET=  # Gerar: openssl rand -base64 32
JWT_EXPIRES_IN=7d

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000/trpc
```

---

## 📋 Fase 3: Deploy Blockchain

### 3.1 Deploy Smart Contract

```bash
cd contracts

# Deploy para Sepolia
npm run deploy:sepolia

# Output esperado:
# ✅ Contract deployed to: 0xABC123...

# Copiar CONTRACT_ADDRESS para .env
```

### 3.2 Verificar Contrato (opcional)

```bash
# Verificar no Etherscan
npx hardhat verify --network sepolia 0xSEU_CONTRACT_ADDRESS

# Status: ✅ Verified
```

### 3.3 Testar Contrato

```bash
# Hardhat console
npx hardhat console --network sepolia

# Testar:
const contract = await ethers.getContractAt("LearningProgress", "0xSEU_ADDRESS")
await contract.totalCompletions()
// Deve retornar: 0
```

---

## 📋 Fase 4: Setup Database

### Opção A: Vercel Postgres (Recomendado)

```bash
# 1. Criar conta Vercel: https://vercel.com
# 2. New Project (pode ser vazio por enquanto)
# 3. Storage → Create Database → Postgres
# 4. Copiar DATABASE_URL
# 5. Adicionar ao .env local
```

### Opção B: Supabase

```bash
# 1. Criar conta: https://supabase.com
# 2. New Project
# 3. Project Settings → Database
# 4. Connection String (Session mode)
# 5. Adicionar ao .env
```

### Aplicar Migrations

```bash
cd server

# Gerar migrations
npm run db:generate

# Aplicar ao banco
npm run db:push

# Verificar tabelas criadas
# Deve criar: users, modules, progress_records
```

---

## 📋 Fase 5: Teste Local Completo

### 5.1 Iniciar Backend

```bash
cd server
npm run dev

# Verificar:
# ✅ Server running on port 3000
# ✅ Database connected
# ✅ No errors
```

### 5.2 Testar Health Endpoint

```bash
# Em outro terminal
curl http://localhost:3000/health

# Resposta esperada:
{
  "status": "healthy",
  "services": {
    "database": "ok",
    "blockchain": "ok",
    "ai": "ok"
  }
}
```

### 5.3 Iniciar Frontend

```bash
cd frontend
npm run dev

# Verificar:
# ✅ Frontend on http://localhost:5173
# ✅ No errors
```

### 5.4 Teste Manual Completo

**Teste 1: Landing Page**
- [ ] Abrir http://localhost:5173
- [ ] Página carrega sem erros
- [ ] Design aparece corretamente

**Teste 2: Autenticação Web3**
- [ ] Clicar "Conectar Carteira"
- [ ] MetaMask abre
- [ ] Aprovar conexão
- [ ] Assinar mensagem
- [ ] Redirect para /dashboard
- [ ] ✅ Autenticado com sucesso

**Teste 3: Gerar Módulo**
- [ ] Preencher tópico: "TypeScript"
- [ ] Selecionar nível: "intermediate"
- [ ] Clicar "Gerar com IA"
- [ ] Aguardar 5-10 segundos
- [ ] ✅ Módulo aparece na lista

**Teste 4: Quiz (sem blockchain primeiro)**
- [ ] Implementar página de módulo individual
- [ ] Completar quiz
- [ ] Verificar score calculado
- [ ] ✅ Resultado salvo no DB

**Teste 5: Blockchain**
- [ ] Quiz com score >= 70%
- [ ] Verificar transação enviada
- [ ] Aguardar confirmação (12-15 seg)
- [ ] ✅ TransactionHash retornado
- [ ] Verificar no Etherscan

---

## 📋 Fase 6: Correções Necessárias

### 6.1 Página de Módulo Individual

**Arquivo a criar:** `frontend/src/pages/ModulePage.tsx`

Esta página está faltando! Precisa:
- Exibir conteúdo do módulo (Markdown)
- Sistema de quiz interativo
- Submit e resultado

### 6.2 Middleware de Logging

**Opcional mas recomendado:**
- Criar pasta `server/logs/`
- Adicionar ao .gitignore

### 6.3 Environment Validation

Verificar se todas as env vars obrigatórias estão validadas no código.

---

## 📋 Fase 7: Deploy para Produção

### 7.1 Preparar Repositório

```bash
# Verificar que .env está no .gitignore
cat .gitignore | grep .env

# Commit final
git add .
git commit -m "chore: preparação para produção"
git push
```

### 7.2 Deploy na Vercel

**Via Dashboard:**

1. **Criar Projeto**
   - https://vercel.com → New Project
   - Import GitHub repo

2. **Configurar Build**
   - Framework: Vite
   - Root: `.` (deixar padrão)
   - Build Command: `npm run build`
   - Output: `frontend/dist`

3. **Variáveis de Ambiente**
   Adicionar TODAS do .env:
   ```
   NODE_ENV=production
   GEMINI_API_KEY=...
   DATABASE_URL=...
   ETHEREUM_RPC_URL=...
   PRIVATE_KEY=...
   CONTRACT_ADDRESS=...
   JWT_SECRET=...
   FRONTEND_URL=https://seu-projeto.vercel.app
   VITE_API_URL=https://seu-projeto.vercel.app/trpc
   ```

4. **Deploy!**

### 7.3 Pós-Deploy

```bash
# Teste health endpoint
curl https://seu-projeto.vercel.app/health

# Teste frontend
# Abrir: https://seu-projeto.vercel.app

# Teste fluxo completo:
# 1. Login MetaMask
# 2. Gerar módulo
# 3. Fazer quiz
# 4. Verificar blockchain
```

---

## 📋 Fase 8: Monitoramento

### Logs Vercel

```bash
# Via dashboard
Deployments → Function Logs

# Ou CLI
vercel logs
```

### Blockchain

```bash
# Monitorar contrato
https://sepolia.etherscan.io/address/SEU_CONTRACT

# Ver transações
# Event logs
```

### Database

```bash
# Vercel Postgres Dashboard
# Queries executadas
# Uso de storage
```

---

## ✅ Checklist Final

### Pré-Deploy
- [ ] Todos os testes passando (smart contract)
- [ ] Build sem erros (frontend + backend)
- [ ] .env configurado corretamente
- [ ] Smart contract deployado
- [ ] Database com migrations aplicadas
- [ ] Teste local completo funciona

### Deploy
- [ ] Projeto criado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy bem-sucedido
- [ ] Health check retorna OK
- [ ] Frontend carrega

### Pós-Deploy
- [ ] Login MetaMask funciona
- [ ] Geração de módulo funciona
- [ ] Quiz funciona
- [ ] Blockchain registra transações
- [ ] Logs sem erros críticos

### Documentação
- [ ] README atualizado com URL produção
- [ ] .env.example completo
- [ ] Documentação técnica revisada

---

## 🐛 Se Algo Falhar

1. **Consultar:** `docs/TROUBLESHOOTING.md`
2. **Verificar logs:** Vercel dashboard
3. **Testar localmente:** Reproduzir erro
4. **Verificar .env:** Todas as vars corretas?

---

## 📞 Suporte

- Documentação: `docs/`
- Issues: GitHub Issues
- Logs: Vercel Dashboard

---

**Tempo estimado total:** 2-3 horas (primeira vez)

**Ordem recomendada:**
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8
