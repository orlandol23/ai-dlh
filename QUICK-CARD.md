# 🎯 AI-DLH - Cartão de Referência Rápida

_Imprima ou salve para consulta rápida_

---

## 📋 SETUP EM 6 PASSOS

```
┌────────────────────────────────────────────┐
│  1. API KEYS (10 min)                      │
│  ├─ Gemini API                             │
│  ├─ Infura RPC                             │
│  └─ Etherscan (opcional)                   │
├────────────────────────────────────────────┤
│  2. SETUP LOCAL (20 min)                   │
│  ├─ npm run setup                          │
│  ├─ Criar .env                             │
│  ├─ Gerar JWT Secret                       │
│  ├─ Gerar wallet backend                   │
│  └─ Obter ETH testnet                      │
├────────────────────────────────────────────┤
│  3. BLOCKCHAIN (10 min)                    │
│  ├─ Deploy contrato Sepolia                │
│  └─ Adicionar CONTRACT_ADDRESS ao .env     │
├────────────────────────────────────────────┤
│  4. DATABASE (10 min)                      │
│  ├─ Criar Vercel Postgres                  │
│  └─ Aplicar migrations                     │
├────────────────────────────────────────────┤
│  5. TESTE LOCAL (15 min)                   │
│  ├─ Iniciar backend + frontend             │
│  ├─ Conectar MetaMask                      │
│  ├─ Gerar módulo                           │
│  └─ Fazer quiz                             │
├────────────────────────────────────────────┤
│  6. DEPLOY PRODUÇÃO (30 min)               │
│  ├─ Push para GitHub                       │
│  ├─ Importar na Vercel                     │
│  ├─ Adicionar env vars                     │
│  └─ Deploy!                                │
└────────────────────────────────────────────┘
```

---

## 💻 COMANDOS ESSENCIAIS

### Setup Inicial

```powershell
# Carregar scripts
. .\scripts.ps1

# Instalar dependências
Setup-Project

# Gerar JWT Secret
Generate-JWTSecret

# Verificar .env
Check-EnvFile
```

### Desenvolvimento

```powershell
# Iniciar backend + frontend
Start-Dev

# Testar health
Test-Health

# Backend apenas
cd server; npm run dev

# Frontend apenas
cd frontend; npm run dev
```

### Blockchain

```powershell
# Gerar wallet
cd contracts; npm run generate:wallet

# Deploy contrato
npm run deploy:sepolia

# Verificar contrato
npx hardhat verify --network sepolia 0x...
```

### Database

```powershell
cd server
npm run db:generate  # Gerar migrations
npm run db:push      # Aplicar migrations
```

---

## 🔗 LINKS RÁPIDOS

### API Keys

- **Gemini:** https://makersuite.google.com/app/apikey
- **Infura:** https://infura.io
- **Etherscan:** https://etherscan.io/myapikey

### Faucets (ETH Testnet)

- **Alchemy:** https://sepoliafaucet.com
- **Chainlink:** https://faucets.chain.link/sepolia

### Deploy

- **Vercel:** https://vercel.com/new
- **Vercel Postgres:** https://vercel.com/dashboard/stores

### Blockchain

- **Sepolia Etherscan:** https://sepolia.etherscan.io
- **Sepolia ChainList:** https://chainlist.org/?search=sepolia

---

## 📂 ARQUIVOS IMPORTANTES

### .env (NUNCA COMMITAR!)

```bash
GEMINI_API_KEY=AIzaSy...
DATABASE_URL=postgresql://...
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
JWT_SECRET=...
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000/trpc
```

### Estrutura

```
ai-dlh/
├── contracts/     Smart contracts
├── server/        Backend API
├── frontend/      Frontend React
├── docs/          Documentação
├── .env          Variáveis (local)
└── scripts.ps1   Scripts auxiliares
```

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Backend não inicia

```powershell
Check-EnvFile  # Verificar .env
cd server; npm run db:push  # Reset DB
```

### Frontend não conecta

Verificar `VITE_API_URL` no .env

### MetaMask não conecta

- Mudar para rede Sepolia
- MetaMask → Clear activity tab data

### Blockchain falha

- Verificar saldo wallet (Etherscan)
- Obter mais ETH (faucet)

### Deploy Vercel falha

- Verificar env vars completas
- Testar local: `npm run build`
- Verificar logs: Vercel Dashboard

---

## ✅ CHECKLIST MÍNIMO

- [ ] Node.js 20+ instalado
- [ ] Git instalado
- [ ] MetaMask instalado
- [ ] Conta Google (Gemini)
- [ ] Conta GitHub
- [ ] Conta Vercel
- [ ] Conta Infura
- [ ] .env configurado
- [ ] Wallet gerada
- [ ] ETH testnet obtido
- [ ] Contrato deployado
- [ ] Database configurado

---

## 📊 PORTAS E URLs

### Local

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Health:** http://localhost:3000/health
- **tRPC:** http://localhost:3000/trpc

### Produção (após deploy)

- **App:** https://seu-projeto.vercel.app
- **Health:** https://seu-projeto.vercel.app/health
- **API:** https://seu-projeto.vercel.app/trpc

### Blockchain

- **Network:** Sepolia Testnet
- **Chain ID:** 11155111
- **Explorer:** https://sepolia.etherscan.io
- **Contract:** 0xSEU_CONTRACT_ADDRESS

---

## 🎓 RECURSOS DE APRENDIZADO

### Documentação Projeto

- **Setup:** SETUP-GUIDE.md
- **Arquitetura:** docs/ARCHITECTURE.md
- **API:** docs/API.md
- **Deploy:** docs/DEPLOYMENT.md
- **FAQ:** FAQ.md

### Documentação Externa

- **tRPC:** https://trpc.io/docs
- **Vercel:** https://vercel.com/docs
- **ethers.js:** https://docs.ethers.org
- **Gemini:** https://ai.google.dev/docs
- **Hardhat:** https://hardhat.org/docs

---

## 💰 CUSTOS (100% GRÁTIS)

| Serviço   | Free Tier  | Limite          |
| --------- | ---------- | --------------- |
| Vercel    | ✅         | 100GB bandwidth |
| Postgres  | ✅         | 256MB           |
| Gemini    | ✅         | 1500 req/dia    |
| Infura    | ✅         | 100k req/dia    |
| Sepolia   | ✅         | Ilimitado       |
| **TOTAL** | **$0/mês** | -               |

---

## 🚀 FLUXO RECOMENDADO

### Primeira Vez

```
1. PREREQUISITES.md (verificar)
   ↓
2. START-NOW.md (5 min)
   ↓
3. SETUP-GUIDE.md (1h)
   ↓
4. PROGRESS-CHECKLIST.md (marcar)
   ↓
5. Deploy ✅
```

### Com Experiência

```
1. QUICKSTART.md
   ↓
2. QUICK-REFERENCE.md
   ↓
3. Deploy ✅
```

---

## 📞 CONTATOS DE SUPORTE

- **GitHub Issues:** /seu-usuario/ai-dlh/issues
- **Email:** seu-email@example.com
- **Docs:** docs/TROUBLESHOOTING.md
- **FAQ:** FAQ.md

---

## 🎉 RESULTADO FINAL

Após concluir, você terá:

✅ App em produção (URL pública)
✅ Smart contract na blockchain
✅ IA gerando conteúdo
✅ Certificados on-chain
✅ Dashboard funcional
✅ Projeto para portfólio

---

_Imprima este cartão para referência rápida_

**Versão:** 1.0 | **Data:** Nov 2025
**Projeto:** AI-DLH | **Licença:** MIT

---

**🚀 Comece agora:** [START-NOW.md](START-NOW.md)
