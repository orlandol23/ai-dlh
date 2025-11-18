# 📚 Documentação do AI-DLH

Bem-vindo à documentação completa do AI-Powered Decentralized Learning Hub.

## 📋 Índice de Documentação

### 🚀 Começando

- **[README Principal](../README.md)** - Visão geral do projeto, features, stack
- **[Quick Start](../QUICKSTART.md)** - Guia de início rápido (10 minutos)
- **[Instalação Completa](../README.md#instalação)** - Setup detalhado passo a passo

### 🏗️ Arquitetura e Design

- **[Arquitetura do Sistema](./ARCHITECTURE.md)** - Diagramas, fluxos de dados, componentes
  - Visão geral das 3 camadas
  - Componentes do Frontend (Atomic Design)
  - Estrutura do Backend (tRPC + Services)
  - Smart Contracts (Solidity)
  - Fluxos completos (Auth, IA, Blockchain)
  - Segurança e Performance

### 📡 API Reference

- **[Documentação da API](./API.md)** - Referência completa dos endpoints tRPC
  - Router: `auth` - Autenticação Web3
  - Router: `ai` - Geração de módulos com IA
  - Router: `progress` - Quiz e estatísticas
  - Router: `web3` - Queries blockchain
  - Tipos TypeScript
  - Exemplos de uso
  - Error handling

### 🚀 Deploy e Produção

- **[Guia de Deploy](./DEPLOYMENT.md)** - Deploy completo para produção
  - Preparação e pré-requisitos
  - Deploy do Smart Contract (Sepolia)
  - Setup do Database (PostgreSQL)
  - Deploy na Vercel
  - Configurações pós-deploy
  - CI/CD com GitHub Actions
  - Monitoramento e scaling

### 🔧 Troubleshooting

- **[Solução de Problemas](./TROUBLESHOOTING.md)** - Problemas comuns e soluções
  - Instalação e setup
  - Desenvolvimento local
  - Blockchain e Web3
  - IA e Gemini API
  - Database
  - Deploy e produção
  - Debugging geral

### 🤝 Contribuindo

- **[Contributing Guidelines](../CONTRIBUTING.md)** - Como contribuir para o projeto
  - Reportar bugs
  - Sugerir features
  - Pull requests
  - Padrões de código
  - Commits convencionais

### 📄 Legal

- **[Licença MIT](../LICENSE)** - Termos de uso

---

## 🎯 Documentação por Perfil

### Para Desenvolvedores Frontend

Recomendamos ler nesta ordem:

1. [README Principal](../README.md) - Overview
2. [Quick Start](../QUICKSTART.md) - Setup rápido
3. [Arquitetura](./ARCHITECTURE.md) - Seção Frontend
4. [API](./API.md) - Endpoints que usará
5. [Troubleshooting](./TROUBLESHOOTING.md) - Problemas comuns

**Arquivos importantes:**
```
frontend/
├── src/components/     # Componentes React
├── src/pages/          # Páginas (rotas)
├── src/hooks/          # Custom hooks
├── src/lib/trpc.ts     # tRPC client
└── src/store/          # Zustand stores
```

### Para Desenvolvedores Backend

Recomendamos ler nesta ordem:

1. [README Principal](../README.md) - Overview
2. [Arquitetura](./ARCHITECTURE.md) - Seção Backend
3. [API](./API.md) - Endpoints completos
4. [Deployment](./DEPLOYMENT.md) - Setup de database
5. [Troubleshooting](./TROUBLESHOOTING.md) - Database e API

**Arquivos importantes:**
```
server/
├── routers/            # tRPC routers (API)
├── services/           # Business logic
│   ├── ai.service.ts   # Gemini API
│   ├── web3.service.ts # ethers.js
│   └── auth.service.ts # JWT + Web3
├── db/schema.ts        # Database schema
└── index.ts            # Server entry
```

### Para Desenvolvedores Blockchain

Recomendamos ler nesta ordem:

1. [README Principal](../README.md) - Overview
2. [Arquitetura](./ARCHITECTURE.md) - Seção Smart Contracts
3. [Deployment](./DEPLOYMENT.md) - Deploy do contrato
4. [Troubleshooting](./TROUBLESHOOTING.md) - Blockchain e Web3

**Arquivos importantes:**
```
contracts/
├── contracts/LearningProgress.sol  # Main contract
├── test/LearningProgress.test.ts   # Tests
├── scripts/deploy.ts               # Deploy script
└── hardhat.config.ts               # Hardhat config
```

### Para DevOps / SRE

Recomendamos ler nesta ordem:

1. [Deployment](./DEPLOYMENT.md) - Guia completo
2. [Troubleshooting](./TROUBLESHOOTING.md) - Problemas comuns
3. [Arquitetura](./ARCHITECTURE.md) - Infraestrutura

**Arquivos importantes:**
```
.github/workflows/ci.yml  # CI/CD pipeline
vercel.json               # Vercel config
.env.example              # Environment vars
```

---

## 📖 Guias Rápidos

### Como gerar um módulo com IA?

```typescript
// Frontend
const module = await trpc.ai.generateModule.mutate({
  topic: "React Hooks",
  level: "intermediate"
});

// Retorna módulo completo com conteúdo + quiz
```

Detalhes: [API.md → ai.generateModule](./API.md#aigeneratemodule-mutation-)

---

### Como autenticar com MetaMask?

```typescript
// Frontend
const { connectWallet } = useAuth();

// User clica botão
await connectWallet();

// MetaMask abre → User assina → Autenticado!
```

Fluxo completo: [ARCHITECTURE.md → Fluxo 1](./ARCHITECTURE.md#fluxo-1-autenticação-web3)

---

### Como registrar na blockchain?

```typescript
// Automático após quiz!
const result = await trpc.progress.submitQuiz.mutate({
  moduleId: 123,
  answers: [0, 2, 1, 3]
});

if (result.score >= 70) {
  console.log('Registrado on-chain!');
  console.log('TX:', result.transactionHash);
}
```

Fluxo completo: [ARCHITECTURE.md → Fluxo 3](./ARCHITECTURE.md#fluxo-3-quiz-e-registro-blockchain)

---

## 🔍 Busca Rápida

### Por Tecnologia

- **React**: [ARCHITECTURE.md](./ARCHITECTURE.md) (seção Frontend)
- **tRPC**: [API.md](./API.md)
- **Solidity**: [ARCHITECTURE.md](./ARCHITECTURE.md) (seção Smart Contract)
- **Gemini AI**: [API.md](./API.md#router-ai) + [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#ia-e-gemini-api)
- **ethers.js**: [ARCHITECTURE.md](./ARCHITECTURE.md) (seção Web3)
- **PostgreSQL**: [DEPLOYMENT.md](./DEPLOYMENT.md#setup-do-database)
- **Vercel**: [DEPLOYMENT.md](./DEPLOYMENT.md#deploy-na-vercel)

### Por Erro

- **CORS**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#backend-não-conecta-com-frontend)
- **MetaMask**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#metamask-não-detectado)
- **Database**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#erro-cannot-connect-to-database)
- **Gemini API**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#erro-api-key-inválida)
- **Build failed**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#build-falha-na-vercel)

---

## 📊 Recursos Adicionais

### Diagramas

- [Arquitetura de 3 camadas](./ARCHITECTURE.md#visão-geral)
- [Atomic Design do Frontend](./ARCHITECTURE.md#11-camadas-de-componentes-atomic-design)
- [Database Schema](./ARCHITECTURE.md#24-database-schema)

### Exemplos de Código

- [Autenticação Web3](./API.md#authlogin-mutation)
- [Geração de módulo](./API.md#aigeneratemodule-mutation-)
- [Submit quiz](./API.md#progresssubmitquiz-mutation-)

### Fluxos Completos

- [Login com MetaMask](./ARCHITECTURE.md#fluxo-1-autenticação-web3)
- [Gerar módulo com IA](./ARCHITECTURE.md#fluxo-2-geração-de-módulo-com-ia)
- [Quiz e blockchain](./ARCHITECTURE.md#fluxo-3-quiz-e-registro-blockchain)

---

## 🆘 Precisa de Ajuda?

1. **Verifique a documentação relevante acima**
2. **Consulte [Troubleshooting](./TROUBLESHOOTING.md)**
3. **Veja [Issues no GitHub](https://github.com/seu-usuario/ai-dlh/issues)**
4. **Abra uma nova issue** com detalhes do problema

---

## 🔄 Atualizações da Documentação

A documentação é atualizada continuamente. Última atualização: **Janeiro 2024**

**Contribua:** Encontrou erro ou sugestão? Abra PR em [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Stack:** React 18 • TypeScript • Node.js • tRPC • Solidity • ethers.js • Gemini AI

**Licença:** MIT
