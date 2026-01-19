import { createPublicClient, createWalletClient, http, fallback } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// Use fallback transport for reliability
const transport = fallback([
  http('https://sepolia-rollup.arbitrum.io/rpc'), // Official Arbitrum RPC
  http(process.env.RPC_URL!), // User's RPC as fallback
]);

export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport,
});

// Validate SIGNER_PRIVATE_KEY
const privateKey = process.env.SIGNER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "SIGNER_PRIVATE_KEY is not set in environment variables. " +
    "Please add it to your .env file: SIGNER_PRIVATE_KEY=0x..."
  );
}

// Ensure private key has 0x prefix
const formattedPrivateKey = privateKey.startsWith("0x")
  ? privateKey
  : `0x${privateKey}`;

const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);

export const signerClient = createWalletClient({
  chain: arbitrumSepolia,
  transport, // Use same fallback transport
  account,
});
