import { ethers } from 'ethers';

async function main() {
  console.log('\n🔐 Generating new Ethereum wallet for backend...\n');

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    WALLET GENERATED                       ');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📍 Address:');
  console.log(`   ${wallet.address}\n`);

  console.log('🔑 Private Key:');
  console.log(`   ${wallet.privateKey}\n`);

  console.log('🌱 Mnemonic (Seed Phrase):');
  console.log(`   ${wallet.mnemonic?.phrase}\n`);

  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('⚠️  CRITICAL SECURITY WARNINGS:');
  console.log('================================');
  console.log('1. ❌ NEVER commit this private key to git');
  console.log('2. ❌ NEVER share this key publicly');
  console.log('3. ❌ NEVER use this wallet for real funds');
  console.log('4. ✅ This wallet is ONLY for backend transactions');
  console.log('5. ✅ Store the private key in .env file');
  console.log('6. ✅ Make sure .env is in .gitignore\n');

  console.log('📝 Add to your .env file:');
  console.log('==========================');
  console.log(`PRIVATE_KEY=${wallet.privateKey}\n`);

  console.log('💰 Get testnet ETH:');
  console.log('===================');
  console.log('Before deploying, you need Sepolia ETH in this address.');
  console.log('Visit these faucets:\n');
  console.log('1. Alchemy Sepolia Faucet:');
  console.log('   https://sepoliafaucet.com');
  console.log(`   Address: ${wallet.address}\n`);

  console.log('2. Chainlink Faucet:');
  console.log('   https://faucets.chain.link/sepolia');
  console.log(`   Address: ${wallet.address}\n`);

  console.log('3. Infura Faucet:');
  console.log('   https://www.infura.io/faucet/sepolia');
  console.log(`   Address: ${wallet.address}\n`);

  console.log('📊 Check balance:');
  console.log('=================');
  console.log(`https://sepolia.etherscan.io/address/${wallet.address}\n`);

  console.log('✅ Next steps:');
  console.log('==============');
  console.log('1. Copy the PRIVATE_KEY to your .env file');
  console.log('2. Get testnet ETH from faucets above');
  console.log('3. Wait for transaction confirmation (~1 minute)');
  console.log('4. Run: npm run deploy:sepolia\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
