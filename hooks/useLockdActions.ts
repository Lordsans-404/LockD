// hooks/useLockdActions.ts
"use client";

import { useWriteContract, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { LOCKD_ABI, LOCKD_ADDRESS } from "@/config/contract";

export function useLockDActions() {
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  /* ---------------- CREATE PLEDGE ---------------- */

  async function createPledge(params: {
    targetDays: 1 | 3 | 7;
    sessionDuration: number;
    stakeAmount: bigint;
  }) {
    // 1. Cek safety publicClient
    if (!publicClient) {
      throw new Error("Public client is not initialized");
    }

    const hash = await writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "createPledge",
      args: [params.targetDays, params.sessionDuration],
      value: params.stakeAmount,
      gas: 200_000n, // Explicit gas limit for Arbitrum
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 2. Decode Log
    const event = receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: LOCKD_ABI,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      })
      .find((parsedLog) => parsedLog?.eventName === "PledgeCreated");

    if (!event) throw new Error("PledgeCreated event not found");

    // 3. Robust PledgeId Extraction
    // First, try fast access safely
    const args = event.args as any;

    // Check known potential property names
    let finalId: bigint | undefined;

    if (args.pledgeId) finalId = args.pledgeId;
    else if (args.id) finalId = args.id;
    else if (args._pledgeId) finalId = args._pledgeId;
    else if (Array.isArray(args) && args.length > 0) finalId = args[0]; // Fallback to index 0 if it's an array-like structure

    if (finalId === undefined) {
      console.error("Failed to parse PledgeID from event args:", args);
      throw new Error("Could not extract Pledge ID from event");
    }

    return {
      pledgeId: finalId,
      txHash: hash,
    };
  }
  /* ---------------- CHECK IN ---------------- */

  async function checkIn(params: {
    pledgeId: bigint;
    signature: `0x${string}`;
  }) {
    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "checkIn",
      args: [params.pledgeId, params.signature],
      gas: 150_000n, // Explicit gas limit for Arbitrum
    });
  }


  /* ---------------- REDEMPTION ---------------- */

  async function startRedemption(pledgeId: bigint) {
    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "startRedemption",
      args: [pledgeId],
      gas: 150_000n, // Explicit gas limit for Arbitrum
    });
  }

  /* ---------------- CLAIM ---------------- */

  async function claimPledge(pledgeId: bigint) {
    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "claimPledge",
      args: [pledgeId],
      gas: 150_000n, // Explicit gas limit for Arbitrum
    });
  }

  /* ---------------- SURRENDER ---------------- */

  async function surrender(pledgeId: bigint) {
    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "surrender",
      args: [pledgeId],
      gas: 150_000n, // Explicit gas limit for Arbitrum
    });
  }

  return {
    /* actions */
    createPledge,
    checkIn,
    startRedemption,
    claimPledge,
    surrender,

    /* state */
    isPending,
  };
}
