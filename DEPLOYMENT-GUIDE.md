# 🚀 Guia de Deploy para Produção - Vercel

Este guia contém **todos os passos necessários** para fazer o deploy do AI-DLH na Vercel.

---

## 📋 Pré-requisitos de Deploy

Antes de fazer o deploy, certifique-se de que você completou:

- ✅ Fase 1-4 do setup local (API keys, database, blockchain)
- ✅ Fase 5: Testes locais funcionando
- ✅ Smart contract deployado e verificado no Sepolia
- ✅ Database (Vercel Postgres) configurado e com migrations aplicadas
- ✅ Código commitado no GitHub

---

## 🎯 Fase 6: Deploy na Vercel

### Passo 1: Preparar o Repositório GitHub

```bash
# 1. Certifique-se de que está no branch principal
git checkout main

# 2. Commit todas as mudanças pendentes
git add .
git commit -m "chore: prepare for production deployment"

# 3. Push para o GitHub
git push origin main
```

**⚠️ IMPORTANTE:** Verifique se o `.env` está no `.gitignore` (NÃO commit secrets!)

---

### Passo 2: Criar Projeto na Vercel

1. Acesse https://vercel.com
2. Clique em **"Add New..."** → **"Project"**
3. **Import** seu repositório do GitHub
4. Configure o projeto:
   - **Framework Preset**: `Other` (usaremos configuração customizada)
   - **Root Directory**: deixe `.` (raiz do projeto)
   - **Build Command**: `npm run build` (ou deixe padrão)
   - **Output Directory**: deixe padrão

---

### Passo 3: Configurar Variáveis de Ambiente

Na página de configuração do projeto, vá para **"Environment Variables"** e adicione:

#### 🔑 Variáveis OBRIGATÓRIAS

```bash
# ====================================
# IA - Google Gemini
# ====================================
GEMINI_API_KEY=sua_chave_gemini_aqui

# ====================================
# Database - Vercel Postgres
# ====================================
DATABASE_URL=postgresql://user:pass@host.vercel-storage.com:5432/db

# Copie o POSTGRES_URL do seu Vercel Postgres Storage
# Vercel > Storage > Seu Database > .env.local

# ====================================
# Blockchain - Ethereum Sepolia
# ====================================
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID
PRIVATE_KEY=0xSUA_PRIVATE_KEY_AQUI
CONTRACT_ADDRESS=0xSEU_CONTRACT_ADDRESS_AQUI
ETHERSCAN_API_KEY=sua_chave_etherscan

# ====================================
# Authentication
# ====================================
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d

# ====================================
# Application
# ====================================
NODE_ENV=production
PORT=3000

# Nota: FRONTEND_URL será configurado automaticamente pela Vercel
# Mas você pode adicionar se quiser ser explícito:
# FRONTEND_URL=https://seu-app.vercel.app

# ====================================
# Frontend (VITE)
# ====================================
# Esta será configurada depois do primeiro deploy
# VITE_API_URL=https://seu-app.vercel.app/trpc
```

#### 📝 Como adicionar cada variável:

1. Clique em **"Add Another"** ou **"Environment Variables"**
2. **Key**: Nome da variável (ex: `GEMINI_API_KEY`)
3. **Value**: Valor da variável (cole o valor)
4. **Environment**: Selecione `Production`, `Preview`, e `Development` (todas)
5. Clique **"Add"**
6. Repita para todas as variáveis

---

### Passo 4: Configurar Build Settings

Ainda na configuração do projeto:

#### Build & Development Settings

- **Framework Preset**: `Other`
- **Build Command**: Deixe padrão ou use:
  ```bash
  npm run build
  ```
- **Output Directory**: Deixe padrão
- **Install Command**: Deixe padrão ou use:
  ```bash
  npm install
  ```

#### Root Directory

- Deixe como `.` (raiz do projeto)

---

### Passo 5: Deploy Inicial

1. Clique em **"Deploy"**
2. Aguarde o build (pode levar 2-5 minutos)
3. Se o build falhar:
   - Verifique os logs de erro
   - Confirme que todas as variáveis de ambiente estão corretas
   - Tente novamente

---

### Passo 6: Configurar VITE_API_URL

Após o primeiro deploy bem-sucedido:

1. Copie a URL do seu app (ex: `https://ai-dlh.vercel.app`)
2. Volte para **Settings** → **Environment Variables**
3. Adicione uma nova variável:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://ai-dlh.vercel.app/trpc` (substitua pela sua URL)
   - **Environment**: Todas (Production, Preview, Development)
4. Clique em **"Save"**
5. **Redeploy** o projeto:
   - Vá para **Deployments**
   - Clique nos **três pontinhos** do último deployment
   - Clique em **"Redeploy"**

---

### Passo 7: Testar a Aplicação em Produção

1. Acesse `https://seu-app.vercel.app`
2. Teste as funcionalidades principais:
   - ✅ Conectar com MetaMask
   - ✅ Gerar módulo com IA
   - ✅ Fazer quiz
   - ✅ Verificar registro na blockchain (Etherscan)
   - ✅ Dashboard com estatísticas

---

## 🔧 Configuração Avançada (Opcional)

### Custom Domain

1. **Settings** → **Domains**
2. Adicione seu domínio customizado
3. Configure DNS conforme instruções da Vercel

### Analytics

1. **Analytics** → Habilite Vercel Analytics (grátis)
2. Monitore performance e Core Web Vitals

### Speed Insights

1. **Speed Insights** → Habilite (grátis)
2. Obtenha insights de performance em tempo real

---

## 🐛 Troubleshooting Comum

### ❌ "Build Failed"

**Causa**: Erro de build no frontend ou backend

**Solução**:

1. Verifique os logs de build na Vercel
2. Teste o build localmente:
   ```bash
   npm run build
   ```
3. Corrija erros de TypeScript ou dependências

### ❌ "Environment Variable Not Found"

**Causa**: Variável de ambiente não configurada ou nome incorreto

**Solução**:

1. Vá para **Settings** → **Environment Variables**
2. Verifique se todas as variáveis do `.env.example` estão presentes
3. Verifique se os nomes estão EXATAMENTE iguais (case-sensitive)
4. Redeploy após adicionar/corrigir

### ❌ "Database Connection Error"

**Causa**: `DATABASE_URL` incorreto ou database não acessível

**Solução**:

1. Verifique se o Vercel Postgres está ativo
2. Copie a `POSTGRES_URL` correta do Vercel Storage
3. Certifique-se de que as migrations foram aplicadas:
   ```bash
   npm run db:push
   ```

### ❌ "API Request Failed" ou CORS Error

**Causa**: `VITE_API_URL` não configurado ou incorreto

**Solução**:

1. Adicione `VITE_API_URL` com a URL completa da sua aplicação
2. Formato: `https://seu-app.vercel.app/trpc` (com `/trpc` no final)
3. Redeploy

### ❌ "MetaMask Connection Failed"

**Causa**: RPC URL ou Contract Address incorretos

**Solução**:

1. Verifique `ETHEREUM_RPC_URL` (deve ser Sepolia)
2. Verifique `CONTRACT_ADDRESS` (deve ser o endereço deployado)
3. Teste o contrato no Etherscan: `https://sepolia.etherscan.io/address/SEU_CONTRATO`

### ❌ "AI Generation Failed"

**Causa**: `GEMINI_API_KEY` inválido ou limite excedido

**Solução**:

1. Verifique se a API key está correta
2. Teste a key localmente primeiro
3. Verifique quota em: https://makersuite.google.com/app/apikey
4. Free tier: 1500 requisições/dia

### ❌ "Blockchain Transaction Failed"

**Causa**: Wallet sem ETH ou `PRIVATE_KEY` incorreto

**Solução**:

1. Verifique se a wallet tem ETH Sepolia:
   ```bash
   # Verifique no Etherscan
   https://sepolia.etherscan.io/address/SUA_WALLET
   ```
2. Obtenha ETH grátis: https://sepoliafaucet.com
3. Verifique se `PRIVATE_KEY` começa com `0x`

---

## ✅ Checklist Final de Deploy

Use este checklist para garantir que tudo está configurado:

### Pré-Deploy

- [ ] Código commitado e pushed no GitHub
- [ ] `.env` no `.gitignore` (não commitado)
- [ ] Build local funciona: `npm run build`
- [ ] Testes locais passam: `npm run test`
- [ ] Smart contract deployado e verificado
- [ ] Database migrations aplicadas

### Durante Deploy

- [ ] Projeto criado na Vercel
- [ ] Repositório GitHub importado
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Build bem-sucedido (sem erros)
- [ ] `VITE_API_URL` configurado com URL da Vercel
- [ ] Redeploy após adicionar `VITE_API_URL`

### Pós-Deploy

- [ ] Aplicação acessível via HTTPS
- [ ] MetaMask conecta corretamente
- [ ] Geração de módulos funciona
- [ ] Quiz funciona
- [ ] Registro blockchain funciona
- [ ] Dashboard mostra estatísticas
- [ ] Transação visível no Etherscan
- [ ] Logs de erro vazios/normais

---

## 📊 Monitoramento Pós-Deploy

### Logs em Tempo Real

1. **Vercel Dashboard** → **Functions** → Veja logs de cada função
2. Monitore erros e performance
3. Configure alertas (opcional)

### Etherscan

1. Acesse `https://sepolia.etherscan.io/address/SEU_CONTRATO`
2. Veja transações em tempo real
3. Verifique eventos `ModuleCompleted`

### Database

1. **Vercel** → **Storage** → Seu Database
2. Use o **Query Editor** para consultas SQL
3. Monitore tamanho e limites (256MB free tier)

---

## 🎉 Deploy Completo!

Parabéns! Sua aplicação está em produção. 🚀

**Próximos passos:**

- Compartilhe a URL com recrutadores/portfolio
- Adicione custom domain (opcional)
- Configure analytics
- Monitore performance e erros

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os **logs da Vercel** primeiro
2. Consulte o [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
3. Revise este guia e o [SETUP-GUIDE.md](docs/SETUP-GUIDE.md)
4. Abra uma issue no GitHub

---

**Desenvolvido com 💙 por [Seu Nome]**
