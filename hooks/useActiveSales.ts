import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { contractAddress, contractABI } from "@/utils/contractDetails";

export function useActiveSales() {
  const { data: nextSaleId } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: "nextSaleId",
  });

  const saleIds = useMemo(() => {
    if (!nextSaleId) return [];
    const n = Number(nextSaleId);
    if (isNaN(n) || n === 0) return [];
    return Array.from({ length: n }, (_, i) => i);
  }, [nextSaleId]);

  const { data: salesData, isLoading } = useReadContracts({
    contracts: saleIds.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi: contractABI,
      functionName: "sales",
      args: [BigInt(id)],
    })),
    query: { enabled: saleIds.length > 0 },
  });

  const activeSales = useMemo(() => {
    if (!salesData) return [];
    return salesData
      .map((result, idx) => {
        if (!result || !result.result || result.status !== "success") return null;
        const [id, landId, seller, tokenAmount, priceWei, isActive] = result.result as unknown as [
          bigint,
          bigint,
          string,
          bigint,
          bigint,
          boolean,
        ];
        return {
          id,
          landId,
          seller,
          tokenAmount,
          priceWei,
          isActive,
          saleId: saleIds[idx],
        };
      })
      .filter((sale) => sale && sale.isActive);
  }, [salesData, saleIds]);

  return { activeSales, isLoading };
}