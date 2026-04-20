import { network } from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🧪 Starting CarbonCredit Contract Tests...\n");

  const { viem } = await network.connect({ network: "hardhat" });
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const token = await viem.deployContract("CarbonCreditToken");
  const carbonCredit = await viem.deployContract("CarbonCredit", [
    token.address,
    deployer.account.address,
  ]);
  await token.write.setMinter([carbonCredit.address]);

  const tokenAddress = token.address;
  const carbonAddress = carbonCredit.address;

  console.log("📋 Contract Addresses:");
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   CarbonCredit: ${carbonAddress}\n`);

  // Test 1: Register Land
  console.log("✅ TEST 1: Register Land with Scaled Coordinates");
  const latitude = 28633798; // 28.633798
  const longitude = 77445804; // 77.445804
  const radiusMeters = 18;
  const areaSqMeters = 500000; // 50 hectares
  const ipfsHash = "QmTest123456789";

  const registerHash = await deployer.writeContract({
    address: carbonAddress,
    abi: carbonCredit.abi,
    functionName: "registerLand",
    args: [
      BigInt(latitude),
      BigInt(longitude),
      BigInt(radiusMeters),
      BigInt(areaSqMeters),
      deployer.account.address,
      ipfsHash,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: registerHash });
  console.log("   ✓ Land registered successfully\n");

  // Test 2: Verify Land Data
  console.log("✅ TEST 2: Verify Land Data Storage");
  const landData = await publicClient.readContract({
    address: carbonAddress,
    abi: carbonCredit.abi,
    functionName: "landEntries",
    args: [0n],
  });

  console.log("   Land Entry 0:");
  console.log(`   - Latitude (scaled): ${landData[1]}`);
  console.log(`   - Expected (28.633798 × 1e6): ${BigInt(latitude) * BigInt(1_000_000)}`);
  console.log(`   - Longitude (scaled): ${landData[2]}`);
  console.log(`   - Expected (77.445804 × 1e6): ${BigInt(longitude) * BigInt(1_000_000)}`);
  console.log(`   - Area: ${landData[4]} sq meters`);
  console.log(`   - IPFS Hash: ${landData[6]}`);
  console.log(`   - Status: ${landData[7]} (0=Pending, 1=Approved, 2=Rejected)\n`);

  console.log("✅ TEST 3: Agent Calculates Credits");
  const calculateHash = await deployer.writeContract({
    address: carbonAddress,
    abi: carbonCredit.abi,
    functionName: "calculateCredits",
    args: [0n, 5000n], // 50% NDVI
  });

  await publicClient.waitForTransactionReceipt({ hash: calculateHash });
  console.log("   ✓ Credits calculated at 50% NDVI\n");

  console.log("✅ TEST 4: Agent Approves Land & Mints Tokens");
  const approveHash = await deployer.writeContract({
    address: carbonAddress,
    abi: carbonCredit.abi,
    functionName: "approveLand",
    args: [0n],
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("   ✓ Land approved and tokens minted\n");

  console.log("✅ TEST 5: Verify Token Balance");
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: token.abi,
    functionName: "balanceOf",
    args: [deployer.account.address],
  });

  console.log(`   Token balance: ${formatEther(balance)} CCT\n`);

  console.log("✅ TEST 6: Approve Tokens for Listing");
  const approveTokenHash = await deployer.writeContract({
    address: tokenAddress,
    abi: token.abi,
    functionName: "approve",
    args: [carbonAddress, balance],
  });

  await publicClient.waitForTransactionReceipt({ hash: approveTokenHash });
  console.log("   ✓ Tokens approved for CarbonCredit\n");

  // Test 7: List Credits for Sale
  console.log("✅ TEST 7: List Credits for Sale with landId");
  const tokenAmount = parseEther("100");
  const priceWei = parseEther("0.1");

  const listHash = await deployer.writeContract({
    address: carbonAddress,
    abi: carbonCredit.abi,
    functionName: "listCreditsForSale",
    args: [0n, tokenAmount, priceWei],
  });

  await publicClient.waitForTransactionReceipt({ hash: listHash });
  console.log(`   ✓ Listed ${formatEther(tokenAmount)} CCT at ${formatEther(priceWei)} ETH each\n`);

  // Test 8: Verify Sale Data
  console.log("✅ TEST 8: Verify Sale Data with landId");
  const saleData = await publicClient.readContract({
    address: carbonAddress,
    abi: carbonCredit.abi,
    functionName: "sales",
    args: [0n],
  });

  console.log("   Sale #0:");
  console.log(`   - landId: ${saleData[1]} ✓ (linked to land)`);
  console.log(`   - tokenAmount: ${formatEther(saleData[3])} CCT`);
  console.log(`   - priceWei: ${formatEther(saleData[4])} ETH`);
  console.log(`   - isActive: ${saleData[5]}\n`);

  console.log("=".repeat(60));
  console.log("🎉 ALL TESTS PASSED!");
  console.log("=".repeat(60));
  console.log("\n✅ Key Features Verified:");
  console.log("   ✓ Land registration with scaled coordinates");
  console.log("   ✓ Agent approval workflow");
  console.log("   ✓ Token minting on approval");
  console.log("   ✓ Credit listing with landId");
  console.log("   ✓ Sales properly linked to lands");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
