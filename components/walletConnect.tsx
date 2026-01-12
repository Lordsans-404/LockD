'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'

export default function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-green-600 font-bold">Connected</p>
        <p className="text-sm bg-gray-100 p-2 rounded">{address}</p>
        <div className="flex flex-row justify-around">
          <button 
            onClick={() => disconnect()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Disconnect
          </button>
          <a href="/dashboard" className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600' >Dashboard</a>
        </div>
        
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}