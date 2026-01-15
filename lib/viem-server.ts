import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL!),
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
  chain: sepolia,
  transport: http(process.env.RPC_URL!),
  account,
});
