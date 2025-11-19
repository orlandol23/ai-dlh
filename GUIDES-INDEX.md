# 📚 Guias de Setup - AI-DLH

Bem-vindo ao AI-DLH! Escolha o guia adequado para você:

---

## ✅ Antes de Começar

### [PREREQUISITES.md](PREREQUISITES.md) 📋

**Tempo: Verificação rápida**

Verifique se você tem tudo que precisa:

- Software necessário (Node.js, Git, MetaMask, etc)
- Contas necessárias (Google, GitHub, Vercel, Infura)
- Checklist completo
- Guia de solução de problemas de instalação

**Use se:** É sua primeira vez ou quer confirmar que tem tudo.

---

## 🎯 Para Começar AGORA

### [START-NOW.md](START-NOW.md) ⚡

**Tempo: 5 minutos**

Configure o básico do projeto em 5 minutos:

- Carregar scripts auxiliares
- Instalar dependências
- Criar arquivo .env
- Gerar JWT Secret
- Verificar status

**Use se:** Você quer começar imediatamente e configurar o resto depois.

---

## 📖 Guias Completos

### [SETUP-GUIDE.md](SETUP-GUIDE.md) 🏆 RECOMENDADO

**Tempo: 1-1.5 horas**

Guia completo passo a passo com todas as fases:

1. ✅ Obter API Keys (10 min)
2. ✅ Setup Local (20 min)
3. ✅ Deploy Blockchain (10 min)
4. ✅ Configurar Database (10 min)
5. ✅ Testes Locais (15 min)
6. ✅ Deploy Produção (30 min)

Inclui:

- Instruções detalhadas
- Checkpoints de verificação
- Exemplos de comandos
- Troubleshooting inline
- Testes manuais guiados

**Use se:** É sua primeira vez configurando o projeto.

---

### [PROGRESS-CHECKLIST.md](PROGRESS-CHECKLIST.md) ✅

**Tempo: Variável**

Checklist interativo para marcar seu progresso:

- Checkboxes para todas tarefas
- Espaço para anotar informações importantes
- Campos para tempo gasto
- Seção de notas e observações
- Lista de links importantes

**Use se:** Você quer acompanhar seu progresso visualmente.

---

### [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) 🚀

**Tempo: 2-3 horas (primeira vez)**

Checklist profissional focado em produção:

- Todas as fases detalhadas
- Verificações de segurança
- Otimizações de performance
- Monitoramento
- Backups
- CI/CD

**Use se:** Você está preparando para deploy em produção real.

---

## 📋 Referências Rápidas

### [QUICK-REFERENCE.md](QUICK-REFERENCE.md) 📊

**Tempo: Consulta rápida**

Resumo visual em ASCII art:

- Diagrama de todas as fases
- Comandos essenciais
- Checklist resumido
- Links importantes
- Troubleshooting rápido

**Use se:** Você só precisa relembrar algum comando ou verificar status.

---

### [QUICKSTART.md](QUICKSTART.md) 🏃

**Tempo: 10 minutos**

Versão simplificada do setup:

- Apenas o essencial
- Sem detalhes técnicos
- Foco em rodar localmente
- Setup mínimo

**Use se:** Você já tem experiência e quer rodar rápido.

---

## 🛠️ Scripts e Ferramentas

### [scripts.ps1](scripts.ps1) 💻

**PowerShell Scripts Auxiliares**

Funções úteis:

- `Generate-JWTSecret` - Gera JWT secret
- `Check-EnvFile` - Verifica .env
- `Setup-Project` - Instala tudo
- `Start-Dev` - Inicia frontend + backend
- `Test-Health` - Testa servidor
- `Show-Help` - Mostra ajuda

**Como usar:**

```powershell
. .\scripts.ps1
Show-Help
```

---

## 📖 Documentação Técnica

### [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

Arquitetura completa do sistema:

- Diagramas de componentes
- Fluxos de dados
- Stack tecnológico
- Decisões de design

### [docs/API.md](docs/API.md)

Documentação completa da API:

- Todos os endpoints tRPC
- Schemas de request/response
- Exemplos de uso
- Códigos de erro

### [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

Guia de deploy detalhado:

- Deploy Vercel
- Deploy Railway
- Deploy próprio servidor
- Configurações avançadas

### [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

Solução de problemas comuns:

- Erros de instalação
- Problemas de conexão
- Erros blockchain
- Erros IA
- Deploy issues

---

## 🎯 Fluxo Recomendado

### Primeira Vez (Setup Completo)

```
1. START-NOW.md (5 min)
   ↓
2. SETUP-GUIDE.md (1h)
   ↓
3. PROGRESS-CHECKLIST.md (marcar progresso)
   ↓
4. Teste local funcionando ✅
   ↓
5. Deploy produção ✅
```

### Setup Rápido (Já tem experiência)

```
1. QUICKSTART.md (10 min)
   ↓
2. QUICK-REFERENCE.md (consulta)
   ↓
3. Deploy ✅
```

### Apenas Desenvolvimento Local

```
1. START-NOW.md (5 min)
   ↓
2. Seguir "Opção B" do START-NOW
   ↓
3. Desenvolvimento local ✅
```

### Preparar para Produção

```
1. PRODUCTION-CHECKLIST.md
   ↓
2. docs/DEPLOYMENT.md
   ↓
3. Testes completos
   ↓
4. Deploy produção ✅
```

---

## 📂 Estrutura de Arquivos

```
ai-dlh/
├── START-NOW.md              ⚡ Início imediato (5 min)
├── SETUP-GUIDE.md            🏆 Guia completo (1h)
├── PROGRESS-CHECKLIST.md     ✅ Checklist interativo
├── PRODUCTION-CHECKLIST.md   🚀 Checklist produção
├── QUICK-REFERENCE.md        📊 Referência rápida
├── QUICKSTART.md             🏃 Setup básico (10 min)
├── scripts.ps1               💻 Scripts auxiliares
├── .env.example              📝 Template variáveis
├── README.md                 📖 Documentação principal
│
├── docs/
│   ├── ARCHITECTURE.md       🏗️  Arquitetura
│   ├── API.md                📡 Documentação API
│   ├── DEPLOYMENT.md         🚀 Deploy avançado
│   └── TROUBLESHOOTING.md    🔧 Solução problemas
│
├── contracts/                ⛓️  Smart contracts
├── server/                   🖥️  Backend API
└── frontend/                 🎨 Frontend React
```

---

## ❓ Dúvidas Comuns

### [FAQ.md](FAQ.md) 💬

**Perguntas Frequentes**

Respostas para dúvidas comuns:

- O que é o projeto?
- Quanto custa?
- Preciso saber programar?
- Como obter API keys?
- Problemas comuns e soluções
- Deploy e produção
- Limites dos serviços grátis

**Use se:** Tem alguma dúvida específica antes/durante o setup.

---

## 🆘 Precisa de Ajuda?

### Durante o Setup

1. Consulte [FAQ.md](FAQ.md) - Perguntas frequentes
2. Consulte [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
3. Verifique logs (terminal ou Vercel)
4. Execute `Check-EnvFile` para validar .env
5. Execute `Test-Health` para testar servidor

### Problemas Comuns

- **Backend não inicia:** Verifique .env e DATABASE_URL
- **Frontend não conecta:** Verifique VITE_API_URL
- **MetaMask não conecta:** Mude para rede Sepolia
- **Deploy falha:** Verifique logs na Vercel
- **Blockchain falha:** Verifique saldo da wallet

### Recursos Adicionais

- **GitHub Issues:** https://github.com/seu-usuario/ai-dlh/issues
- **Documentação Vercel:** https://vercel.com/docs
- **Documentação ethers.js:** https://docs.ethers.org
- **Documentação tRPC:** https://trpc.io/docs

---

## ✅ Checklist Rápido

Antes de começar, certifique-se de ter:

- [ ] Node.js 20+ instalado
- [ ] Git instalado
- [ ] MetaMask instalado no navegador
- [ ] Editor de código (VS Code recomendado)
- [ ] Conta Google (para Gemini API)
- [ ] Conta Infura ou Alchemy (para RPC)
- [ ] ~1 hora disponível para setup completo

---

## 🎉 Boa Sorte!

Escolha seu guia e comece agora!

**Recomendação:** Comece com [START-NOW.md](START-NOW.md) para setup básico, depois continue com [SETUP-GUIDE.md](SETUP-GUIDE.md) para configuração completa.

**Dúvidas?** Todos os guias têm seções de troubleshooting e ajuda.

---

**🚀 Pronto para começar? Vá para [START-NOW.md](START-NOW.md)!**
