# ✅ Checklist de Progresso - AI-DLH Setup

**Data de início:** **_/_**/**_
**Horário:** _**:\_\_\_

---

## 📊 Resumo Rápido

| Fase               | Status | Tempo Estimado | Tempo Real     |
| ------------------ | ------ | -------------- | -------------- |
| 1. API Keys        | ⬜     | 10 min         | \_\_\_ min     |
| 2. Setup Local     | ⬜     | 20 min         | \_\_\_ min     |
| 3. Blockchain      | ⬜     | 10 min         | \_\_\_ min     |
| 4. Database        | ⬜     | 10 min         | \_\_\_ min     |
| 5. Teste Local     | ⬜     | 15 min         | \_\_\_ min     |
| 6. Deploy Produção | ⬜     | 30 min         | \_\_\_ min     |
| **TOTAL**          |        | **~1h 35min**  | **\_\_\_ min** |

---

## 🔑 FASE 1: API Keys (10 minutos)

### 1.1 Google Gemini API ⭐

- [ ] Acessei https://makersuite.google.com/app/apikey
- [ ] Fiz login com Google
- [ ] Cliquei "Create API Key"
- [ ] Copiei chave (começa com AIzaSy...)
- [ ] **Chave anotada:** `AIzaSy________________________`

### 1.2 Infura RPC ⭐

- [ ] Acessei https://infura.io
- [ ] Criei conta gratuita
- [ ] Criei projeto "AI-DLH"
- [ ] Copiei endpoint Sepolia
- [ ] **URL anotada:** `https://sepolia.infura.io/v3/____________`

### 1.3 Etherscan API (Opcional)

- [ ] Acessei https://etherscan.io/myapikey
- [ ] Criei conta
- [ ] Gerei API Key
- [ ] **Chave anotada:** `_______________________________`

**✅ Fase 1 Completa:** **_:_** | Tempo gasto: \_\_\_ min

---

## 🛠️ FASE 2: Setup Local (20 minutos)

### 2.1 Instalação

- [ ] Executei `npm run setup`
- [ ] Todas dependências instaladas sem erros
- [ ] **Tempo:** \_\_\_ min

### 2.2 Arquivo .env

- [ ] Copiei `.env.example` para `.env`
- [ ] Abri `.env` no editor

### 2.3 Variáveis Básicas

- [ ] Adicionei `GEMINI_API_KEY=...`
- [ ] Adicionei `ETHEREUM_RPC_URL=...`
- [ ] Adicionei `ETHERSCAN_API_KEY=...` (opcional)

### 2.4 JWT Secret

- [ ] Executei `Generate-JWTSecret` (ou `openssl rand -base64 32`)
- [ ] Copiei resultado para `.env`
- [ ] **JWT_SECRET:** `_________________________________`

### 2.5 Wallet Backend

- [ ] Executei `cd contracts && npm run generate:wallet`
- [ ] **Endereço gerado:** `0x_______________________________________`
- [ ] **Private Key:** `0x_______________________________________________`
- [ ] Copiei `PRIVATE_KEY` para `.env`
- [ ] ⚠️ Verifiquei que `.env` está no `.gitignore`

### 2.6 ETH Testnet

- [ ] Acessei https://sepoliafaucet.com
- [ ] Colei endereço da wallet
- [ ] Solicitei ETH
- [ ] Aguardei 1-2 minutos
- [ ] Verifiquei saldo no Etherscan: https://sepolia.etherscan.io/address/****\_\_\_****
- [ ] **Saldo:** \_\_\_ ETH

**✅ Fase 2 Completa:** **_:_** | Tempo gasto: \_\_\_ min

---

## ⛓️ FASE 3: Blockchain (10 minutos)

### 3.1 Deploy Contrato

- [ ] Executei `cd contracts && npm run deploy:sepolia`
- [ ] Deploy bem-sucedido
- [ ] **Contract Address:** `0x_______________________________________`
- [ ] **Transaction Hash:** `0x_______________________________________________`
- [ ] Copiei `CONTRACT_ADDRESS` para `.env`

### 3.2 Verificação (Opcional)

- [ ] Executei `npx hardhat verify --network sepolia 0x...`
- [ ] Contrato verificado no Etherscan
- [ ] **Link Etherscan:** `https://sepolia.etherscan.io/address/_____________`

**✅ Fase 3 Completa:** **_:_** | Tempo gasto: \_\_\_ min

---

## 🗄️ FASE 4: Database (10 minutos)

### Opção A: Vercel Postgres (Recomendado)

- [ ] Acessei https://vercel.com/dashboard/stores
- [ ] Criei database "ai-dlh-db"
- [ ] Copiei `DATABASE_URL`
- [ ] **DATABASE_URL:** `postgresql://___________________________`
- [ ] Adicionei ao `.env`

### Opção B: PostgreSQL Local

- [ ] Executei Docker run postgres
- [ ] Database rodando na porta 5432
- [ ] Adicionei `DATABASE_URL` ao `.env`

### 4.1 Migrations

- [ ] Executei `cd server && npm run db:generate`
- [ ] Executei `npm run db:push`
- [ ] Migrations aplicadas com sucesso
- [ ] Tabelas criadas: users, modules, progress_records

**✅ Fase 4 Completa:** **_:_** | Tempo gasto: \_\_\_ min

---

## 🧪 FASE 5: Teste Local (15 minutos)

### 5.1 Verificação .env

- [ ] Executei `Check-EnvFile`
- [ ] Todas variáveis obrigatórias preenchidas:
  - [ ] GEMINI_API_KEY
  - [ ] DATABASE_URL
  - [ ] ETHEREUM_RPC_URL
  - [ ] PRIVATE_KEY
  - [ ] CONTRACT_ADDRESS
  - [ ] JWT_SECRET

### 5.2 Backend

- [ ] Executei `cd server && npm run dev`
- [ ] Backend iniciou sem erros
- [ ] Porta 3000 está rodando
- [ ] **Logs:** ✅ Sem erros

### 5.3 Health Check

- [ ] Acessei http://localhost:3000/health
- [ ] **Status:** healthy
- [ ] **Database:** ok
- [ ] **Blockchain:** ok
- [ ] **AI:** ok

### 5.4 Frontend

- [ ] Executei `cd frontend && npm run dev`
- [ ] Frontend iniciou sem erros
- [ ] Porta 5173 está rodando
- [ ] Página carrega no navegador

### 5.5 Teste Manual Completo

- [ ] **Autenticação**

  - [ ] Conectei MetaMask
  - [ ] Mudei para rede Sepolia
  - [ ] Assinei mensagem
  - [ ] Redirect para dashboard funcionou

- [ ] **Gerar Módulo**

  - [ ] Preenchi tópico: "****\_\_\_\_****"
  - [ ] Selecionei nível: ****\_\_\_\_****
  - [ ] Cliquei "Gerar com IA"
  - [ ] Aguardei 5-10 segundos
  - [ ] Módulo apareceu na lista

- [ ] **Quiz**

  - [ ] Cliquei "Estudar"
  - [ ] Conteúdo carregou
  - [ ] Iniciei quiz
  - [ ] Respondi todas perguntas
  - [ ] Finalizei quiz

- [ ] **Resultado + Blockchain**
  - [ ] Vi meu score: \_\_\_\_%
  - [ ] Se ≥70%: Vi mensagem de blockchain
  - [ ] Vi link para Etherscan
  - [ ] Cliquei e verifiquei transação
  - [ ] **TX Hash:** `0x_______________________________________________`

**✅ Fase 5 Completa:** **_:_** | Tempo gasto: \_\_\_ min

---

## 🚀 FASE 6: Deploy Produção (30 minutos)

### 6.1 Git

- [ ] Executei `git status`
- [ ] Verifiquei que `.env` NÃO aparece
- [ ] Executei `git add .`
- [ ] Executei `git commit -m "feat: production ready"`
- [ ] Executei `git push`

### 6.2 Vercel - Criar Projeto

- [ ] Acessei https://vercel.com/new
- [ ] Importei repositório GitHub
- [ ] Configurei:
  - [ ] Framework Preset: Vite
  - [ ] Root Directory: `./`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `frontend/dist`
  - [ ] Install Command: `npm run setup`

### 6.3 Environment Variables

Adicionei TODAS as variáveis (copiar do .env local):

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `GEMINI_API_KEY=...`
- [ ] `DATABASE_URL=...`
- [ ] `ETHEREUM_RPC_URL=...`
- [ ] `PRIVATE_KEY=...`
- [ ] `CONTRACT_ADDRESS=...`
- [ ] `ETHERSCAN_API_KEY=...`
- [ ] `JWT_SECRET=...`
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `FRONTEND_URL=https://_____.vercel.app`
- [ ] `VITE_API_URL=https://_____.vercel.app/trpc`

- [ ] Marquei "Add to all environments"

### 6.4 Deploy

- [ ] Cliquei "Deploy"
- [ ] Aguardei 2-5 minutos
- [ ] Build concluído com sucesso
- [ ] **URL Produção:** `https://________________________________.vercel.app`

### 6.5 Atualizar URLs

- [ ] Copiei URL final do Vercel
- [ ] Editei variáveis de ambiente:
  - [ ] `FRONTEND_URL` atualizado
  - [ ] `VITE_API_URL` atualizado
- [ ] Fiz Redeploy

### 6.6 Teste Produção

- [ ] Acessei URL de produção
- [ ] Landing page carregou
- [ ] Conectei MetaMask (Sepolia)
- [ ] Autentiquei com sucesso
- [ ] Gerei módulo
- [ ] Fiz quiz
- [ ] Verifiquei blockchain
- [ ] **Tudo funcionando:** ✅

**✅ Fase 6 Completa:** **_:_** | Tempo gasto: \_\_\_ min

---

## 🎉 FINALIZAÇÃO

### Checklist Final

- [ ] ✅ App rodando em produção
- [ ] ✅ URL pública funcionando
- [ ] ✅ Health check retorna OK
- [ ] ✅ Login MetaMask funciona
- [ ] ✅ Geração de módulo funciona
- [ ] ✅ Quiz funciona
- [ ] ✅ Blockchain registra certificados
- [ ] ✅ Links Etherscan funcionam
- [ ] ✅ Sem erros no console
- [ ] ✅ Projeto commitado no Git
- [ ] ✅ Documentação lida

### Informações do Deploy

**URL Produção:** `_____________________________________________`

**Contract Address:** `0x_______________________________________`

**Data Conclusão:** **_/_**/**_ às _**:\_\_\_

**Tempo Total:** \_\_\_ minutos

---

## 📝 Notas e Observações

Espaço para anotar problemas encontrados ou observações:

```
___________________________________________________________________

___________________________________________________________________

___________________________________________________________________

___________________________________________________________________

___________________________________________________________________
```

---

## 🎊 PARABÉNS!

Você completou todo o setup do AI-DLH!

### Próximos Passos Sugeridos:

- [ ] Compartilhar link em redes sociais
- [ ] Adicionar ao portfólio pessoal
- [ ] Criar post no LinkedIn sobre o projeto
- [ ] Enviar para recrutadores
- [ ] Continuar desenvolvendo novas features
- [ ] Documentar jornada de desenvolvimento

---

## 🔗 Links Importantes

- **Produção:** https://________________________________.vercel.app
- **Etherscan:** https://sepolia.etherscan.io/address/******\_\_******
- **GitHub:** https://github.com/**************\_\_\_\_**************
- **Vercel Dashboard:** https://vercel.com/dashboard

---

**🚀 Setup concluído com sucesso!**
