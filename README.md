# 🚀 AI-Powered Decentralized Learning Hub (AI-DLH)

Hub de aprendizado personalizado que usa **IA Generativa** para criar conteúdo educacional sob demanda e **registra progresso em blockchain**. Projeto de portfólio demonstrando proficiência em Frontend, Full Stack, IA Generativa e Web3.

![Stack](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Stack Tecnológico](#stack-tecnológico)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Deploy](#deploy)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Testes](#testes)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## 🎯 Sobre o Projeto

O AI-DLH é uma plataforma educacional que combina:

- **IA Generativa (Gemini)**: Gera módulos de aprendizado personalizados baseados no tópico e nível escolhido pelo usuário
- **Blockchain (Ethereum)**: Registra conclusões de módulos (score ≥ 70%) como certificados permanentes na blockchain
- **Web3 Auth**: Autenticação descentralizada via MetaMask
- **Type-safe API (tRPC)**: Comunicação frontend-backend com type safety end-to-end

### Demonstração de Competências

- ✅ Frontend moderno (React 18, TypeScript, Tailwind CSS)
- ✅ Arquitetura escalável (Atomic Design, Clean Code)
- ✅ Backend robusto (Node.js, tRPC, Drizzle ORM)
- ✅ Smart Contracts seguros (Solidity, OpenZeppelin)
- ✅ Integração IA (Google Gemini API)
- ✅ Web3 (ethers.js, MetaMask)
- ✅ DevOps (CI/CD, Docker-ready)
- ✅ Testes (Unit, Integration, E2E)

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript (strict mode)
- **Build**: Vite 5
- **Styling**: Tailwind CSS
- **State**: Zustand
- **API Client**: tRPC React

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express
- **API**: tRPC (type-safe)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Logger**: Winston

### Blockchain
- **Smart Contract**: Solidity 0.8.20
- **Framework**: Hardhat
- **Library**: ethers.js v6
- **Network**: Ethereum Sepolia (testnet)

### IA
- **Model**: Google Gemini 1.5 Flash
- **Usage**: Geração de conteúdo educacional

### DevOps
- **CI/CD**: GitHub Actions
- **Deploy**: Vercel
- **Tests**: Vitest, Hardhat

## ✨ Funcionalidades

### Para Usuários

1. **Autenticação Web3**
   - Login via MetaMask (assinatura de mensagem)
   - Sessão segura com JWT

2. **Geração de Módulos com IA**
   - Digite um tópico (ex: "TypeScript", "React Hooks")
   - Escolha o nível (Iniciante, Intermediário, Avançado)
   - IA gera conteúdo personalizado + quiz

3. **Sistema de Quiz**
   - 4-5 perguntas de múltipla escolha
   - Feedback imediato
   - Explicações das respostas corretas

4. **Certificação Blockchain**
   - Score ≥ 70% → Registro automático na blockchain
   - Certificado permanente e verificável
   - Link para Etherscan

5. **Dashboard de Progresso**
   - Estatísticas (módulos, score médio, aprovações)
   - Histórico de módulos
   - Registros blockchain

## 📦 Pré-requisitos

- **Node.js** 20+
- **npm** ou **yarn**
- **Git**
- **MetaMask** (extensão do navegador)
- **Conta Infura/Alchemy** (RPC Ethereum)
- **Google Gemini API Key**

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/ai-dlh.git
cd ai-dlh
```

### 2. Instale as dependências

```bash
# Instalar em todos os subprojetos
npm run setup

# Ou manualmente:
npm install
cd frontend && npm install
cd ../server && npm install
cd ../contracts && npm install
```

## ⚙️ Configuração

### 1. Copie o arquivo de ambiente

```bash
cp .env.example .env
```

### 2. Configure as variáveis de ambiente

Edite o arquivo `.env` e preencha:

```bash
# IA
GEMINI_API_KEY=sua_chave_aqui  # https://makersuite.google.com/app/apikey

# Database
DATABASE_URL=postgresql://...   # Vercel Postgres ou local

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID
PRIVATE_KEY=0x...               # Gerar com: npm run generate:wallet
CONTRACT_ADDRESS=0x...          # Após deploy

# Auth
JWT_SECRET=seu_secret_seguro    # openssl rand -base64 32
```

### 3. Gere uma wallet para o backend

```bash
npm run generate:wallet
```

**⚠️ IMPORTANTE:**
- Esta wallet é APENAS para o backend
- Adicione o `PRIVATE_KEY` no `.env`
- Obtenha ETH testnet: https://sepoliafaucet.com

### 4. Deploy do Smart Contract

```bash
# Certifique-se de ter ETH na wallet
npm run deploy:contract

# Copie o endereço do contrato para .env
# CONTRACT_ADDRESS=0x...

# Verifique no Etherscan (opcional)
npm run deploy:verify
```

### 5. Configure o banco de dados

```bash
# Gerar migrations
npm run db:generate

# Aplicar migrations
npm run db:push
```

## 🎮 Uso

### Desenvolvimento Local

```bash
# Iniciar frontend + backend simultaneamente
npm run dev

# Ou separadamente:
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3000
```

### Acessar a aplicação

1. Abra http://localhost:5173
2. Clique em "Conectar Carteira"
3. Aprove a conexão no MetaMask
4. Assine a mensagem de autenticação
5. Comece a gerar módulos!

## 🧪 Testes

```bash
# Todos os testes
npm run test

# Smart contracts
npm run test:contract

# Backend
npm run test:backend

# E2E (Cypress)
npm run test:e2e
```

## 🌐 Deploy

### Deploy na Vercel

1. Crie um projeto na Vercel
2. Conecte o repositório GitHub
3. Configure as variáveis de ambiente (todas do .env)
4. Deploy!

```bash
# Ou via CLI
npx vercel --prod
```

### Variáveis de ambiente necessárias na Vercel:

- `GEMINI_API_KEY`
- `DATABASE_URL`
- `ETHEREUM_RPC_URL`
- `PRIVATE_KEY`
- `CONTRACT_ADDRESS`
- `JWT_SECRET`
- `FRONTEND_URL` (URL da Vercel)

## 📁 Estrutura do Projeto

```
ai-dlh/
├── contracts/              # Smart contracts Solidity
│   ├── contracts/
│   │   └── LearningProgress.sol
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── generate-wallet.ts
│   └── test/
│       └── LearningProgress.test.ts
│
├── server/                 # Backend Node.js
│   ├── routers/           # tRPC routers
│   ├── services/          # Business logic
│   ├── db/                # Database schema
│   ├── middleware/        # Auth, CORS
│   └── index.ts           # Server entry
│
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # Zustand stores
│   │   └── lib/           # Utils, tRPC
│   └── index.html
│
├── .github/workflows/     # CI/CD
├── .env.example          # Environment template
├── vercel.json           # Vercel config
└── package.json          # Root scripts
```

## 🗺️ Roadmap

- [x] Smart contract deployment
- [x] Backend API (tRPC)
- [x] Frontend básico
- [x] Autenticação Web3
- [x] Geração de módulos com IA
- [x] Sistema de quiz
- [x] Registro blockchain
- [ ] Página de módulo individual
- [ ] Sistema de quiz interativo completo
- [ ] Perfil do usuário
- [ ] Rankings e badges
- [ ] Mobile responsivo
- [ ] PWA
- [ ] Internacionalização (i18n)

## 📊 API Costs (Free Tier)

| Serviço | Tier | Custo |
|---------|------|-------|
| Vercel | Free | $0 |
| Vercel Postgres | 256MB | $0 |
| Gemini API | 1500 req/dia | $0 |
| Infura | 100k req/dia | $0 |
| Sepolia Testnet | - | $0 |
| **TOTAL** | | **$0/mês** |

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- **Google Gemini** - IA Generativa
- **OpenZeppelin** - Smart contract libraries
- **Vercel** - Hospedagem
- **Ethereum Foundation** - Blockchain
- **React Team** - Framework

---

**Desenvolvido como projeto de portfólio demonstrando expertise em:**
Frontend • Full Stack • IA Generativa • Web3 • Blockchain

⭐ Se este projeto foi útil, considere dar uma estrela!

📧 Contato: seu-email@example.com
