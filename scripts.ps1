# ========================================
# AI-DLH - Scripts Auxiliares (PowerShell)
# ========================================

# Função para gerar JWT Secret
function Generate-JWTSecret {
    Write-Host "🔐 Gerando JWT Secret..." -ForegroundColor Cyan
    $bytes = New-Object byte[] 32
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    Write-Host "✅ JWT Secret gerado:" -ForegroundColor Green
    Write-Host $secret -ForegroundColor Yellow
    Write-Host "`nAdicione ao .env:" -ForegroundColor Cyan
    Write-Host "JWT_SECRET=$secret" -ForegroundColor White
}

# Função para verificar .env
function Check-EnvFile {
    Write-Host "🔍 Verificando arquivo .env..." -ForegroundColor Cyan
    
    if (-not (Test-Path ".env")) {
        Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
        Write-Host "Execute: Copy-Item .env.example .env" -ForegroundColor Yellow
        return
    }
    
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
    
    $required = @(
        "GEMINI_API_KEY",
        "DATABASE_URL",
        "ETHEREUM_RPC_URL",
        "PRIVATE_KEY",
        "CONTRACT_ADDRESS",
        "JWT_SECRET"
    )
    
    $content = Get-Content .env -Raw
    
    Write-Host "`n📋 Verificando variáveis:" -ForegroundColor Cyan
    foreach ($var in $required) {
        if ($content -match "$var=.+") {
            Write-Host "  ✅ $var" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $var (faltando ou vazio)" -ForegroundColor Red
        }
    }
}

# Função para verificar saldo da wallet
function Check-WalletBalance {
    param([string]$Address)
    
    if (-not $Address) {
        Write-Host "❌ Endereço não fornecido" -ForegroundColor Red
        Write-Host "Uso: Check-WalletBalance -Address 0x..." -ForegroundColor Yellow
        return
    }
    
    Write-Host "💰 Verificando saldo da wallet..." -ForegroundColor Cyan
    Write-Host "📍 Endereço: $Address" -ForegroundColor White
    Write-Host "`nAbra no navegador:" -ForegroundColor Cyan
    Write-Host "https://sepolia.etherscan.io/address/$Address" -ForegroundColor Blue
}

# Função para setup completo
function Setup-Project {
    Write-Host "🚀 Iniciando setup do projeto..." -ForegroundColor Cyan
    
    # Verificar se está na raiz do projeto
    if (-not (Test-Path "package.json")) {
        Write-Host "❌ Execute este script na raiz do projeto!" -ForegroundColor Red
        return
    }
    
    # Instalar dependências
    Write-Host "`n📦 Instalando dependências..." -ForegroundColor Cyan
    npm run setup
    
    # Verificar .env
    Write-Host "`n" 
    Check-EnvFile
    
    Write-Host "`n✅ Setup básico concluído!" -ForegroundColor Green
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Configure o arquivo .env" -ForegroundColor White
    Write-Host "2. Gere a wallet: cd contracts && npm run generate:wallet" -ForegroundColor White
    Write-Host "3. Obtenha ETH testnet" -ForegroundColor White
    Write-Host "4. Deploy o contrato: cd contracts && npm run deploy:sepolia" -ForegroundColor White
}

# Função para iniciar desenvolvimento
function Start-Dev {
    Write-Host "🚀 Iniciando ambiente de desenvolvimento..." -ForegroundColor Cyan
    
    # Verificar .env
    if (-not (Test-Path ".env")) {
        Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
        return
    }
    
    Write-Host "Abrindo 2 terminais..." -ForegroundColor Yellow
    Write-Host "Terminal 1: Backend (porta 3000)" -ForegroundColor Cyan
    Write-Host "Terminal 2: Frontend (porta 5173)" -ForegroundColor Cyan
    
    # Backend
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"
    
    # Frontend
    Start-Sleep -Seconds 2
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
    
    Write-Host "`n✅ Ambientes iniciados!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor Blue
    Write-Host "Backend: http://localhost:3000" -ForegroundColor Blue
    Write-Host "Health: http://localhost:3000/health" -ForegroundColor Blue
}

# Função para testar health check
function Test-Health {
    Write-Host "❤️  Testando health check..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
        
        if ($response.status -eq "healthy") {
            Write-Host "✅ Sistema saudável!" -ForegroundColor Green
            Write-Host "`nServiços:" -ForegroundColor Cyan
            Write-Host "  Database: $($response.services.database)" -ForegroundColor $(if($response.services.database -eq "ok"){"Green"}else{"Red"})
            Write-Host "  Blockchain: $($response.services.blockchain)" -ForegroundColor $(if($response.services.blockchain -eq "ok"){"Green"}else{"Red"})
            Write-Host "  AI: $($response.services.ai)" -ForegroundColor $(if($response.services.ai -eq "ok"){"Green"}else{"Red"})
        } else {
            Write-Host "⚠️  Sistema com problemas" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Erro ao conectar ao servidor!" -ForegroundColor Red
        Write-Host "Certifique-se de que o backend está rodando (npm run dev)" -ForegroundColor Yellow
    }
}

# Função para limpar e reinstalar
function Reset-Project {
    Write-Host "🔄 Limpando e reinstalando projeto..." -ForegroundColor Cyan
    
    $confirm = Read-Host "Isso vai deletar node_modules e reinstalar. Continuar? (s/n)"
    if ($confirm -ne "s") {
        Write-Host "Cancelado." -ForegroundColor Yellow
        return
    }
    
    Write-Host "Removendo node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules, frontend/node_modules, server/node_modules, contracts/node_modules -ErrorAction SilentlyContinue
    
    Write-Host "Removendo package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force package-lock.json, frontend/package-lock.json, server/package-lock.json, contracts/package-lock.json -ErrorAction SilentlyContinue
    
    Write-Host "Reinstalando..." -ForegroundColor Cyan
    npm run setup
    
    Write-Host "✅ Projeto resetado!" -ForegroundColor Green
}

# Ajuda
function Show-Help {
    Write-Host @"
🚀 AI-DLH - Scripts Auxiliares
================================

Comandos disponíveis:

  Generate-JWTSecret       Gera um JWT Secret aleatório
  Check-EnvFile            Verifica se .env está configurado
  Check-WalletBalance      Verifica saldo de uma wallet
  Setup-Project            Instala dependências e verifica setup
  Start-Dev                Inicia backend + frontend automaticamente
  Test-Health              Testa health check do backend
  Reset-Project            Limpa e reinstala tudo
  Show-Help                Mostra esta ajuda

Exemplos:
  
  # Gerar JWT Secret
  Generate-JWTSecret
  
  # Verificar .env
  Check-EnvFile
  
  # Verificar saldo
  Check-WalletBalance -Address 0x742d35Cc...
  
  # Setup completo
  Setup-Project
  
  # Iniciar desenvolvimento
  Start-Dev
  
  # Testar health
  Test-Health

Para carregar os scripts:
  . .\scripts.ps1

"@ -ForegroundColor Cyan
}

# Mensagem inicial
Write-Host @"

🚀 AI-DLH - Scripts carregados!

Digite 'Show-Help' para ver comandos disponíveis.

"@ -ForegroundColor Green
