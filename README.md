# 🚀 AI-Powered Decentralized Learning Hub (AI-DLH)

A personalized learning platform that uses **Generative AI** to create educational content on-demand and **records progress on blockchain**. Portfolio project demonstrating proficiency in Frontend, Full Stack, Generative AI, and Web3.

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About the Project

AI-DLH is an educational platform that combines:

- **Generative AI (Gemini)**: Creates personalized learning modules based on user-selected topic and difficulty level
- **Blockchain (Ethereum)**: Records module completions (score ≥ 70%) as permanent certificates on the blockchain
- **Web3 Auth**: Decentralized authentication via MetaMask
- **Type-safe API (tRPC)**: End-to-end type safety between frontend and backend

### Skills Demonstrated

- ✅ Modern Frontend (React 18, TypeScript, Tailwind CSS)
- ✅ Scalable Architecture (Atomic Design, Clean Code)
- ✅ Robust Backend (Node.js, tRPC, Drizzle ORM)
- ✅ Secure Smart Contracts (Solidity, OpenZeppelin)
- ✅ AI Integration (Google Gemini API)
- ✅ Web3 (ethers.js, MetaMask)
- ✅ DevOps (CI/CD, Docker-ready)
- ✅ Testing (Unit, Integration, E2E)

---

## 🛠️ Tech Stack

### Frontend

| Technology   | Purpose          |
| ------------ | ---------------- |
| React 18     | UI Framework     |
| TypeScript   | Type Safety      |
| Vite 5       | Build Tool       |
| Tailwind CSS | Styling          |
| Zustand      | State Management |
| tRPC React   | API Client       |

### Backend

| Technology  | Purpose       |
| ----------- | ------------- |
| Node.js 20  | Runtime       |
| Express     | HTTP Server   |
| tRPC        | Type-safe API |
| Drizzle ORM | Database ORM  |
| PostgreSQL  | Database      |
| Winston     | Logging       |

### Blockchain

| Technology       | Purpose               |
| ---------------- | --------------------- |
| Solidity 0.8.20  | Smart Contract        |
| Hardhat          | Development Framework |
| ethers.js v6     | Blockchain Library    |
| OpenZeppelin     | Security Patterns     |
| Ethereum Sepolia | Test Network          |

### AI

| Technology              | Purpose            |
| ----------------------- | ------------------ |
| Google Gemini 2.0 Flash | Content Generation |

---

## ✨ Features

### For Users

1. **Web3 Authentication**

   - Login via MetaMask (message signing)
   - Secure sessions with JWT

2. **AI-Powered Module Generation**

   - Enter any topic (e.g., "TypeScript", "React Hooks")
   - Choose difficulty level (Beginner, Intermediate, Advanced)
   - AI generates personalized content + quiz

3. **Interactive Quiz System**

   - 4-5 multiple choice questions
   - Immediate feedback
   - Explanations for correct answers

4. **Blockchain Certification**

   - Score ≥ 70% → Automatic blockchain recording
   - Permanent and verifiable certificate
   - Etherscan transaction link

5. **Progress Dashboard**
   - Statistics (modules, average score, pass rate)
   - Module history
   - Blockchain records

---

## 📦 Prerequisites

- **Node.js** 20+
- **npm** or **yarn**
- **Git**
- **MetaMask** (browser extension)
- **Infura/Alchemy account** (Ethereum RPC)
- **Google Gemini API Key**

---

## 🚀 Installation

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md).

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/ai-dlh.git
cd ai-dlh

# 2. Install all dependencies
npm run setup

# 3. Copy environment template
cp .env.example .env

# 4. Start development servers
npm run dev
```

---

## ⚙️ Configuration

### 1. Environment Variables

Edit `.env` file with your credentials:

```bash
# AI - Google Gemini
GEMINI_API_KEY=your_key_here  # https://makersuite.google.com/app/apikey

# Database
DATABASE_URL=postgresql://...  # Vercel Postgres or local

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0x...              # Generate with: npm run generate:wallet
CONTRACT_ADDRESS=0x...         # After deployment

# Authentication
JWT_SECRET=your_secure_secret  # openssl rand -base64 32
```

### 2. Generate Backend Wallet

```bash
npm run generate:wallet
```

> ⚠️ **IMPORTANT:** This wallet is for backend use only. Get testnet ETH from https://sepoliafaucet.com

### 3. Deploy Smart Contract

```bash
# Make sure wallet has Sepolia ETH
npm run deploy:contract

# Copy contract address to .env
# CONTRACT_ADDRESS=0x...

# Verify on Etherscan (optional)
npm run deploy:verify
```

### 4. Setup Database

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:push
```

---

## 🎮 Usage

### Local Development

```bash
# Start frontend + backend simultaneously
npm run dev

# Or separately:
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3000
```

### Using the Application

1. Open http://localhost:5173
2. Click "Connect Wallet"
3. Approve MetaMask connection
4. Sign the authentication message
5. Start generating modules!

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Smart contract tests
npm run test:contract

# Backend tests
npm run test:backend

# E2E tests (Cypress)
npm run test:e2e
```

---

## 🌐 Deployment

### Deploy to Vercel

1. Create a Vercel project
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy!

```bash
# Or via CLI
npx vercel --prod
```

### Required Environment Variables

| Variable           | Description                  |
| ------------------ | ---------------------------- |
| `GEMINI_API_KEY`   | Google Gemini API key        |
| `DATABASE_URL`     | PostgreSQL connection string |
| `ETHEREUM_RPC_URL` | Infura/Alchemy RPC URL       |
| `PRIVATE_KEY`      | Backend wallet private key   |
| `CONTRACT_ADDRESS` | Deployed contract address    |
| `JWT_SECRET`       | JWT signing secret           |
| `FRONTEND_URL`     | Vercel deployment URL        |

---

## 📁 Project Structure

```
ai-dlh/
├── contracts/              # Solidity smart contracts
│   ├── contracts/
│   │   └── LearningProgress.sol
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── generate-wallet.ts
│   └── test/
│       └── LearningProgress.test.ts
│
├── server/                 # Node.js backend
│   ├── routers/           # tRPC routers
│   ├── services/          # Business logic
│   ├── db/                # Database schema
│   ├── middleware/        # Auth, CORS
│   └── index.ts           # Server entry
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # UI components (Atomic Design)
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # Zustand stores
│   │   └── lib/           # Utils, tRPC client
│   └── index.html
│
├── docs/                  # Documentation
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
│
├── .github/workflows/     # CI/CD pipelines
├── .env.example          # Environment template
└── package.json          # Root scripts
```

---

## 🗺️ Roadmap

- [x] Smart contract deployment
- [x] Backend API (tRPC)
- [x] Frontend base
- [x] Web3 authentication
- [x] AI module generation
- [x] Quiz system
- [x] Blockchain recording
- [ ] Individual module page
- [ ] Complete interactive quiz
- [ ] User profile
- [ ] Rankings and badges
- [ ] Mobile responsive
- [ ] PWA support
- [ ] Internationalization (i18n)

---

## 💰 API Costs (Free Tier)

| Service         | Tier         | Cost         |
| --------------- | ------------ | ------------ |
| Vercel          | Free         | $0           |
| Vercel Postgres | 256MB        | $0           |
| Gemini API      | 1500 req/day | $0           |
| Infura          | 100k req/day | $0           |
| Sepolia Testnet | -            | $0           |
| **TOTAL**       |              | **$0/month** |

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** - Generative AI
- **OpenZeppelin** - Smart contract libraries
- **Vercel** - Hosting platform
- **Ethereum Foundation** - Blockchain infrastructure
- **React Team** - UI framework

---

**Built as a portfolio project demonstrating expertise in:**

`Frontend` • `Full Stack` • `Generative AI` • `Web3` • `Blockchain`

⭐ If you found this project useful, please consider giving it a star!

📧 Contact: your-email@example.com
