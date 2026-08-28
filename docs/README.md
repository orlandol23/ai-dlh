# 📚 Documentation - AI-DLH

Welcome to the AI-Powered Decentralized Learning Hub documentation.

## 📋 Documentation Index

| Document                                   | Description                                                |
| ------------------------------------------ | ---------------------------------------------------------- |
| [PLANO_MESTRE.md](./PLANO_MESTRE.md)       | **Plano vigente** — billing on-chain, adaptativo v2, fases de execução e estado atual |
| [IMPROVEMENTS_v2.1.md](./IMPROVEMENTS_v2.1.md) | Registro histórico (✅ concluído)                       |
| [SETUP.md](./SETUP.md)                     | Complete setup guide (prerequisites, API keys, deployment) |
| [DEPLOYMENT.md](./DEPLOYMENT.md)           | Production deployment guide                                |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions                                |
| [SOLIDITY_REVIEW_CHECKLIST.md](./SOLIDITY_REVIEW_CHECKLIST.md) | Contract review checklist                |
| [adr/](./adr/)                             | Architecture decision records                              |

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/orlandol23/ai-dlh.git
cd ai-dlh
npm run setup

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start development
npm run dev
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

---

## 📁 Project Structure

```
ai-dlh/
├── frontend/           # React 18 + TypeScript + Tailwind
│   ├── src/components/ # UI components (Atomic Design)
│   ├── src/pages/      # Route pages
│   ├── src/hooks/      # Custom hooks (useAuth)
│   └── src/lib/        # tRPC client, utilities
│
├── server/             # Node.js + Express + tRPC
│   ├── routers/        # API endpoints
│   ├── services/       # Business logic (AI, Web3, Auth)
│   └── db/             # Drizzle ORM schema
│
├── contracts/          # Solidity smart contracts
│   ├── contracts/      # LearningProgress.sol
│   ├── scripts/        # Deploy scripts
│   └── test/           # Contract tests
│
└── docs/               # This documentation
```

---

## 🔗 Key Resources

- **Main README**: [../README.md](../README.md)
- **Contributing**: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **License**: [../LICENSE](../LICENSE)

---

**Stack:** React 18 • TypeScript • Node.js • tRPC • Solidity • viem (frontend) • ethers.js (server/contracts) • Gemini AI
