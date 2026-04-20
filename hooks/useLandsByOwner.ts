import { useReadContracts } from "wagmi";
import { Address } from "viem";
import { contractAddress, contractABI } from "@/utils/contractDetails";

interface UseLandsByOwnerReturn {
  data: bigint[];
  isLoading: boolean;
  refetch: () => void;
}

export function useLandsByOwner(ownerAddress: Address | null): UseLandsByOwnerReturn {
  // First, get nextLandEntryId to know how many lands exist
  const { data: nextLandEntryIdData, isLoading: isLoadingCount, refetch: refetchCount } = useReadContracts({
    contracts: [
      {
        address: contractAddress as Address,
        abi: contractABI,
        functionName: "nextLandEntryId",
      },
    ],
    query: { enabled: !!ownerAddress },
  });

  const nextLandEntryId = nextLandEntryIdData?.[0]?.result
    ? Number(nextLandEntryIdData[0].result)
    : 0;

  // Prepare array of land entry IDs [0, 1, 2, ...]
  const landIds = Array.from({ length: nextLandEntryId }, (_, i) => i);

  // Batch fetch all land entries
  const { data: landsData, isLoading: isLoadingLands, refetch: refetchLands } = useReadContracts({
    contracts: landIds.map((id) => ({
      address: contractAddress as Address,
      abi: contractABI,
      functionName: "landEntries",
      args: [BigInt(id)],
    })),
    query: { enabled: landIds.length > 0 && !!ownerAddress },
  });

  // Filter lands by owner
  const ownerLandIds: bigint[] = landsData
    ?.map((result, index) => {
      if (!result.result) return null;
      const landData = result.result as any;
      const landOwner = landData[5] as Address; // owner is at index 5 in LandEntry struct
      return landOwner?.toLowerCase() === ownerAddress?.toLowerCase()
        ? BigInt(index)
        : null;
    })
    .filter((id): id is bigint => id !== null) || [];

  const refetch = () => {
    refetchCount();
    refetchLands();
  };

  return {
    data: ownerLandIds,
    isLoading: isLoadingCount || isLoadingLands,
    refetch,
  };
}
