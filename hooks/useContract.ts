"use client"

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEther, formatEther, type Address } from "viem"
import { contractAddress, contractABI } from "@/utils/contractDetails"

const CONTRACT_ADDRESS = contractAddress as Address

export interface LandDetails {
  id: number
  owner: string
  landArea: bigint
  location: string
  description: string
  imageHash: string
  carbonCredits: bigint
  pricePerCredit: bigint
  status: number
}

export interface ListingDetails {
  id: number
  landId: bigint
  seller: string
  creditsAvailable: bigint
  pricePerCredit: bigint
  active: boolean
}

export const RegistrationStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const

export { formatEther, parseEther }

export function useAdmin() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'admin',
  })
}

export function useIsAgent(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'agents',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useNextLandId() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'nextLandId',
  })
}

export function useNextListingId() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'nextListingId',
  })
}

export function useLandsByOwner(owner?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'getLandsByOwner',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  })
}

export function useLandDetails(landId?: number) {
  const result = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'getLandDetails',
    args: landId !== undefined ? [BigInt(landId)] : undefined,
    query: { enabled: landId !== undefined },
  })

  const data = result.data as [string, bigint, string, string, string, bigint, bigint, number] | undefined
  
  const landDetails: LandDetails | undefined = data ? {
    id: landId!,
    owner: data[0],
    landArea: data[1],
    location: data[2],
    description: data[3],
    imageHash: data[4],
    carbonCredits: data[5],
    pricePerCredit: data[6],
    status: Number(data[7]),
  } : undefined

  return { ...result, data: landDetails }
}

export function useActiveListings() {
  const result = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'getActiveListings',
  })
  
  return result
}

export function useListingDetails(listingId?: number) {
  const result = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'getListingDetails',
    args: listingId !== undefined ? [BigInt(listingId)] : undefined,
    query: { enabled: listingId !== undefined },
  })

  const data = result.data as [bigint, string, bigint, bigint, boolean] | undefined
  
  const listingDetails: ListingDetails | undefined = data ? {
    id: listingId!,
    landId: data[0],
    seller: data[1],
    creditsAvailable: data[2],
    pricePerCredit: data[3],
    active: data[4],
  } : undefined

  return { ...result, data: listingDetails }
}

export function useCarbonCreditsBalance(userAddress?: Address, landId?: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: 'getCarbonCreditsBalance',
    args: userAddress && landId !== undefined ? [userAddress, BigInt(landId)] : undefined,
    query: { enabled: !!userAddress && landId !== undefined },
  })
}

export function useRegisterLand() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const registerLand = async (landArea: number, location: string, description: string, imageHash: string) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'registerLand',
      args: [BigInt(landArea), location, description, imageHash],
    })
  }

  return { registerLand, isPending, isConfirming, isSuccess }
}

export function useListCarbonCredits() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const listCarbonCredits = async (landId: number, credits: number, pricePerCreditEth: string) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'listCarbonCredits',
      args: [BigInt(landId), BigInt(credits), parseEther(pricePerCreditEth)],
    })
  }

  return { listCarbonCredits, isPending, isConfirming, isSuccess }
}

export function useCancelListing() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const cancelListing = async (listingId: number) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'cancelListing',
      args: [BigInt(listingId)],
    })
  }

  return { cancelListing, isPending, isConfirming, isSuccess }
}

export function usePurchaseCarbonCredits() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const purchaseCarbonCredits = async (listingId: number, credits: number, totalPriceEth: string) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'purchaseCarbonCredits',
      args: [BigInt(listingId), BigInt(credits)],
      value: parseEther(totalPriceEth),
    })
  }

  return { purchaseCarbonCredits, isPending, isConfirming, isSuccess }
}

export function useApproveLand() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approveLand = async (landId: number, carbonCredits: number, pricePerCreditEth: string) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'approveLand',
      args: [BigInt(landId), BigInt(carbonCredits), parseEther(pricePerCreditEth)],
    })
  }

  return { approveLand, isPending, isConfirming, isSuccess }
}

export function useRejectLand() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const rejectLand = async (landId: number) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'rejectLand',
      args: [BigInt(landId)],
    })
  }

  return { rejectLand, isPending, isConfirming, isSuccess }
}

export function useAddAgent() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const addAgent = async (agentAddress: string) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'addAgent',
      args: [agentAddress as Address],
    })
  }

  return { addAgent, isPending, isConfirming, isSuccess }
}

export function useRemoveAgent() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const removeAgent = async (agentAddress: string) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'removeAgent',
      args: [agentAddress as Address],
    })
  }

  return { removeAgent, isPending, isConfirming, isSuccess }
}
