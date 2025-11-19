# 🎯 AI-DLH - Resumo Visual de Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    🚀 AI-DLH SETUP COMPLETO                      │
│                     Tempo total: ~1 hora                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FASE 1: API KEYS (10 min)                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☐ 1. Gemini API                                                 │
│     → https://makersuite.google.com/app/apikey                   │
│     → Copiar chave AIzaSy...                                     │
│                                                                   │
│  ☐ 2. Infura RPC                                                 │
│     → https://infura.io                                          │
│     → Criar projeto → Copiar URL Sepolia                         │
│     → https://sepolia.infura.io/v3/PROJECT_ID                    │
│                                                                   │
│  ☐ 3. Etherscan (opcional)                                       │
│     → https://etherscan.io/myapikey                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FASE 2: SETUP LOCAL (20 min)                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☐ 1. Instalar dependências                                      │
│     PS> cd f:\projects\all                                       │
│     PS> npm run setup                                            │
│                                                                   │
│  ☐ 2. Criar .env                                                 │
│     PS> Copy-Item .env.example .env                              │
│                                                                   │
│  ☐ 3. Gerar JWT Secret                                           │
│     PS> . .\scripts.ps1                                          │
│     PS> Generate-JWTSecret                                       │
│                                                                   │
│  ☐ 4. Gerar wallet backend                                       │
│     PS> cd contracts                                             │
│     PS> npm run generate:wallet                                  │
│     → Copiar PRIVATE_KEY para .env                               │
│                                                                   │
│  ☐ 5. Obter ETH testnet                                          │
│     → https://sepoliafaucet.com                                  │
│     → Colar endereço da wallet                                   │
│     → Aguardar ~1 min                                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FASE 3: BLOCKCHAIN (10 min)                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☐ 1. Deploy contrato                                            │
│     PS> cd contracts                                             │
│     PS> npm run deploy:sepolia                                   │
│                                                                   │
│  ☐ 2. Copiar CONTRACT_ADDRESS para .env                          │
│     CONTRACT_ADDRESS=0x...                                       │
│                                                                   │
│  ☐ 3. Verificar (opcional)                                       │
│     PS> npx hardhat verify --network sepolia 0x...               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FASE 4: DATABASE (10 min)                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☐ 1. Criar Vercel Postgres (FREE)                               │
│     → https://vercel.com/dashboard/stores                        │
│     → Create Database → Postgres                                 │
│     → Copiar DATABASE_URL                                        │
│                                                                   │
│  ☐ 2. Aplicar migrations                                         │
│     PS> cd server                                                │
│     PS> npm run db:push                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FASE 5: TESTE LOCAL (15 min)                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☐ 1. Verificar .env completo                                    │
│     PS> . .\scripts.ps1                                          │
│     PS> Check-EnvFile                                            │
│                                                                   │
│  ☐ 2. Iniciar ambiente                                           │
│     PS> Start-Dev                                                │
│     → Backend: http://localhost:3000                             │
│     → Frontend: http://localhost:5173                            │
│                                                                   │
│  ☐ 3. Testar health                                              │
│     PS> Test-Health                                              │
│                                                                   │
│  ☐ 4. Teste manual                                               │
│     → Abrir http://localhost:5173                                │
│     → Conectar MetaMask (Sepolia)                                │
│     → Gerar módulo                                               │
│     → Fazer quiz                                                 │
│     → Verificar blockchain                                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FASE 6: DEPLOY PRODUÇÃO (30 min)                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☐ 1. Commit e push                                              │
│     PS> git add .                                                │
│     PS> git commit -m "feat: production ready"                   │
│     PS> git push                                                 │
│                                                                   │
│  ☐ 2. Deploy Vercel                                              │
│     → https://vercel.com/new                                     │
│     → Import repository                                          │
│     → Framework: Vite                                            │
│     → Build: npm run build                                       │
│     → Output: frontend/dist                                      │
│                                                                   │
│  ☐ 3. Adicionar Environment Variables                            │
│     → Copiar TODAS do .env local                                 │
│     → Marcar "Add to all environments"                           │
│                                                                   │
│  ☐ 4. Deploy!                                                    │
│     → Aguardar 2-5 min                                           │
│                                                                   │
│  ☐ 5. Atualizar URLs                                             │
│     FRONTEND_URL=https://seu-projeto.vercel.app                  │
│     VITE_API_URL=https://seu-projeto.vercel.app/trpc             │
│     → Redeploy                                                   │
│                                                                   │
│  ☐ 6. Testar produção                                            │
│     → Abrir URL Vercel                                           │
│     → Repetir testes                                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                         ✅ CHECKLIST FINAL
═══════════════════════════════════════════════════════════════════

☐ Gemini API Key obtida
☐ Infura RPC URL obtida
☐ Wallet backend gerada
☐ ETH testnet obtido (≥0.05 ETH)
☐ Smart contract deployado
☐ DATABASE_URL configurada
☐ .env completo e validado
☐ Teste local 100% funcional
☐ Deploy Vercel concluído
☐ Teste produção OK

═══════════════════════════════════════════════════════════════════


┌──────────────────────────────────────────────────────────────────┐
│                    📂 ARQUIVOS IMPORTANTES                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SETUP-GUIDE.md               ← Guia passo a passo completo      │
│  PRODUCTION-CHECKLIST.md      ← Checklist detalhado             │
│  scripts.ps1                  ← Scripts auxiliares PowerShell    │
│  .env.example                 ← Template de variáveis            │
│  docs/DEPLOYMENT.md           ← Deploy avançado                  │
│  docs/TROUBLESHOOTING.md      ← Solução de problemas             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                    🛠️ COMANDOS ÚTEIS                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Carregar scripts:                                               │
│  PS> . .\scripts.ps1                                             │
│                                                                   │
│  Gerar JWT Secret:                                               │
│  PS> Generate-JWTSecret                                          │
│                                                                   │
│  Verificar .env:                                                 │
│  PS> Check-EnvFile                                               │
│                                                                   │
│  Iniciar dev:                                                    │
│  PS> Start-Dev                                                   │
│                                                                   │
│  Testar health:                                                  │
│  PS> Test-Health                                                 │
│                                                                   │
│  Ver ajuda:                                                      │
│  PS> Show-Help                                                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                    🆘 SE ALGO DER ERRADO                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Consulte SETUP-GUIDE.md                                      │
│  2. Consulte docs/TROUBLESHOOTING.md                             │
│  3. Verifique logs (terminal ou Vercel)                          │
│  4. Execute: Check-EnvFile                                       │
│  5. Execute: Test-Health                                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                    🎉 RESULTADO FINAL                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Você terá:                                                      │
│                                                                   │
│  ✅ App rodando em https://seu-projeto.vercel.app                │
│  ✅ Smart contract na blockchain Ethereum Sepolia                │
│  ✅ IA gerando módulos educacionais personalizados               │
│  ✅ Sistema de quiz com certificação blockchain                  │
│  ✅ Dashboard com estatísticas de progresso                      │
│  ✅ URL pública para portfólio                                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                    🚀 BOA SORTE NO SETUP!
═══════════════════════════════════════════════════════════════════

         Dúvidas? Consulte os documentos ou abra uma issue

═══════════════════════════════════════════════════════════════════
```
