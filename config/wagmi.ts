// config/wagmi.ts
import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// 1. Dapatkan Project ID dari WalletConnect Cloud (Gratis)
// Kalo belum ada, bisa dikosongkan dulu atau pakai string acak untuk dev lokal
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'public_project_id'

export const config = createConfig({
  chains: [baseSepolia], // Chain yang kita dukung
  ssr: true,
  storage: createStorage({
    storage: cookieStorage, // Agar status wallet persisten saat refresh
  }),
  connectors: [
    injected(), // Metamask, Rabby, dll
    walletConnect({ projectId }), // Support QR Code wallet
  ],
  transports: {
    [baseSepolia.id]: http(), // RPC Provider
  },
})