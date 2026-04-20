import { useReadContract } from "wagmi";
import { Address } from "viem";
import { contractAddress, contractABI } from "@/utils/contractDetails";

export enum LandStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export interface LandEntry {
  id: bigint;
  latitude: bigint;
  longitude: bigint;
  radiusMeters: bigint;
  areaSqMeters: bigint;
  owner: Address;
  documentIpfsHash: string;
  status: LandStatus;
  ndviBps: bigint;
  calculatedCredits: bigint;
  creditsCalculated: boolean;
  creditsMinted: boolean;
}

export function useLandDetails(landId: number | null) {
  const { data, isLoading, error } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: "landEntries",
    args: landId !== null ? [BigInt(landId)] : undefined,
    query: { enabled: landId !== null },
  });

  // Data is a tuple returned from the LandEntry struct
  type LandEntryTuple = [
    bigint,  // id
    bigint,  // latitude
    bigint,  // longitude
    bigint,  // radiusMeters
    bigint,  // areaSqMeters
    Address, // owner
    string,  // documentIpfsHash
    number,  // status (enum)
    bigint,  // ndviBps
    bigint,  // calculatedCredits
    boolean, // creditsCalculated
    boolean  // creditsMinted
  ];

  const parsedData: LandEntry | null = data
    ? {
        id: (data as LandEntryTuple)[0],
        latitude: (data as LandEntryTuple)[1],
        longitude: (data as LandEntryTuple)[2],
        radiusMeters: (data as LandEntryTuple)[3],
        areaSqMeters: (data as LandEntryTuple)[4],
        owner: (data as LandEntryTuple)[5],
        documentIpfsHash: (data as LandEntryTuple)[6],
        status: (data as LandEntryTuple)[7] as LandStatus,
        ndviBps: (data as LandEntryTuple)[8],
        calculatedCredits: (data as LandEntryTuple)[9],
        creditsCalculated: (data as LandEntryTuple)[10],
        creditsMinted: (data as LandEntryTuple)[11],
      }
    : null;

  return {
    land: parsedData,
    isLoading,
    error,
  };
}
