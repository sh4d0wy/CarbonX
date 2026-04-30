import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { contractAddress, contractABI } from "@/utils/contractDetails"
import { parseEther } from "viem"
import { useEffect } from "react"

export function useBuyCredits() {
  const {
    mutate,          
    data: hash,
    isPending,
    error,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
  if (error) {
    console.error("Buy failed:", error)
  }
}, [error])

  const buyCredits = ({
    saleId,
    valueWei,
  }: {
    saleId: number
    valueWei: bigint
  }) => {
    mutate({
      address: contractAddress,
      abi: contractABI,
      functionName: "buyCredits",
      args: [BigInt(saleId)],
      value: valueWei,
    })
  }

  return {
    buyCredits,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    hash,
  }
}