# 🧪 Guia de Testes Manuais - AI-DLH

## ✅ Pré-requisitos

- ✅ Backend rodando em http://localhost:3000
- ✅ Frontend rodando em http://localhost:5173
- ✅ MetaMask instalada no navegador
- ✅ MetaMask conectada à rede Sepolia

---

## 📋 Checklist de Testes

### Teste 1: Verificar Health do Backend ✅

**Objetivo:** Confirmar que o backend está saudável

**Passos:**
1. Abra: http://localhost:3000/health
2. Você deve ver algo assim:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "services": {
    "database": "connected",
    "blockchain": "connected",
    "ai": "configured"
  }
}
```

**Resultado esperado:** Todos os serviços devem estar "connected" ou "configured"

---

### Teste 2: Verificar Frontend Carrega ✅

**Objetivo:** Confirmar que o frontend está acessível

**Passos:**
1. Abra: http://localhost:5173
2. Você deve ver a página inicial do AI-DLH
3. Verifique se há:
   - Logo ou título "AI-DLH"
   - Botão "Connect Wallet"
   - Descrição do projeto

**Resultado esperado:** Página carrega sem erros no console

---

### Teste 3: Conectar MetaMask 🔐

**Objetivo:** Autenticar com Web3

**Passos:**
1. No frontend, clique em **"Connect Wallet"**
2. MetaMask deve abrir automaticamente
3. **Selecione a conta** com a sua private key configurada
4. Clique em **"Connect"** na MetaMask
5. MetaMask vai pedir para **assinar uma mensagem**
6. Clique em **"Sign"**

**Resultado esperado:**
- ✅ Botão muda para mostrar seu endereço truncado (0x7A53...5139)
- ✅ Você é redirecionado para o Dashboard
- ✅ No console do backend você vê: `User authenticated: 0x7A53...`

**⚠️ Problemas comuns:**
- Se MetaMask não abre: Verifique se está instalada e desbloqueada
- Se dá erro de rede: Mude para Sepolia na MetaMask
- Se não redireciona: Verifique console do navegador (F12)

---

### Teste 4: Visualizar Dashboard 📊

**Objetivo:** Confirmar que dados do usuário são carregados

**No Dashboard você deve ver:**
- ✅ Estatísticas do usuário (Total Modules, Average Score, etc.)
- ✅ Formulário para gerar novo módulo
- ✅ Lista de módulos anteriores (pode estar vazia)

**Resultado esperado:** Dashboard carrega sem erros

---

### Teste 5: Gerar Módulo com IA 🤖

**Objetivo:** Testar integração com Google Gemini

**Passos:**
1. No Dashboard, encontre o campo **"Topic"**
2. Digite um tópico, por exemplo: **"React Hooks"**
3. Selecione nível: **"Intermediate"**
4. Clique em **"Generate Module"**
5. Aguarde 10-30 segundos (a IA está gerando conteúdo)

**Resultado esperado:**
- ✅ Aparece um loading/spinner
- ✅ Módulo é gerado e aparece na lista
- ✅ Você pode clicar para ver o conteúdo
- ✅ No console do backend: `Generating module for topic: React Hooks`

**⚠️ Problemas comuns:**
- Erro "API Key invalid": Verifique GEMINI_API_KEY no .env
- Timeout: Gemini pode estar lento, tente novamente
- Erro 429: Limite de requisições atingido, aguarde 1 minuto

---

### Teste 6: Visualizar Conteúdo do Módulo 📖

**Objetivo:** Confirmar que conteúdo é renderizado

**Passos:**
1. Clique no módulo que você gerou
2. Você deve ver:
   - ✅ Título do módulo
   - ✅ Conteúdo em Markdown formatado
   - ✅ Seções numeradas
   - ✅ Exemplos de código (se houver)

**Resultado esperado:** Conteúdo é legível e bem formatado

---

### Teste 7: Fazer o Quiz 📝

**Objetivo:** Testar sistema de quiz

**Passos:**
1. Role até o final do módulo
2. Você deve ver o **Quiz** com 4 perguntas
3. Para cada pergunta:
   - Leia a pergunta
   - Selecione uma resposta (radio button)
4. Depois de responder todas, clique **"Submit Quiz"**
5. Aguarde processamento (5-10 segundos)

**Resultado esperado:**
- ✅ Aparece seu score (ex: "Score: 75%")
- ✅ Mensagem de aprovação (se >= 70%) ou reprovação
- ✅ Se aprovado: "Recording on blockchain..."

**⚠️ Problemas comuns:**
- Erro ao submeter: Verifique se respondeu todas as perguntas
- Não registra blockchain: Verifique saldo de ETH Sepolia

---

### Teste 8: Verificar Registro Blockchain ⛓️

**Objetivo:** Confirmar transação na Sepolia

**Passos:**
1. Após passar no quiz (>= 70%), aguarde a transação
2. Você deve ver:
   - ✅ "Transaction Hash: 0x..."
   - ✅ Link para Etherscan
3. Clique no link do Etherscan
4. Na Sepolia Etherscan, verifique:
   - ✅ Status: Success ✅
   - ✅ From: Seu endereço backend (0x7A53...5139)
   - ✅ To: Contract (0x3C39...27CE)
   - ✅ Input Data: Contém seu endereço de usuário

**Resultado esperado:**
- ✅ Transação confirmada na blockchain
- ✅ Seu progresso está registrado on-chain
- ✅ No backend: `Transaction confirmed: 0x...`

**⚠️ Problemas comuns:**
- Transaction failed: Backend sem ETH Sepolia
- Pending muito tempo: Gas price baixo, aguarde
- Erro "out of gas": Problema no contrato (raro)

---

### Teste 9: Verificar Progresso no Contrato 📜

**Objetivo:** Consultar dados on-chain

**Passos:**
1. Abra: https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE#readContract
2. Conecte sua wallet (MetaMask)
3. Procure função **"getUserProgress"**
4. Cole seu endereço de usuário (o da MetaMask)
5. Clique **"Query"**

**Resultado esperado:**
- ✅ Retorna array com seus módulos completados
- ✅ Cada entrada mostra: moduleId, score, timestamp

---

### Teste 10: Teste Completo End-to-End 🎯

**Objetivo:** Fluxo completo do usuário

**Roteiro:**
1. ✅ Conectar wallet
2. ✅ Gerar módulo "JavaScript Async/Await"
3. ✅ Ler conteúdo
4. ✅ Fazer quiz
5. ✅ Obter score >= 70%
6. ✅ Ver transação confirmada
7. ✅ Verificar no Etherscan
8. ✅ Voltar ao Dashboard e ver estatísticas atualizadas

**Tempo esperado:** 5-10 minutos

---

## 🐛 Debugging

### Console do Backend

Abra o terminal onde o backend está rodando e observe logs:

```
✅ Logs bons:
- User authenticated: 0x7A53...
- Generating module for topic: ...
- Module generated successfully
- Recording completion on blockchain
- Transaction confirmed: 0x...

❌ Erros comuns:
- Error: Gemini API key invalid → Verifique .env
- Error: Database connection failed → Verifique DATABASE_URL
- Error: Contract call failed → Verifique saldo ETH Sepolia
```

### Console do Frontend (F12)

Pressione F12 no navegador e vá na aba **Console**:

```
✅ Logs bons:
- Connected to wallet: 0x7A53...
- Module generated
- Quiz submitted
- Transaction hash: 0x...

❌ Erros comuns:
- Network Error → Backend não está rodando
- CORS Error → Problema de configuração
- MetaMask Error → Usuário rejeitou transação
```

---

## 📊 Checklist Final

Antes de ir para produção, confirme:

- [ ] ✅ Health check retorna "healthy"
- [ ] ✅ Frontend carrega sem erros
- [ ] ✅ MetaMask conecta com sucesso
- [ ] ✅ Dashboard carrega dados
- [ ] ✅ Módulo gerado com IA funciona
- [ ] ✅ Quiz pode ser submetido
- [ ] ✅ Score >= 70% registra na blockchain
- [ ] ✅ Transação aparece no Etherscan
- [ ] ✅ Progresso pode ser consultado no contrato
- [ ] ✅ Estatísticas atualizam no Dashboard

---

## 🎉 Tudo Funcionando?

Se todos os testes passaram, **parabéns!** 🎊 

Seu sistema está pronto para deploy em produção!

### Próximos passos:
1. Commit suas alterações no Git
2. Push para GitHub
3. Deploy na Vercel
4. Configurar variáveis de ambiente na Vercel
5. Testar em produção

---

## 💡 Dicas

### Performance
- Geração de módulo: 10-30 segundos (normal)
- Quiz submission: 5-15 segundos (inclui blockchain)
- Transação Sepolia: 10-60 segundos para confirmar

### Custos
- **Gemini API:** Grátis (1500 req/dia)
- **Infura RPC:** Grátis (100k req/dia)
- **Sepolia ETH:** Grátis (testnet)
- **Vercel Postgres:** Grátis (256MB)
- **Gas fees:** R$ 0,00 (testnet)

**Total: R$ 0,00/mês** 🎉
