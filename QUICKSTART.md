# 🚀 Guia de Início Rápido - AI-DLH

Este guia irá te ajudar a configurar e executar o projeto em menos de 10 minutos.

## 📋 Pré-requisitos Rápidos

1. **Node.js 20+** instalado
2. **MetaMask** instalado no navegador
3. **Git** instalado

## ⚡ Instalação Express

### 1. Clone e Instale

```bash
git clone https://github.com/seu-usuario/ai-dlh.git
cd ai-dlh
npm run setup
```

### 2. Configure o Ambiente

```bash
cp .env.example .env
```

Abra o `.env` e configure **apenas o essencial**:

```bash
# 1. Gemini API (OBRIGATÓRIO)
GEMINI_API_KEY=sua_chave_aqui

# 2. Database (pode usar SQLite local para teste)
DATABASE_URL=postgresql://localhost:5432/aidlh

# 3. JWT Secret (qualquer string longa)
JWT_SECRET=meu_secret_super_seguro_123456789
```

### 3. Obtenha a Gemini API Key (2 minutos)

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com Google
3. Clique em "Create API Key"
4. Copie e cole no `.env` como `GEMINI_API_KEY`

### 4. Configure Blockchain (OPCIONAL para começar)

Se quiser testar o blockchain imediatamente:

```bash
# Gere uma wallet
npm run generate:wallet

# Copie a PRIVATE_KEY para .env
# Obtenha ETH testnet em: https://sepoliafaucet.com

# Obtenha RPC grátis:
# https://infura.io ou https://alchemy.com
# Adicione ao .env como ETHEREUM_RPC_URL

# Deploy do contrato
npm run deploy:contract

# Copie CONTRACT_ADDRESS para .env
```

**OU pule isso por enquanto** - o app funcionará sem blockchain (apenas não salvará certificados on-chain).

### 5. Execute!

```bash
npm run dev
```

Acesse: **http://localhost:5173**

## 🎯 Testando o App

### Sem MetaMask/Blockchain

Se não configurou blockchain ainda:

1. Comente temporariamente as linhas de Web3 no código
2. Use apenas a geração de módulos com IA
3. Teste o sistema de quiz

### Com MetaMask

1. Certifique-se de estar na rede **Sepolia**
2. Clique em "Conectar Carteira"
3. Aprove no MetaMask
4. Assine a mensagem
5. Pronto! 🎉

## 🐛 Problemas Comuns

### Erro: "GEMINI_API_KEY não configurado"

➜ Certifique-se de adicionar a chave no `.env` corretamente

### Erro: "Database connection failed"

➜ Configure um PostgreSQL local ou use o Vercel Postgres (grátis)

```bash
# PostgreSQL local (Docker)
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Ou use Supabase (grátis): https://supabase.com
```

### MetaMask não conecta

➜ Certifique-se de:
- Estar na rede Sepolia
- MetaMask estar desbloqueado
- Navegador suporta Web3

### Erro ao gerar módulo

➜ Verifique:
- Gemini API Key válida
- Conexão com internet
- Logs do console (F12)

## 📚 Próximos Passos

1. ✅ Gere seu primeiro módulo
2. ✅ Complete um quiz
3. ✅ Configure blockchain para certificados
4. ✅ Explore o código-fonte
5. ✅ Faça deploy na Vercel

## 🆘 Ajuda

- **Issues**: https://github.com/seu-usuario/ai-dlh/issues
- **Docs completos**: Veja README.md
- **Discord**: [Link do servidor]

---

**Dica**: Comece simples! Teste apenas com IA primeiro, depois adicione blockchain. 🚀
