import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

export const config = createConfig(
  getDefaultConfig({
    chains: [sepolia],
    transports: {
      [sepolia.id]: http(sepoliaRpcUrl),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    appName: 'CarbonCredit Marketplace',
    appDescription: 'A decentralized marketplace for carbon credits',
    appUrl: 'https://carboncredit.app',
    appIcon: 'https://carboncredit.app/logo.png',
  })
)

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
