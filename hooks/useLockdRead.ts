"use client";

import { useReadContract } from "wagmi";
import { LOCKD_ABI, LOCKD_ADDRESS } from "@/config/contract";

export const STATUS_MAP = [
  "ACTIVE",
  "FROZEN",
  "REDEEMING",
  "CLAIMED",
  "LIQUIDATED",
] as const;

type Status = typeof STATUS_MAP[number];

type PledgeTuple = readonly [
  `0x${string}`, // owner
  bigint,        // stakedAmount
  number,        // startTime
  number,        // lastCheckIn
  number,        // sessionDuration
  number,        // targetDays
  number,        // completedDays
  number,        // status
];

function mapStatus(status: number): Status {
  return STATUS_MAP[status];
}

export function useLockDRead(pledgeId?: bigint) {
  /* ---------------- GLOBAL STATE ---------------- */

  const nextPledgeId = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "pledges",
    args: [pledgeId],
    query: { refetchOnWindowFocus: false },
  });

  const devWallet = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "devWallet",
    query: { refetchOnWindowFocus: false },
  });

  const signerWallet = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "signerWallet",
    query: { refetchOnWindowFocus: false },
  });

  /* ---------------- CONSTANTS ---------------- */

  const cooldown = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "COOLDOWN",
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  const gracePeriod = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "GRACE_PERIOD",
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  const minStake = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "MIN_STAKE",
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  const minSessionDuration = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "MIN_SESSION_DURATION",
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  const maxSessionDuration = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "MAX_SESSION_DURATION",
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  /* ---------------- PER-PLEDGE ---------------- */

  const pledge = useReadContract({
    abi: LOCKD_ABI,
    address: LOCKD_ADDRESS,
    functionName: "pledges",
    args: pledgeId !== undefined ? [pledgeId] : undefined,
    query: {
      enabled: pledgeId !== undefined,
      refetchOnWindowFocus: false
    },
  });

  const pledgeData = pledge.data as PledgeTuple | undefined;

  /* ---------------- DERIVED STATE ---------------- */

  const now = Math.floor(Date.now() / 1000);

  const status = pledgeData
    ? mapStatus(Number(pledgeData[7]))
    : undefined;

  const lastCheckIn = pledgeData ? Number(pledgeData[3]) : 0;

  const canCheckIn =
    status === "ACTIVE" || status === "REDEEMING"
      ? lastCheckIn === 0 ||
      now >= lastCheckIn + Number(cooldown.data ?? 0)
      : false;

  /* ---------------- RETURN API ---------------- */

  return {
    /* global */
    nextPledgeId: nextPledgeId.data,
    devWallet: devWallet.data,
    signerWallet: signerWallet.data,

    /* constants */
    cooldown: cooldown.data,
    gracePeriod: gracePeriod.data,
    minStake: minStake.data,
    minSessionDuration: minSessionDuration.data,
    maxSessionDuration: maxSessionDuration.data,

    /* pledge */
    pledge: pledgeData && {
      owner: pledgeData[0],
      stakedAmount: pledgeData[1],
      startTime: pledgeData[2],
      lastCheckIn: pledgeData[3],
      sessionDuration: pledgeData[4],
      targetDays: pledgeData[5],
      completedDays: pledgeData[6],
      status,
    },

    /* derived */
    canCheckIn,

    // Granular Loading States
    isPledgeLoading: pledge.isLoading && pledge.fetchStatus !== 'idle',
    isConstantsLoading: cooldown.isLoading || gracePeriod.isLoading || minStake.isLoading || minSessionDuration.isLoading || maxSessionDuration.isLoading,
  };
}
