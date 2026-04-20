"use client"

import { useMemo } from "react"
import {
	useAccount,
	usePublicClient,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi"
import { type Address } from "viem"
import { contractAddress, contractABI } from "@/utils/contractDetails"

const CONTRACT_ADDRESS = contractAddress as Address

export const RegistrationStatus = {
	Pending: 0,
	Approved: 1,
	Rejected: 2,
} as const

type LandEntryTuple = readonly [
	bigint,
	bigint,
	bigint,
	bigint,
	bigint,
	Address,
	string,
	number,
	bigint,
	bigint,
	boolean,
	boolean,
]

export interface LandDetails {
	id: number
	owner: Address
	landArea: bigint
	location: string
	description: string
	imageHash: string
	carbonCredits: bigint
	pricePerCredit: bigint
	status: number
	latitude: number
	longitude: number
	radiusMeters: bigint
	areaSqMeters: bigint
}

export function useAdmin() {
	return useReadContract({
		address: CONTRACT_ADDRESS,
		abi: contractABI,
		functionName: "owner",
	})
}

export function useIsAgent(address?: Address) {
	const query = useReadContract({
		address: CONTRACT_ADDRESS,
		abi: contractABI,
		functionName: "agent",
	})

	const isAgent = useMemo(() => {
		const contractAgent = query.data as Address | undefined
		if (!contractAgent || !address) return false
		return contractAgent.toLowerCase() === address.toLowerCase()
	}, [query.data, address])

	return {
		...query,
		data: isAgent,
		agentAddress: query.data as Address | undefined,
	}
}

export function useNextLandId() {
	return useReadContract({
		address: CONTRACT_ADDRESS,
		abi: contractABI,
		functionName: "nextLandEntryId",
	})
}

export function useAgentLandDetails(landId?: number) {
	const result = useReadContract({
		address: CONTRACT_ADDRESS,
		abi: contractABI,
		functionName: "landEntries",
		args: landId !== undefined ? [BigInt(landId)] : undefined,
		query: { enabled: landId !== undefined },
	})

	const parsed = useMemo<LandDetails | undefined>(() => {
		if (!result.data || landId === undefined) return undefined
		const entry = result.data as LandEntryTuple

		const areaSqMeters = entry[4]
		const areaHectares = areaSqMeters / BigInt(10000)
		const latitude = Number(entry[1]) / 1_000_000_000_000
		const longitude = Number(entry[2]) / 1_000_000_000_000

		return {
			id: Number(entry[0]),
			owner: entry[5],
			landArea: areaHectares,
			location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
			description: "",
			imageHash: entry[6],
			carbonCredits: entry[9],
			pricePerCredit: BigInt(0),
			status: Number(entry[7]),
			latitude,
			longitude,
			radiusMeters: entry[3],
			areaSqMeters,
		}
	}, [result.data, landId])

	return { ...result, data: parsed }
}

export function useApproveLand() {
	const { address } = useAccount()
	const publicClient = usePublicClient()
	const { writeContractAsync, isPending, data: hash } = useWriteContract()
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

	const approveLand = async (
		landId: number,
		ndviBpsInput: number,
		_ignoredPricePerCreditEth?: string,
	) => {
		const ndviBps = Math.floor(ndviBpsInput)
		if (ndviBps < 0 || ndviBps > 10_000) {
			throw new Error("NDVI must be between 0 and 10000 basis points")
		}

		if (!publicClient) {
			throw new Error("Wallet client not ready")
		}

		const currentAgent = (await publicClient.readContract({
			address: CONTRACT_ADDRESS,
			abi: contractABI,
			functionName: "agent",
		})) as Address

		if (!address || currentAgent.toLowerCase() !== address.toLowerCase()) {
			throw new Error("Connected wallet is not the active agent. Use owner account to setAgent first.")
		}

		const entry = (await publicClient.readContract({
			address: CONTRACT_ADDRESS,
			abi: contractABI,
			functionName: "landEntries",
			args: [BigInt(landId)],
		})) as LandEntryTuple

		if (entry[5] === "0x0000000000000000000000000000000000000000") {
			throw new Error("Entry not found")
		}
		if (Number(entry[7]) !== RegistrationStatus.Pending) {
			throw new Error("Entry is not pending")
		}
		if (entry[11]) {
			throw new Error("Credits already minted for this entry")
		}

		const calculateHash = await writeContractAsync({
			address: CONTRACT_ADDRESS,
			abi: contractABI,
			functionName: "calculateCredits",
			args: [BigInt(landId), BigInt(ndviBps)],
		})

		const calculateReceipt = await publicClient.waitForTransactionReceipt({
			hash: calculateHash,
		})

		if (calculateReceipt.status !== "success") {
			throw new Error("Credit calculation transaction failed")
		}

		const approveHash = await writeContractAsync({
			address: CONTRACT_ADDRESS,
			abi: contractABI,
			functionName: "approveLand",
			args: [BigInt(landId)],
		})

		return { calculateHash, approveHash }
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
			functionName: "rejectLand",
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
			functionName: "setAgent",
			args: [agentAddress as Address],
		})
	}

	return { addAgent, isPending, isConfirming, isSuccess }
}
