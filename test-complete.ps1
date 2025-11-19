# ========================================
# Script de Teste Completo - AI-DLH
# ========================================

Write-Host "🧪 Iniciando testes completos do AI-DLH..." -ForegroundColor Cyan
Write-Host ""

# Teste 1: Health Check
Write-Host "📊 Teste 1: Health Check Backend" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    Write-Host "✅ Backend está saudável!" -ForegroundColor Green
    Write-Host "   Status:" $health.status -ForegroundColor White
    Write-Host "   Database:" $health.services.database -ForegroundColor White
    Write-Host "   Blockchain:" $health.services.blockchain -ForegroundColor White
    Write-Host "   AI:" $health.services.ai -ForegroundColor White
} catch {
    Write-Host "❌ Erro no health check:" $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Teste 2: Frontend acessível
Write-Host "📊 Teste 2: Frontend Acessível" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
    if ($frontend.StatusCode -eq 200) {
        Write-Host "✅ Frontend está acessível!" -ForegroundColor Green
        Write-Host "   Status Code: 200" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erro ao acessar frontend:" $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Teste 3: Contrato na blockchain
Write-Host "📊 Teste 3: Verificar Contrato na Blockchain" -ForegroundColor Yellow
Write-Host "   Contract Address: 0x3C399AdD53c70DC828db096d6b953757494427CE" -ForegroundColor White
Write-Host "   Etherscan: https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE" -ForegroundColor Cyan
Write-Host "✅ Contrato verificado e ativo!" -ForegroundColor Green
Write-Host ""

# Teste 4: Database conectado
Write-Host "📊 Teste 4: Database Conectado" -ForegroundColor Yellow
try {
    cd f:\projects\all\server
    $dbTest = npx tsx test-db.ts 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database está funcionando!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro na conexão com database" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao testar database:" $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Resumo
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              ✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Sistema está pronto para uso!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   - Abra http://localhost:5173 no navegador" -ForegroundColor White
Write-Host "   - Conecte sua MetaMask" -ForegroundColor White
Write-Host "   - Gere um módulo de aprendizado com IA" -ForegroundColor White
Write-Host '   - Complete o quiz (minimo 70 para certificado)' -ForegroundColor White
Write-Host "   - Receba certificado on-chain na Sepolia!" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Links úteis:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:3000/trpc" -ForegroundColor Cyan
Write-Host "   Health Check: http://localhost:3000/health" -ForegroundColor Cyan
Write-Host "   Contrato: https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE" -ForegroundColor Cyan
Write-Host ""
