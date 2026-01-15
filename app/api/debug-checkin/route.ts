import { NextRequest } from "next/server";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { publicClient, signerClient } from "@/lib/viem-server";
import { LOCKD_ABI, LOCKD_ADDRESS } from "@/config/contract";

type PledgeTuple = readonly [
    `0x${string}`, // owner
    bigint,        // stakedAmount
    number,        // startTime
    number,        // lastCheckIn
    number,        // sessionDuration
    number,        // targetDays
    number,        // completedDays
    number         // status
];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { pledgeId, userAddress } = body;

        // 1. Read contract signerWallet
        const contractSignerWallet = await publicClient.readContract({
            abi: LOCKD_ABI,
            address: LOCKD_ADDRESS,
            functionName: "signerWallet",
        }) as `0x${string}`;

        // 2. Get our backend signer address
        const backendSignerAddress = signerClient.account?.address;

        // 3. Read pledge data
        const pledge = await publicClient.readContract({
            abi: LOCKD_ABI,
            address: LOCKD_ADDRESS,
            functionName: "pledges",
            args: [BigInt(pledgeId)],
        }) as PledgeTuple;

        const owner = pledge[0];
        const completedDays = pledge[6];
        const status = pledge[7];
        const timestamp = Math.floor(Date.now() / 1000);

        // 4. Build message hash
        const messageHash = keccak256(
            encodeAbiParameters(
                parseAbiParameters(
                    "uint256 pledgeId, address user, address contractAddress, uint8 completedDays, uint8 status, uint256 timestamp"
                ),
                [
                    BigInt(pledgeId),
                    userAddress,
                    LOCKD_ADDRESS,
                    completedDays,
                    status,
                    BigInt(timestamp),
                ]
            )
        );

        // 5. Sign
        const signature = await signerClient.signMessage({
            message: { raw: messageHash },
        });

        return Response.json({
            diagnosis: {
                contractSignerWallet,
                backendSignerAddress,
                addressMatch: contractSignerWallet.toLowerCase() === backendSignerAddress?.toLowerCase(),
                pledgeData: {
                    owner,
                    completedDays,
                    status,
                    userMatch: owner.toLowerCase() === userAddress.toLowerCase(),
                },
                messageData: {
                    messageHash,
                    signature,
                    timestamp,
                },
            },
            verdict: contractSignerWallet.toLowerCase() === backendSignerAddress?.toLowerCase()
                ? "✅ Signer address MATCH! Problem bukan di private key."
                : "❌ Signer address TIDAK MATCH! Ini masalahnya!",
        });
    } catch (err: any) {
        console.error(err);
        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
