# 🏗️ Arquitetura do AI-DLH

Este documento descreve a arquitetura completa do sistema AI-Powered Decentralized Learning Hub.

## 📐 Visão Geral

O AI-DLH segue uma arquitetura **três camadas** moderna:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages      │  │  Components  │  │    Hooks     │  │
│  │ (HomePage,   │→ │  (Atoms,     │→ │  (useAuth,   │  │
│  │  Dashboard)  │  │   Molecules) │  │   useTRPC)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                          ↓                               │
│                    tRPC Client                           │
└─────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + tRPC)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routers    │→ │   Services   │→ │  Database    │  │
│  │ (auth, ai,   │  │ (AI, Web3,   │  │ (PostgreSQL) │  │
│  │  progress)   │  │   Auth)      │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                          ↓                               │
└─────────────────────────────────────────────────────────┘
            ↓                           ↓
    ┌───────────────┐         ┌────────────────┐
    │  Gemini API   │         │   Ethereum     │
    │  (Google AI)  │         │  (Blockchain)  │
    └───────────────┘         └────────────────┘
```

## 🎯 Componentes Principais

### 1. Frontend (React + TypeScript)

#### **1.1 Camadas de Componentes (Atomic Design)**

```
Atoms (componentes básicos)
  └─ Button, Input, Card, Badge
      ↓
Molecules (combinações simples)
  └─ FormGeneration, QuizQuestion
      ↓
Organisms (seções completas)
  └─ Header, Dashboard, QuizContainer
      ↓
Templates (layouts)
  └─ MainLayout, AuthLayout
      ↓
Pages (rotas)
  └─ HomePage, DashboardPage, ModulePage
```

#### **1.2 Gerenciamento de Estado**

- **Zustand** para estado global (auth)
- **React Query** (via tRPC) para estado do servidor
- **React State** para estado local de componentes

```typescript
// Estado Global (Zustand)
authStore: {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// Estado do Servidor (React Query + tRPC)
- modules (lista de módulos)
- statistics (estatísticas do usuário)
- progress (progresso dos quizzes)
```

#### **1.3 Roteamento**

```
/ (HomePage)
  └─ Landing page pública
  └─ Botão "Conectar Carteira"

/dashboard (DashboardPage) [PROTEGIDO]
  └─ Requer autenticação
  └─ Formulário geração de módulo
  └─ Lista de módulos
  └─ Estatísticas

/module/:id (ModulePage) [PROTEGIDO]
  └─ Conteúdo do módulo
  └─ Quiz interativo
  └─ Resultado + blockchain
```

### 2. Backend (Node.js + Express + tRPC)

#### **2.1 Arquitetura em Camadas**

```
┌─────────────────────────────────────┐
│        tRPC Routers (API)           │  ← Endpoints públicos
├─────────────────────────────────────┤
│       Middleware (Auth)             │  ← Validação JWT
├─────────────────────────────────────┤
│     Services (Business Logic)       │  ← Lógica de negócio
├─────────────────────────────────────┤
│    Database Layer (Drizzle ORM)     │  ← Queries SQL
├─────────────────────────────────────┤
│   External APIs (Gemini, Ethers)    │  ← Integrações
└─────────────────────────────────────┘
```

#### **2.2 tRPC Routers**

```typescript
appRouter {
  auth: {
    login()           // Web3 authentication
    me()              // Get current user
    updateProfile()   // Update user data
  }

  ai: {
    generateModule()  // Generate with Gemini
    getUserModules()  // List user modules
    getModuleById()   // Get specific module
  }

  progress: {
    submitQuiz()      // Submit answers + blockchain
    getUserProgress() // Get progress history
    getStatistics()   // Get user stats
  }

  web3: {
    getBlockchainProgress()  // Query smart contract
    getCompletionCount()     // On-chain stats
    getAverageScore()        // On-chain average
  }
}
```

#### **2.3 Services**

**AI Service (ai.service.ts)**
- Gera conteúdo educacional via Gemini API
- Valida resposta com Zod
- Retorna módulo estruturado (título, conteúdo, quiz)

**Web3 Service (web3.service.ts)**
- Conecta com smart contract via ethers.js
- Registra completions on-chain
- Query de progresso blockchain
- Verifica assinaturas Web3

**Auth Service (auth.service.ts)**
- Valida assinaturas MetaMask
- Gera/valida JWT tokens
- CRUD de usuários

#### **2.4 Database Schema**

```sql
-- Usuários autenticados via Web3
users {
  id: serial
  walletAddress: varchar(42) UNIQUE
  name: varchar
  email: varchar
  createdAt: timestamp
  lastLoginAt: timestamp
}

-- Módulos gerados pela IA
modules {
  id: serial
  userId: int → users.id
  title: varchar
  content: text (markdown)
  topic: varchar
  level: enum(beginner, intermediate, advanced)
  quizData: json
  estimatedTime: int
  createdAt: timestamp
}

-- Progresso e resultados de quizzes
progressRecords {
  id: serial
  userId: int → users.id
  moduleId: int → modules.id
  score: int (0-100)
  answersData: json
  transactionHash: varchar(66) // se registrado on-chain
  blockchainStatus: enum(pending, confirmed, failed, none)
  completedAt: timestamp
}
```

### 3. Smart Contract (Solidity)

#### **3.1 LearningProgress.sol**

```solidity
contract LearningProgress {
  // Estrutura de dados
  struct Completion {
    uint256 moduleId;
    uint256 score;
    uint256 timestamp;
    string moduleTopic;
  }

  // Storage
  mapping(address => Completion[]) private userProgress;
  uint256 public totalCompletions;

  // Funções principais
  recordCompletion()      // Registra conclusão
  getUserProgress()       // Retorna array de completions
  getUserAverageScore()   // Calcula média on-chain
  getUserCompletionCount() // Conta total
}
```

#### **3.2 Segurança**

- ✅ **Ownable** (OpenZeppelin) - Controle de ownership
- ✅ **ReentrancyGuard** - Proteção contra reentrancy
- ✅ **Input Validation** - Score 0-100, strings não vazias
- ✅ **Events** - Logs de todas operações

## 🔄 Fluxos de Dados Principais

### **Fluxo 1: Autenticação Web3**

```
1. User clica "Conectar Carteira"
   ↓
2. Frontend detecta MetaMask
   ↓
3. MetaMask → eth_requestAccounts (popup)
   ↓
4. User aprova conexão
   ↓
5. Frontend cria mensagem de autenticação
   "AI-DLH Auth\nAddress: 0x...\nTime: 1234567890"
   ↓
6. MetaMask → signMessage (popup)
   ↓
7. User assina mensagem (sem custo de gas)
   ↓
8. Frontend → tRPC.auth.login({ address, message, signature })
   ↓
9. Backend valida assinatura com ethers.verifyMessage()
   ↓
10. Backend cria/atualiza user no DB
   ↓
11. Backend gera JWT token
   ↓
12. Frontend armazena token + user no Zustand
   ↓
13. Redirect para /dashboard
```

### **Fluxo 2: Geração de Módulo com IA**

```
1. User preenche formulário
   - Tópico: "TypeScript"
   - Nível: "intermediate"
   ↓
2. Frontend → tRPC.ai.generateModule({ topic, level })
   ↓
3. Backend → ai.service.generateModule()
   ↓
4. Construção do prompt para Gemini:
   """
   Crie um módulo sobre "TypeScript" para nível intermediário.
   Retorne JSON: { title, content, quiz, estimatedTime }
   """
   ↓
5. Gemini API processa (2-5 segundos)
   ↓
6. Gemini retorna JSON estruturado
   ↓
7. Backend valida com Zod schema
   ↓
8. Backend salva no PostgreSQL (modules table)
   ↓
9. Backend retorna módulo completo
   ↓
10. Frontend atualiza lista de módulos
   ↓
11. User pode acessar módulo imediatamente
```

### **Fluxo 3: Quiz e Registro Blockchain**

```
1. User completa quiz (4-5 perguntas)
   ↓
2. Frontend envia respostas
   tRPC.progress.submitQuiz({ moduleId, answers: [0,2,1,3] })
   ↓
3. Backend busca módulo no DB
   ↓
4. Backend valida respostas (server-side)
   - Compara answers com quizData.correctAnswer
   - Calcula score: (corretas / total) * 100
   ↓
5. Backend salva em progressRecords
   - score, answersData, blockchainStatus: "pending"
   ↓
6. SE score >= 70%:
   ↓
   6.1. Backend → web3Service.recordCompletion()
   ↓
   6.2. Ethers.js prepara transação
        contract.recordCompletion(moduleId, score, topic)
   ↓
   6.3. Wallet backend assina transação
   ↓
   6.4. Transação enviada para Sepolia
   ↓
   6.5. Aguarda confirmação (1 bloco, ~12 seg)
   ↓
   6.6. Backend atualiza DB:
        - transactionHash: "0x..."
        - blockchainStatus: "confirmed"
   ↓
7. Backend retorna resultado
   { score, passed, transactionHash }
   ↓
8. Frontend exibe resultado + link Etherscan
```

## 🔐 Segurança

### **Frontend**
- Input sanitization (React auto-escapes)
- HTTPS only em produção
- Token JWT em localStorage (com expiração)
- CORS restrito ao backend

### **Backend**
- Validação Zod em todas inputs
- JWT com secret forte
- Rate limiting (futuro)
- CORS configurado
- Logs de erros (Winston)
- Environment variables validadas

### **Smart Contract**
- ReentrancyGuard
- Validação de inputs (require)
- Events para auditoria
- Ownable pattern
- Código auditado (OpenZeppelin)

### **Database**
- SQL injection protection (Drizzle ORM)
- Índices em colunas chave
- Conexões pool limitadas

## 📊 Performance

### **Frontend**
- Code splitting (Vite)
- Lazy loading de rotas
- React.memo em componentes pesados
- Debounce em inputs

### **Backend**
- tRPC batching (múltiplas queries em 1 request)
- Database connection pooling
- Cache de queries (React Query)
- Superjson para serialização eficiente

### **Blockchain**
- Gas optimization no contrato
- Batch transactions quando possível
- Retry logic para transações falhadas

## 🔄 Escalabilidade

### **Horizontal Scaling**
- Frontend: CDN (Vercel)
- Backend: Serverless functions (Vercel)
- Database: Connection pooling

### **Vertical Scaling**
- Aumentar compute time (Vercel config)
- Aumentar pool de conexões DB
- Cache layer (Redis - futuro)

## 📈 Monitoring (Futuro)

- Sentry para error tracking
- LogRocket para session replay
- Analytics (Vercel Analytics)
- Blockchain events monitoring

## 🧪 Testabilidade

### **Unit Tests**
- Services isolados
- Mock de APIs externas
- Testes de validação Zod

### **Integration Tests**
- tRPC routers
- Database queries
- Smart contract interactions

### **E2E Tests**
- Fluxos completos de usuário
- Cypress para frontend
- Hardhat network para blockchain

---

Esta arquitetura foi desenhada para ser:
- ✅ **Type-safe** (TypeScript end-to-end)
- ✅ **Escalável** (serverless ready)
- ✅ **Segura** (múltiplas camadas de validação)
- ✅ **Testável** (componentes desacoplados)
- ✅ **Manutenível** (código limpo, bem documentado)
