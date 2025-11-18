#!/bin/bash

# AI-DLH Setup Script
# Este script automatiza a configuração inicial do projeto

echo "🚀 AI-DLH Setup Script"
echo "======================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ é necessário. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..
echo ""

# Install contracts dependencies
echo "📦 Installing contracts dependencies..."
cd contracts
npm install
cd ..
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys!"
else
    echo "✅ .env already exists"
fi
echo ""

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p server/logs
echo ""

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env and add your API keys"
echo "   2. Get Gemini API key: https://makersuite.google.com/app/apikey"
echo "   3. Generate wallet: npm run generate:wallet"
echo "   4. Get Sepolia ETH: https://sepoliafaucet.com"
echo "   5. Deploy contract: npm run deploy:contract"
echo "   6. Start development: npm run dev"
echo ""
echo "📚 Read QUICKSTART.md for detailed instructions"
echo ""
