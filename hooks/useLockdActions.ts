// hooks/useLockdActions.ts
"use client";

import { useWriteContract } from "wagmi";
import { LOCKD_ABI, LOCKD_ADDRESS } from "@/config/contract";

export function useLockDActions() {
  const { writeContractAsync, isPending } = useWriteContract();

  /* ---------------- CREATE PLEDGE ---------------- */

  async function createPledge(params: {
    targetDays: 1 | 3 | 7;
    sessionDuration: number; // seconds
    stakeAmount: bigint;     // wei
  }) {
    const { targetDays, sessionDuration, stakeAmount } = params;

    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "createPledge",
      args: [targetDays, sessionDuration],
      value: stakeAmount,
    });
  }

  /* ---------------- CHECK IN ---------------- */

  async function checkIn(params: {
    pledgeId: bigint;
    signature: `0x${string}`;
  }) {
    const { pledgeId, signature } = params;

    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "checkIn",
      args: [pledgeId, signature],
    });
  }

  /* ---------------- REDEMPTION ---------------- */

  async function startRedemption(pledgeId: bigint) {
    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "startRedemption",
      args: [pledgeId],
    });
  }

  /* ---------------- CLAIM ---------------- */

  async function claimPledge(pledgeId: bigint) {
    return writeContractAsync({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "claimPledge",
      args: [pledgeId],
    });
  }

  return {
    /* actions */
    createPledge,
    checkIn,
    startRedemption,
    claimPledge,

    /* state */
    isPending,
  };
}
