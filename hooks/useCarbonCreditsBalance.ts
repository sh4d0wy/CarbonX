import { useReadContract } from "wagmi";
import { Address } from "viem";
import { contractAddress, contractABI } from "@/utils/contractDetails";

// CarbonCreditToken ABI for balanceOf
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useCarbonCreditsBalance(ownerAddress: Address | null) {
  // First, get the token address from the CarbonCredit contract
  const { data: tokenAddress, isLoading: isLoadingToken } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: "creditToken",
    query: { enabled: true },
  });

  // Then read balance from the token contract
  const { data: balanceData, isLoading: isLoadingBalance } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!tokenAddress && !!ownerAddress },
  });

  return {
    balance: balanceData ? BigInt(balanceData.toString()) : BigInt(0),
    isLoading: isLoadingToken || isLoadingBalance,
  };
}
