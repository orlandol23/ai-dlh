# 📡 Documentação da API - AI-DLH

Documentação completa dos endpoints tRPC do backend.

## 🔑 Autenticação

Todos os endpoints protegidos requerem um token JWT no header:

```typescript
Authorization: Bearer <jwt_token>
```

O token é obtido após login Web3 e deve ser incluído em todas as requisições autenticadas.

---

## 🔐 Router: auth

### `auth.login` (Mutation)

Autentica usuário via assinatura Web3 do MetaMask.

**Input:**
```typescript
{
  walletAddress: string;  // Ex: "0x1234...5678" (42 chars)
  message: string;        // Mensagem assinada
  signature: string;      // Assinatura hex (130 chars)
}
```

**Output:**
```typescript
{
  token: string;  // JWT token
  user: {
    id: number;
    walletAddress: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
    createdAt: Date;
    lastLoginAt: Date;
  }
}
```

**Exemplo:**
```typescript
const result = await trpc.auth.login.mutate({
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  message: "AI-DLH Auth\nAddress: 0x742d35...\nTime: 1703001234567",
  signature: "0xabc123..."
});

// Salvar token
localStorage.setItem('auth_token', result.token);
```

**Erros:**
- `UNAUTHORIZED` - Assinatura inválida
- `BAD_REQUEST` - Formato de endereço/assinatura inválido

---

### `auth.me` (Query) 🔒

Retorna dados do usuário autenticado atual.

**Input:** Nenhum

**Output:**
```typescript
{
  id: number;
  walletAddress: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}
```

**Exemplo:**
```typescript
const user = await trpc.auth.me.useQuery();
```

**Erros:**
- `UNAUTHORIZED` - Token inválido ou expirado

---

### `auth.updateProfile` (Mutation) 🔒

Atualiza perfil do usuário.

**Input:**
```typescript
{
  name?: string;      // Min: 2, Max: 255
  email?: string;     // Validação de email
  avatar?: string;    // URL válida
}
```

**Output:**
```typescript
{
  id: number;
  walletAddress: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  // ...
}
```

**Exemplo:**
```typescript
const updated = await trpc.auth.updateProfile.mutate({
  name: "João Silva",
  email: "joao@example.com"
});
```

---

## 🤖 Router: ai

### `ai.generateModule` (Mutation) 🔒

Gera um novo módulo educacional usando IA Generativa.

**Input:**
```typescript
{
  topic: string;      // Min: 3, Max: 200
  level: "beginner" | "intermediate" | "advanced";
}
```

**Output:**
```typescript
{
  id: number;
  userId: number;
  title: string;
  content: string;        // Markdown
  topic: string;
  level: string;
  quizData: Array<{
    question: string;
    options: [string, string, string, string];
    correctAnswer: 0 | 1 | 2 | 3;
    explanation?: string;
  }>;
  estimatedTime: number;  // minutos
  createdAt: Date;
}
```

**Exemplo:**
```typescript
const module = await trpc.ai.generateModule.mutate({
  topic: "React Hooks",
  level: "intermediate"
});

console.log(module.title);    // "Dominando React Hooks"
console.log(module.quizData); // Array com 4-5 perguntas
```

**Tempo de resposta:** 3-8 segundos (depende da API Gemini)

**Erros:**
- `INTERNAL_SERVER_ERROR` - Falha na geração (Gemini API)
- `BAD_REQUEST` - Tópico muito curto/longo

---

### `ai.getUserModules` (Query) 🔒

Retorna todos os módulos do usuário autenticado.

**Input:** Nenhum

**Output:**
```typescript
Array<{
  id: number;
  title: string;
  topic: string;
  level: string;
  estimatedTime: number;
  createdAt: Date;
  // ... outros campos
}>
```

**Exemplo:**
```typescript
const { data: modules } = trpc.ai.getUserModules.useQuery();

modules?.map(m => (
  <div key={m.id}>{m.title}</div>
));
```

**Ordenação:** Mais recentes primeiro (createdAt DESC)

---

### `ai.getModuleById` (Query) 🔒

Retorna um módulo específico (com validação de ownership).

**Input:**
```typescript
{
  moduleId: number;
}
```

**Output:**
```typescript
{
  id: number;
  userId: number;
  title: string;
  content: string;     // Conteúdo completo em Markdown
  topic: string;
  level: string;
  quizData: QuizQuestion[];
  estimatedTime: number;
  createdAt: Date;
}
```

**Exemplo:**
```typescript
const module = await trpc.ai.getModuleById.useQuery({
  moduleId: 123
});
```

**Erros:**
- `NOT_FOUND` - Módulo não existe
- `FORBIDDEN` - Módulo pertence a outro usuário

---

### `ai.deleteModule` (Mutation) 🔒

Deleta um módulo (com validação de ownership).

**Input:**
```typescript
{
  moduleId: number;
}
```

**Output:**
```typescript
{
  success: true;
}
```

**Exemplo:**
```typescript
await trpc.ai.deleteModule.mutate({ moduleId: 123 });
```

**Erros:**
- `NOT_FOUND` - Módulo não existe
- `FORBIDDEN` - Não pode deletar módulo de outro usuário

---

## 📊 Router: progress

### `progress.submitQuiz` (Mutation) 🔒

Submete respostas do quiz e registra na blockchain (se aprovado).

**Input:**
```typescript
{
  moduleId: number;
  answers: number[];  // Array de índices 0-3
}
```

**Output:**
```typescript
{
  score: number;           // 0-100
  correct: number;         // Quantidade de acertos
  total: number;           // Total de perguntas
  passed: boolean;         // true se score >= 70%
  transactionHash: string | null;  // Hash se registrado on-chain
  blockchainError: string | null;  // Erro se falhou blockchain
}
```

**Exemplo:**
```typescript
const result = await trpc.progress.submitQuiz.mutate({
  moduleId: 123,
  answers: [0, 2, 1, 3]  // Respostas do usuário
});

if (result.passed) {
  console.log('Aprovado!');
  if (result.transactionHash) {
    console.log('Registrado na blockchain:', result.transactionHash);
  }
}
```

**Comportamento:**
- Valida respostas server-side
- Calcula score: `(corretas / total) * 100`
- Se `score >= 70%`:
  - Tenta registrar na blockchain
  - Retorna hash da transação
  - Atualiza status no DB

**Tempo de resposta:**
- Sem blockchain: <1s
- Com blockchain: 3-15s (aguarda confirmação)

**Erros:**
- `NOT_FOUND` - Módulo não existe
- `BAD_REQUEST` - Número de respostas não bate com quiz

---

### `progress.getUserProgress` (Query) 🔒

Retorna histórico de progresso do usuário.

**Input:** Nenhum

**Output:**
```typescript
Array<{
  id: number;
  moduleId: number;
  score: number;
  answersData: number[];
  transactionHash: string | null;
  blockchainStatus: "pending" | "confirmed" | "failed" | "none";
  completedAt: Date;
  module: {
    title: string;
    topic: string;
    level: string;
  }
}>
```

**Exemplo:**
```typescript
const { data: progress } = trpc.progress.getUserProgress.useQuery();

progress?.map(p => (
  <div>
    {p.module.title} - Score: {p.score}%
    {p.transactionHash && (
      <a href={`https://sepolia.etherscan.io/tx/${p.transactionHash}`}>
        Ver na Blockchain
      </a>
    )}
  </div>
));
```

**Ordenação:** Mais recentes primeiro

---

### `progress.getStatistics` (Query) 🔒

Retorna estatísticas agregadas do usuário.

**Input:** Nenhum

**Output:**
```typescript
{
  totalModules: number;      // Total de módulos completados
  passedModules: number;     // Módulos aprovados (score >= 70%)
  avgScore: number;          // Score médio (0-100)
  completionRate: number;    // Taxa de aprovação (0-100)
  onChainRecords: number;    // Registros confirmados na blockchain
}
```

**Exemplo:**
```typescript
const { data: stats } = trpc.progress.getStatistics.useQuery();

console.log(`Aprovação: ${stats?.completionRate}%`);
console.log(`Média: ${stats?.avgScore}%`);
console.log(`On-chain: ${stats?.onChainRecords}`);
```

---

### `progress.getModuleProgress` (Query) 🔒

Retorna progresso para um módulo específico.

**Input:**
```typescript
{
  moduleId: number;
}
```

**Output:**
```typescript
{
  id: number;
  score: number;
  answersData: number[];
  transactionHash: string | null;
  blockchainStatus: string;
  completedAt: Date;
} | null
```

**Exemplo:**
```typescript
const progress = await trpc.progress.getModuleProgress.useQuery({
  moduleId: 123
});

if (progress) {
  console.log('Já completou este módulo:', progress.score);
}
```

---

## ⛓️ Router: web3

### `web3.getBlockchainProgress` (Query) 🔒

Query direto no smart contract (dados on-chain).

**Input:** Nenhum (usa wallet do usuário autenticado)

**Output:**
```typescript
Array<{
  moduleId: number;
  score: number;
  timestamp: number;    // Unix timestamp
  moduleTopic: string;
}>
```

**Exemplo:**
```typescript
const onChain = await trpc.web3.getBlockchainProgress.useQuery();

console.log('Certificados permanentes:', onChain.length);
```

**Nota:** Dados vêm direto do Ethereum, não do DB.

---

### `web3.getCompletionCount` (Query) 🔒

Retorna contagem de completions on-chain.

**Input:** Nenhum

**Output:**
```typescript
{
  count: number;
}
```

---

### `web3.getAverageScore` (Query) 🔒

Retorna média calculada on-chain pelo smart contract.

**Input:** Nenhum

**Output:**
```typescript
{
  average: number;  // 0-100
}
```

---

### `web3.getTotalCompletions` (Query) 🔒

Retorna total global de completions no contrato.

**Input:** Nenhum

**Output:**
```typescript
{
  total: number;
}
```

---

## 🔄 Rate Limiting

**Desenvolvimento:** Sem limite

**Produção (futuro):**
- Geração de módulos: 10/hora por usuário
- Outros endpoints: 100/minuto por usuário

---

## 🐛 Error Handling

Todos os erros seguem o formato tRPC:

```typescript
{
  code: "UNAUTHORIZED" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR",
  message: string,
  data?: {
    zodError?: ZodFormattedError  // Se erro de validação
  }
}
```

**Códigos comuns:**
- `UNAUTHORIZED` (401) - Token inválido/expirado
- `FORBIDDEN` (403) - Sem permissão
- `NOT_FOUND` (404) - Recurso não existe
- `BAD_REQUEST` (400) - Input inválido
- `INTERNAL_SERVER_ERROR` (500) - Erro no servidor

---

## 📦 Type Safety

Como usar tipos no frontend:

```typescript
import type { AppRouter } from '../../../server/routers';
import { createTRPCReact } from '@trpc/react-query';

export const trpc = createTRPCReact<AppRouter>();

// TypeScript infere todos os tipos automaticamente!
const { data } = trpc.ai.getUserModules.useQuery();
//     ^? Array<Module>
```

---

## 🧪 Testing

Exemplo de teste de endpoint:

```typescript
import { appRouter } from './routers';

test('should generate module', async () => {
  const caller = appRouter.createCaller({
    user: mockUser,
    req: mockReq,
    res: mockRes
  });

  const module = await caller.ai.generateModule({
    topic: 'Test',
    level: 'beginner'
  });

  expect(module.title).toBeDefined();
  expect(module.quizData).toHaveLength(4);
});
```

---

Para mais detalhes, veja:
- [Arquitetura](./ARCHITECTURE.md)
- [README.md](../README.md)
- [Código-fonte dos routers](../server/routers/)
