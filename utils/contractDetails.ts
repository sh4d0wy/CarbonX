import { Abi } from "viem";

export const contractAddress = "0xaf6eE487153d56331B80032b98aC0B04bB32dE11" as const;
export const contractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "agentAddress",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldAgent",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newAgent",
          "type": "address"
        }
      ],
      "name": "AgentUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ndviBps",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "creditsToMint",
          "type": "uint256"
        }
      ],
      "name": "CreditsCalculated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "saleId",
          "type": "uint256"
        }
      ],
      "name": "CreditsDelisted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "saleId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "priceWei",
          "type": "uint256"
        }
      ],
      "name": "CreditsListed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "saleId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "priceWei",
          "type": "uint256"
        }
      ],
      "name": "CreditsPurchased",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "mintedAmount",
          "type": "uint256"
        }
      ],
      "name": "LandApproved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "landOwner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "int256",
          "name": "latitude",
          "type": "int256"
        },
        {
          "indexed": false,
          "internalType": "int256",
          "name": "longitude",
          "type": "int256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "radiusMeters",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "areaSqMeters",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "documentIpfsHash",
          "type": "string"
        }
      ],
      "name": "LandRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        }
      ],
      "name": "LandRejected",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "agent",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        }
      ],
      "name": "approveLand",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "saleId",
          "type": "uint256"
        }
      ],
      "name": "buyCredits",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "ndviBps",
          "type": "uint256"
        }
      ],
      "name": "calculateCredits",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "creditsToMint",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "saleId",
          "type": "uint256"
        }
      ],
      "name": "cancelSale",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "creditToken",
      "outputs": [
        {
          "internalType": "contract CarbonCreditToken",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "landEntries",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "int256",
          "name": "latitude",
          "type": "int256"
        },
        {
          "internalType": "int256",
          "name": "longitude",
          "type": "int256"
        },
        {
          "internalType": "uint256",
          "name": "radiusMeters",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "areaSqMeters",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "documentIpfsHash",
          "type": "string"
        },
        {
          "internalType": "enum CarbonCredit.ListingStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "ndviBps",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "calculatedCredits",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "creditsCalculated",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "creditsMinted",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "landId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "priceWei",
          "type": "uint256"
        }
      ],
      "name": "listCreditsForSale",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "saleId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextLandEntryId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextSaleId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "int256",
          "name": "latitude",
          "type": "int256"
        },
        {
          "internalType": "int256",
          "name": "longitude",
          "type": "int256"
        },
        {
          "internalType": "uint256",
          "name": "radiusMeters",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "areaSqMeters",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "walletAddress",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "documentIpfsHash",
          "type": "string"
        }
      ],
      "name": "registerLand",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "entryId",
          "type": "uint256"
        }
      ],
      "name": "rejectLand",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "sales",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "landId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "priceWei",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newAgent",
          "type": "address"
        }
      ],
      "name": "setAgent",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const satisfies Abi;