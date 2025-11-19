# ❓ FAQ - Perguntas Frequentes

Respostas para dúvidas comuns sobre o AI-DLH.

---

## 🎯 Geral

### O que é o AI-DLH?

AI-DLH (AI-Powered Decentralized Learning Hub) é uma plataforma educacional que:

- Gera conteúdo personalizado com IA (Google Gemini)
- Registra certificados na blockchain Ethereum
- Autentica usuários via Web3 (MetaMask)
- É 100% gratuito para usar (testnet)

### É um projeto real ou apenas exemplo?

É um **projeto de portfólio completo e funcional**. Você pode:

- Rodar localmente
- Fazer deploy em produção
- Usar para aprender
- Adicionar ao currículo
- Mostrar para recrutadores

### Precisa pagar para usar?

**NÃO!** Tudo é gratuito:

- ✅ Gemini API: 1500 requisições/dia grátis
- ✅ Vercel Hosting: Free tier
- ✅ Vercel Postgres: 256MB grátis
- ✅ Infura RPC: 100k req/dia grátis
- ✅ Sepolia Testnet: ETH grátis (faucets)

### Quanto tempo leva para configurar?

- **Setup básico:** 5 minutos (START-NOW.md)
- **Setup completo:** 1-1.5 horas (primeira vez)
- **Apenas local:** 30 minutos
- **Com experiência:** 20-30 minutos

---

## 🛠️ Instalação e Setup

### Qual sistema operacional é suportado?

- ✅ **Windows 10/11** (PowerShell)
- ✅ **macOS** (Terminal)
- ✅ **Linux** (Terminal)

Scripts PowerShell são para Windows, mas comandos podem ser adaptados para Mac/Linux.

### Preciso saber programar?

**Básico é suficiente:**

- ✅ Saber usar terminal
- ✅ Entender Git básico
- ✅ Conhecer conceitos de ambiente (.env)
- ❌ Não precisa ser expert
- ❌ Guias explicam tudo passo a passo

### Node.js 18 funciona?

**Recomendado:** Node.js 20+
**Mínimo:** Node.js 18.x

Se usar 18, pode ter avisos de deprecation, mas deve funcionar.

### Posso usar npm ou yarn?

**Sim!** Ambos funcionam:

- Scripts usam `npm` por padrão
- Para usar `yarn`: substitua `npm` por `yarn` nos comandos

### Preciso de Docker?

**Não, é opcional:**

- Docker é só para PostgreSQL local
- Alternativa: Use Vercel Postgres (grátis, sem Docker)
- Recomendado para iniciantes: Vercel Postgres

---

## 🔑 API Keys e Contas

### Como obter Gemini API Key?

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com Google
3. Clique "Create API Key"
4. Copie chave (começa com `AIzaSy...`)
5. Cole no `.env`: `GEMINI_API_KEY=...`

**Limite grátis:** 1500 requisições/dia

### Como obter Infura RPC?

1. Acesse: https://infura.io
2. Criar conta gratuita
3. Create New Project
4. Settings → Endpoints
5. Copiar URL do **Sepolia**
6. Cole no `.env`: `ETHEREUM_RPC_URL=...`

**Limite grátis:** 100,000 requisições/dia

### Posso usar Alchemy ao invés de Infura?

**Sim!** Alchemy é equivalente:

1. Criar conta: https://www.alchemy.com/
2. Create App → Ethereum → Sepolia
3. View Key → HTTPS endpoint
4. Usar no `.env`

### Como obter ETH testnet (Sepolia)?

**Faucets disponíveis:**

1. **Alchemy Faucet** (recomendado)

   - https://sepoliafaucet.com
   - Login com Alchemy
   - 0.5 ETH por dia

2. **Chainlink Faucet**

   - https://faucets.chain.link/sepolia
   - 0.1 ETH por request

3. **Infura Faucet**
   - https://www.infura.io/faucet/sepolia

**Dica:** Use Alchemy, é o mais rápido e dá mais ETH.

### Preciso de conta GitHub?

**Sim**, para:

- Clonar o repositório
- Fazer commits
- Deploy na Vercel (requer conexão GitHub)

Se não tem: https://github.com/signup (grátis)

---

## ⛓️ Blockchain e Web3

### Preciso entender blockchain?

**Não!** O projeto funciona "out of the box":

- Smart contract já está pronto
- Guias explicam cada passo
- Não precisa escrever Solidity
- Apenas seguir instruções

### O que é Sepolia?

**Sepolia** é uma testnet do Ethereum:

- Rede de testes (não é dinheiro real)
- ETH Sepolia não tem valor financeiro
- Grátis para usar (faucets)
- Perfeito para desenvolvimento

### Posso usar Mainnet (rede principal)?

**NÃO RECOMENDADO!**

- Mainnet usa ETH real ($$$ dinheiro)
- Gas fees custam dinheiro
- Erros podem ser caros
- Use apenas para projetos em produção séria

**Para aprendizado:** Use sempre Sepolia.

### O que é MetaMask?

**MetaMask** é uma carteira Web3:

- Extensão de navegador
- Gerencia chaves privadas
- Assina transações
- Conecta com dApps

**Instalação:** https://metamask.io/download/

### Como adicionar rede Sepolia no MetaMask?

1. Abra MetaMask
2. Clique na rede atual (topo)
3. "Add Network" ou "Add Custom Network"
4. Preencha:
   ```
   Network Name: Sepolia
   RPC URL: https://sepolia.infura.io/v3/SEU_PROJECT_ID
   Chain ID: 11155111
   Currency Symbol: ETH
   Block Explorer: https://sepolia.etherscan.io
   ```
5. Salvar

**Atalho:** https://chainlist.org/?search=sepolia

### Vou gastar dinheiro com gas?

**Não!** Se usar Sepolia:

- ETH Sepolia é grátis (faucets)
- Não tem valor real
- Gas fees são "de mentira"

**Apenas gasta dinheiro real** se usar Mainnet (não recomendado para aprendizado).

---

## 💻 Desenvolvimento

### Posso modificar o código?

**Sim!** O projeto é open source:

- Faça fork
- Modifique à vontade
- Adicione features
- Use para aprender
- Licença MIT (muito permissiva)

### Como adicionar novas features?

1. Entenda a arquitetura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. Crie branch: `git checkout -b feature/minha-feature`
3. Desenvolva e teste
4. Commit: `git commit -m "feat: minha feature"`
5. Push: `git push origin feature/minha-feature`
6. Crie Pull Request (opcional)

### Posso usar em projeto comercial?

**Sim!** Licença MIT permite:

- ✅ Uso comercial
- ✅ Modificação
- ✅ Distribuição
- ✅ Uso privado

**Requisito:** Manter aviso de copyright e licença.

### Como contribuir com o projeto?

Veja [CONTRIBUTING.md](CONTRIBUTING.md):

1. Fork o repositório
2. Crie branch para feature
3. Faça alterações
4. Adicione testes (se aplicável)
5. Abra Pull Request
6. Aguarde review

---

## 🐛 Problemas e Erros

### Backend não inicia

**Possíveis causas:**

1. `.env` não configurado
   - Solução: Execute `Check-EnvFile`
2. Porta 3000 em uso
   - Solução: Mude `PORT` no `.env`
3. Database não conecta
   - Solução: Verifique `DATABASE_URL`

**Debug:**

```powershell
cd server
npm run dev
# Veja logs de erro no terminal
```

### Frontend não conecta com backend

**Causa:** CORS ou URL errada

**Solução:**

1. Verifique `VITE_API_URL` no `.env`
2. Deve ser: `http://localhost:3000/trpc`
3. Reinicie frontend

### MetaMask não conecta

**Possíveis causas:**

1. Rede errada
   - Solução: Mude para Sepolia
2. MetaMask bloqueado
   - Solução: Desbloqueie com senha
3. Solicitações pendentes
   - Solução: MetaMask → Settings → Advanced → Clear activity

### Transação blockchain falha

**Possíveis causas:**

1. Sem ETH (saldo zero)
   - Solução: Use faucet para obter mais
2. Gas muito baixo
   - Solução: Aguarde ou tente novamente
3. RPC com problemas
   - Solução: Troque Infura por Alchemy (ou vice-versa)

### Deploy Vercel falha

**Possíveis causas:**

1. Variáveis de ambiente faltando
   - Solução: Adicione TODAS do `.env`
2. Build error
   - Solução: Teste local: `npm run build`
3. Out of memory
   - Solução: Verifique se não tem dependências pesadas demais

**Debug:** Vercel Dashboard → Deployments → Function Logs

---

## 📚 Documentação

### Onde encontro a documentação da API?

[docs/API.md](docs/API.md) - Documentação completa:

- Todos endpoints tRPC
- Schemas request/response
- Exemplos de uso
- Códigos de erro

### Onde encontro a arquitetura?

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitetura completa:

- Diagramas de componentes
- Fluxos de dados
- Stack tecnológico
- Decisões de design

### Como fazer troubleshooting?

[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Solução de problemas:

- Erros comuns
- Como debugar
- Logs importantes
- Contatos de suporte

---

## 🚀 Deploy e Produção

### Quanto custa hospedar?

**Totalmente grátis** com free tiers:

- Vercel: Grátis até 100GB bandwidth
- Vercel Postgres: 256MB grátis
- Gemini API: 1500 req/dia grátis
- Infura: 100k req/dia grátis

**Total:** $0/mês

### Como fazer deploy?

Veja [SETUP-GUIDE.md](SETUP-GUIDE.md) Fase 6:

1. Push código para GitHub
2. Importar projeto na Vercel
3. Adicionar variáveis de ambiente
4. Deploy!

**Tempo:** ~30 minutos (primeira vez)

### Como atualizar código em produção?

**Automático via CI/CD:**

```bash
git add .
git commit -m "feat: nova feature"
git push
```

Vercel detecta push e faz deploy automaticamente!

### Posso usar domínio próprio?

**Sim!** Na Vercel:

1. Settings → Domains
2. Add Domain
3. Configure DNS (A record ou CNAME)
4. Aguarde propagação (até 48h)

**Custo domínio:** ~$10-15/ano (separado, não é Vercel)

---

## 💰 Custos e Limites

### O que acontece se passar do limite grátis?

**Gemini API (1500 req/dia):**

- Bloqueio temporário até próximo dia
- Ou upgrade para plan pago
- Sugestão: Implemente cache

**Vercel (100GB bandwidth):**

- Cobrado por GB extra
- Ou upgrade para Pro ($20/mês)
- Free tier é suficiente para portfólio

**Infura (100k req/dia):**

- Rate limiting após limite
- Ou crie novo projeto (outro 100k)
- Ou use Alchemy (300M compute units)

### Vale a pena pagar pelos serviços?

**Para aprendizado/portfólio:** Não
**Para projeto real com tráfego:** Sim

**Quando considerar pagar:**

- Mais de 1000 usuários/mês
- Tráfego consistente alto
- Precisa de suporte
- Features premium

---

## 🎓 Aprendizado

### É bom para aprender?

**Excelente para aprender:**

- ✅ React + TypeScript
- ✅ Node.js + Express
- ✅ tRPC (type-safe API)
- ✅ Blockchain/Web3
- ✅ IA Generativa
- ✅ Deploy em produção

### Conceitos que vou aprender?

- Frontend moderno (React 18, Vite, Tailwind)
- Backend type-safe (tRPC, Drizzle ORM)
- Smart contracts (Solidity)
- Web3 authentication
- IA Generativa (prompts, APIs)
- DevOps (CI/CD, Vercel)

### Posso adicionar no currículo?

**Sim! Este é um projeto de portfólio completo:**

- ✅ Demonstra múltiplas habilidades
- ✅ Stack moderno e relevante
- ✅ Deploy em produção (URL pública)
- ✅ Código limpo e documentado
- ✅ Arquitetura profissional

**Dica:** Adicione no LinkedIn e GitHub pinned repos.

---

## 🆘 Onde Pedir Ajuda?

### Documentação

1. [SETUP-GUIDE.md](SETUP-GUIDE.md) - Setup completo
2. [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Problemas
3. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitetura
4. [API.md](docs/API.md) - API reference

### Suporte da Comunidade

- **GitHub Issues:** https://github.com/seu-usuario/ai-dlh/issues
- **Discord:** [Link do servidor]
- **Stack Overflow:** Tag `[ai-dlh]`

### Recursos Externos

- **tRPC Docs:** https://trpc.io/docs
- **Vercel Docs:** https://vercel.com/docs
- **ethers.js Docs:** https://docs.ethers.org
- **Gemini API Docs:** https://ai.google.dev/docs

---

## 📈 Roadmap e Features

### O que vem no futuro?

Veja [README.md](README.md) seção Roadmap:

- [ ] Página de módulo completa
- [ ] Sistema de ranking
- [ ] Badges e conquistas
- [ ] Mobile app
- [ ] PWA
- [ ] Internacionalização

### Posso sugerir features?

**Sim!** Abra uma issue:

1. GitHub → Issues → New Issue
2. Título: `[Feature Request] Sua ideia`
3. Descreva a feature
4. Explique o caso de uso
5. (Opcional) Implemente você mesmo!

---

**Não encontrou sua dúvida?**

- Abra uma issue: https://github.com/seu-usuario/ai-dlh/issues
- Consulte [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- Entre em contato: seu-email@example.com

---

**🚀 Pronto para começar? Vá para [START-NOW.md](START-NOW.md)!**
