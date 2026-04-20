import { contractABI, contractAddress } from "@/utils/contractDetails";
import { Address } from "viem";
import { useWriteContract } from "wagmi";

export function useRegisterLand() {
  const writeContract = useWriteContract();

  const registerLand = async (
    latitude: number,
    longitude: number,
    radiusMeters: number,
    areaSqMeters: number,
    walletAddress: Address,
    documentIpfsHash: string
  ) => {
    return new Promise((resolve, reject) => {
      writeContract.mutate(
        {
          address: contractAddress as `0x${string}`,
          abi: contractABI,
          functionName: "registerLand",
          args: [
            BigInt(Math.floor(latitude * 1_000_000)),
            BigInt(Math.floor(longitude * 1_000_000)),
            BigInt(radiusMeters),
            BigInt(areaSqMeters),
            walletAddress,
            documentIpfsHash,
          ],
        },
        {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error),
        }
      );
    });
  };

  return { registerLand };
}