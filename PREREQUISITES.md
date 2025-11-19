# ✅ Pré-requisitos - AI-DLH

Antes de começar o setup, certifique-se de ter tudo pronto.

---

## 💻 Software Necessário

### 1. Node.js (OBRIGATÓRIO) ✅

**Versão:** 20.x ou superior

**Verificar instalação:**

```powershell
node --version
# Deve mostrar: v20.x.x ou superior
```

**Não tem instalado?**

- **Download:** https://nodejs.org/
- **Escolha:** LTS (Long Term Support)
- **Após instalar:** Reinicie o terminal

---

### 2. Git (OBRIGATÓRIO) ✅

**Versão:** Qualquer versão recente

**Verificar instalação:**

```powershell
git --version
# Deve mostrar: git version 2.x.x
```

**Não tem instalado?**

- **Download:** https://git-scm.com/download/win
- **Durante instalação:** Use configurações padrão

---

### 3. Editor de Código (RECOMENDADO) ✅

**Recomendado:** Visual Studio Code

**Verificar instalação:**

```powershell
code --version
```

**Não tem instalado?**

- **Download:** https://code.visualstudio.com/
- **Extensões recomendadas:**
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

---

### 4. MetaMask (OBRIGATÓRIO para Web3) ✅

**Versão:** Extensão do navegador

**Verificar instalação:**

- Abra navegador (Chrome, Firefox, Brave, Edge)
- Procure ícone de raposa no canto superior direito

**Não tem instalado?**

- **Download:** https://metamask.io/download/
- **Suporta:** Chrome, Firefox, Brave, Edge
- **Após instalar:**
  1. Criar/importar carteira
  2. Anotar seed phrase (NUNCA compartilhe!)
  3. Adicionar rede Sepolia (faremos isso depois)

---

### 5. PowerShell (Windows) / Terminal (Mac/Linux)

**Windows:** PowerShell 5.1+ (já vem instalado)
**Mac/Linux:** Terminal padrão

**Verificar:**

```powershell
$PSVersionTable.PSVersion
# Windows: Deve mostrar 5.1 ou superior
```

---

### 6. Docker (OPCIONAL - apenas para database local)

**Versão:** Docker Desktop

**Verificar instalação:**

```powershell
docker --version
```

**Não tem instalado?**

- **Download:** https://www.docker.com/products/docker-desktop
- **Nota:** Só precisa se quiser rodar PostgreSQL localmente
- **Alternativa:** Usar Vercel Postgres (grátis, sem Docker)

---

## 🌐 Contas Necessárias

### 1. Conta Google (OBRIGATÓRIO) ✅

**Para:** Gemini API

**Tem conta Google?**

- [ ] Sim → Pronto!
- [ ] Não → Criar em https://accounts.google.com/signup

---

### 2. Conta GitHub (OBRIGATÓRIO) ✅

**Para:** Repositório e deploy

**Tem conta GitHub?**

- [ ] Sim → Pronto!
- [ ] Não → Criar em https://github.com/signup

**Verificar login:**

```powershell
git config --global user.name
git config --global user.email
```

**Não configurado?**

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@example.com"
```

---

### 3. Conta Vercel (OBRIGATÓRIO para produção) ✅

**Para:** Hospedagem e database

**Tem conta Vercel?**

- [ ] Sim → Login em https://vercel.com/login
- [ ] Não → Criar em https://vercel.com/signup
  - **Recomendado:** Fazer signup com GitHub

---

### 4. Conta Infura ou Alchemy (OBRIGATÓRIO para blockchain) ✅

**Para:** RPC Ethereum Sepolia

**Opção A - Infura (Recomendado):**

- [ ] Criar conta em https://infura.io/register
- [ ] Grátis: 100,000 requisições/dia

**Opção B - Alchemy:**

- [ ] Criar conta em https://www.alchemy.com/
- [ ] Grátis: 300M compute units/mês

**Escolha uma das duas!**

---

### 5. Conta Etherscan (OPCIONAL) ✅

**Para:** Verificação de smart contract

**Tem conta Etherscan?**

- [ ] Sim → Gerar API Key em https://etherscan.io/myapikey
- [ ] Não → Criar em https://etherscan.io/register
- [ ] **Nota:** Opcional, mas recomendado

---

## 📋 Checklist Completo

Marque conforme verificar:

### Software

- [ ] ✅ Node.js 20+ instalado e funcionando
- [ ] ✅ Git instalado e configurado
- [ ] ✅ VS Code (ou outro editor) instalado
- [ ] ✅ MetaMask instalado no navegador
- [ ] ✅ PowerShell/Terminal funcionando
- [ ] ⬜ Docker instalado (opcional)

### Contas

- [ ] ✅ Conta Google (para Gemini API)
- [ ] ✅ Conta GitHub (com git configurado)
- [ ] ✅ Conta Vercel (pode criar depois)
- [ ] ✅ Conta Infura ou Alchemy (para RPC)
- [ ] ⬜ Conta Etherscan (opcional)

### Conhecimento Básico

- [ ] Sei usar terminal/PowerShell
- [ ] Sei clonar repositório Git
- [ ] Entendo o que são variáveis de ambiente (.env)
- [ ] Sei usar MetaMask básico
- [ ] **Não sei?** Não tem problema! Os guias explicam tudo.

---

## 🎯 Tempo Estimado

Se você já tem tudo:

- ✅ **Pronto para começar!** → [START-NOW.md](START-NOW.md)

Se precisa instalar software:

- ⏱️ **~30 minutos** para instalar tudo
- Depois: ✅ **Pronto!** → [START-NOW.md](START-NOW.md)

Se precisa criar contas:

- ⏱️ **~15 minutos** para criar todas
- Depois: ✅ **Pronto!** → [START-NOW.md](START-NOW.md)

---

## 🆘 Problemas na Instalação?

### Node.js não reconhecido

```powershell
# Feche e reabra o PowerShell após instalar
# Ou reinicie o computador
```

### Git não reconhecido

```powershell
# Adicione Git ao PATH:
# Windows: Procurar → "Variáveis de ambiente"
# Adicionar: C:\Program Files\Git\cmd
```

### MetaMask não aparece

```
1. Reinicie o navegador
2. Vá em Extensões
3. Habilite MetaMask
4. Fixe na barra de ferramentas
```

### Docker não inicia (Windows)

```
1. Ative WSL 2:
   wsl --install
2. Reinicie computador
3. Abra Docker Desktop
4. Aguarde inicialização
```

---

## 💡 Dicas Importantes

### Organização

```
Crie uma pasta para projetos:
C:\Users\SeuUsuario\Projetos\
ou
D:\Projetos\

Clone o projeto lá dentro.
```

### Backup

```
✅ Sempre faça backup das:
   - Seed phrase do MetaMask
   - Chaves de API
   - Arquivo .env (local apenas!)

❌ NUNCA compartilhe:
   - Private keys
   - Seed phrases
   - Arquivo .env
```

### Segurança

```
✅ Use senhas fortes
✅ Ative 2FA nas contas importantes
✅ Não compartilhe tela com .env aberto
❌ Não commite .env no Git
```

---

## ✅ Tudo Pronto?

**Sim, tenho tudo!**
→ Comece agora: [START-NOW.md](START-NOW.md)

**Não, preciso instalar/criar contas**
→ Use este guia como checklist e volte quando terminar

**Tenho dúvidas**
→ Abra uma issue no GitHub ou consulte [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

**🚀 Preparado? Vamos lá!**

Próximo passo: [START-NOW.md](START-NOW.md)
