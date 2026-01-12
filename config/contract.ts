// config/contract.ts
import type { Abi } from "viem";
import LockD_Abi from "@/lib/contracts/lockdABI.json"; 

// 1. Export ABI as ABI
export const LOCKD_ABI = LockD_Abi as Abi;

// 2. Export Address
export const LOCKD_ADDRESS = process.env.NEXT_PUBLIC_LOCKD_ADDRESS as `0x${string}`;