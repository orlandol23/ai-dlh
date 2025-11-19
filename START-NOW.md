# 🏃 COMECE AGORA - Guia de 5 Minutos

## 👋 Bem-vindo!

Este guia vai te colocar em funcionamento nos próximos **5 minutos**.

---

## ✅ Passo 1: Carregar Scripts (30 segundos)

```powershell
# No PowerShell, na raiz do projeto:
cd f:\projects\all
. .\scripts.ps1
```

**Saída esperada:**

```
🚀 AI-DLH - Scripts carregados!
Digite 'Show-Help' para ver comandos disponíveis.
```

---

## ✅ Passo 2: Instalar Dependências (3 minutos)

```powershell
Setup-Project
```

Isso vai:

- ✅ Instalar todas dependências
- ✅ Verificar estrutura do projeto
- ✅ Mostrar status do .env

**Aguarde ~3 minutos** enquanto instala.

---

## ✅ Passo 3: Criar .env (30 segundos)

```powershell
# Copiar template
Copy-Item .env.example .env

# Abrir no VS Code
code .env
```

---

## ✅ Passo 4: Gerar JWT Secret (10 segundos)

```powershell
Generate-JWTSecret
```

**Copie** o resultado e **cole** no `.env`:

```bash
JWT_SECRET=o_resultado_gerado_aqui
```

---

## ✅ Passo 5: Verificar Status (10 segundos)

```powershell
Check-EnvFile
```

Você verá quais variáveis ainda faltam configurar.

---

## 🎯 Próximos Passos

Agora você tem o básico configurado! Para continuar:

### Opção A: Setup Completo (1 hora)

Siga o **[SETUP-GUIDE.md](SETUP-GUIDE.md)** para configurar:

- API Keys (Gemini, Infura)
- Blockchain (deploy contrato)
- Database (Vercel Postgres)
- Testes locais
- Deploy produção

### Opção B: Desenvolvimento Local Apenas (30 min)

Para desenvolver localmente sem blockchain:

1. **Obter Gemini API Key** (2 min)

   - https://makersuite.google.com/app/apikey
   - Adicionar ao `.env`: `GEMINI_API_KEY=...`

2. **Database Local** (5 min)

   ```powershell
   docker run --name ai-dlh-postgres `
     -e POSTGRES_PASSWORD=postgres `
     -e POSTGRES_DB=aidlh `
     -p 5432:5432 `
     -d postgres
   ```

   No `.env`:

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aidlh
   ```

3. **Aplicar Migrations** (1 min)

   ```powershell
   cd server
   npm run db:push
   ```

4. **Comentar linhas blockchain** temporariamente

   Nos arquivos que usam Web3, adicione comentários temporários ou crie um modo "dev sem blockchain".

5. **Iniciar** (1 min)
   ```powershell
   cd ..
   Start-Dev
   ```

---

## 📚 Documentação Completa

- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Guia passo a passo detalhado
- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Resumo visual
- **[PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)** - Checklist produção
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Solução de problemas

---

## 🆘 Comandos Úteis

```powershell
# Carregar scripts
. .\scripts.ps1

# Ver todos comandos
Show-Help

# Verificar .env
Check-EnvFile

# Iniciar desenvolvimento
Start-Dev

# Testar health check
Test-Health

# Reset completo (se precisar)
Reset-Project
```

---

## 🎉 Pronto!

Você configurou o básico em **5 minutos**!

Agora escolha:

- 🚀 Continuar com setup completo → **[SETUP-GUIDE.md](SETUP-GUIDE.md)**
- 💻 Desenvolver localmente primeiro → Siga "Opção B" acima
- 📖 Entender arquitetura → **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

**Boa sorte!** 🚀
