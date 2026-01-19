import { http, createConfig, cookieStorage, createStorage, fallback } from 'wagmi'
import { baseSepolia, arbitrumSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// 1. Dapatkan Project ID dari WalletConnect Cloud (Gratis)
// Kalo belum ada, bisa dikosongkan dulu atau pakai string acak untuk dev lokal
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'public_project_id'

export const config = createConfig({
  chains: [arbitrumSepolia], // Chain yang kita dukung
  ssr: true,
  storage: createStorage({
    storage: cookieStorage, // Agar status wallet persisten saat refresh
  }),
  connectors: [
    injected(), // Metamask, Rabby, dll
    walletConnect({ projectId }), // Support QR Code wallet
  ],
  transports: {
    // Fallback transport: jika RPC pertama gagal, otomatis coba yang berikutnya
    [arbitrumSepolia.id]: fallback([
      http('https://sepolia-rollup.arbitrum.io/rpc'), // Official Arbitrum RPC
      http('https://arbitrum-sepolia.blockpi.network/v1/rpc/public'), // BlockPI
      http(process.env.NEXT_PUBLIC_RPC_URL), // User's RPC as last fallback
    ]),
  },
})