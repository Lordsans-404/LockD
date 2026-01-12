import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL!),
});

export const signerClient = createWalletClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL!),
  account: process.env.SIGNER_WALLET_ADDRESS as `0x${string}`,
});
