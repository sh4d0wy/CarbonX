import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { Address, parseEther } from "viem";
import { contractAddress, contractABI } from "@/utils/contractDetails";

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export function useListCarbonCredits() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const listCarbonCredits = async (
    landId: number,
    tokenAmount: number,
    pricePerCreditETH: string
  ) => {
    try {
      if (!publicClient) throw new Error("Wallet client not ready");
      if (!address) throw new Error("Wallet not connected");
      if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
        throw new Error("Token amount must be greater than 0");
      }

      const weiPerToken = BigInt("1000000000000000000");
      const tokenAmountWei = BigInt(tokenAmount) * weiPerToken;
      const pricePerCreditWei = parseEther(pricePerCreditETH);
      const totalPriceWei = (tokenAmountWei * pricePerCreditWei) / weiPerToken;

      const creditTokenAddress = (await publicClient.readContract({
        address: contractAddress as Address,
        abi: contractABI,
        functionName: "creditToken",
      })) as Address;

      const landEntry = (await publicClient.readContract({
        address: contractAddress as Address,
        abi: contractABI,
        functionName: "landEntries",
        args: [BigInt(landId)],
      })) as readonly unknown[];

      const ownerFromEntry = String(landEntry[5] || "").toLowerCase();
      if (!ownerFromEntry || ownerFromEntry === "0x0000000000000000000000000000000000000000") {
        throw new Error("Invalid landId or land not found");
      }
      if (ownerFromEntry !== address.toLowerCase()) {
        throw new Error("Connected wallet is not owner of this landId");
      }

      const currentAllowance = (await publicClient.readContract({
        address: creditTokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, contractAddress as Address],
      })) as bigint;

      if (currentAllowance < tokenAmountWei) {
        const approveHash = await writeContractAsync({
          address: creditTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [contractAddress as Address, tokenAmountWei],
        });

        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
        });

        if (approveReceipt.status !== "success") {
          throw new Error("Approve transaction failed");
        }
      }

      const txHash = await writeContractAsync({
        address: contractAddress as Address,
        abi: contractABI,
        functionName: "listCreditsForSale",
        args: [BigInt(landId), tokenAmountWei, totalPriceWei],
      });

      return txHash;
    } catch (error: any) {
      throw new Error(
        error?.shortMessage ||
        error?.cause?.shortMessage ||
        error?.message ||
        "Failed to create listing"
      );
    }
  };

  return { listCarbonCredits };
}
