import { network } from "hardhat";
import { writeFileSync } from "node:fs";

async function main() {
  console.log("🚀 Deploying CarbonCredit contracts to Sepolia...");

  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  
  console.log("Deploying with account:", deployer.account.address);

  // Deploy Token
  console.log("\n📦 Deploying CarbonCreditToken...");
  const token = await viem.deployContract("CarbonCreditToken");
  const tokenAddress = token.address;
  console.log("✅ Token deployed at:", tokenAddress);

  // Deploy CarbonCredit
  console.log("\n📦 Deploying CarbonCredit...");
  const agentAddress = deployer.account.address;
  const carbonCredit = await viem.deployContract("CarbonCredit", [tokenAddress, agentAddress]);
  const carbonAddress = carbonCredit.address;
  console.log("✅ CarbonCredit deployed at:", carbonAddress);

  // Set minter
  console.log("\n⚙️  Setting minter role...");
  await token.write.setMinter([carbonAddress]);
  console.log("✅ Minter set to CarbonCredit contract");

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`\nToken Address: ${tokenAddress}`);
  console.log(`Contract Address: ${carbonAddress}`);
  console.log(`Agent Address: ${agentAddress}`);
  console.log("=".repeat(60));

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    tokenAddress,
    carbonCreditAddress: carbonAddress,
    agentAddress,
    deployerAddress: deployer.account.address,
  };

  writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n✅ Deployment info saved to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
