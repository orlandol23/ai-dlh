import { ethers } from "hardhat";

async function main() {
  console.log("\n🚀 Deploying LearningProgress contract...\n");

  const [deployer] = await ethers.getSigners();

  console.log("📍 Deploying with account:", deployer.address);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ ERROR: Deployer account has no funds!");
    console.log("\n💡 Get Sepolia ETH from:");
    console.log("   • https://sepoliafaucet.com");
    console.log("   • https://faucets.chain.link/sepolia");
    process.exit(1);
  }

  // Deploy contract
  const LearningProgress = await ethers.getContractFactory("LearningProgress");
  const contract = await LearningProgress.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ LearningProgress deployed successfully!");
  console.log("📍 Contract address:", contractAddress);

  // Get deployment transaction
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    console.log("📝 Transaction hash:", deployTx.hash);
    console.log("⛽ Gas used:", deployTx.gasLimit.toString());
  }

  // Print network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());

  console.log("\n📋 Next steps:");
  console.log("==============");
  console.log("\n1. Add to .env file:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);

  console.log("\n2. Verify contract on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);

  console.log("\n3. View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);

  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
