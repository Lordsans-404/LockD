// app/page.tsx
import WalletConnect from "@/components/walletConnect";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">LockD 🔒</h1>
        <p className="text-gray-500">
          Commit to your goals. Stake ETH. Don't give up.
        </p>
      </div>

      {/* Card Container untuk Wallet Connect */}
      <div className="p-8 border rounded-2xl shadow-sm bg-white dark:bg-white/5 dark:border-white/10">
        <WalletConnect />
      </div>
    </main>
  );
}