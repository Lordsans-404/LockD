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

    if (!pledgeId || !userAddress) {
      return Response.json(
        { error: "Missing pledgeId or userAddress" },
        { status: 400 }
      );
    }

    /* ---------------- READ PLEDGE STATE ---------------- */


    const pledge = await publicClient.readContract({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: "pledges",
      args: [BigInt(pledgeId)],
    }) as PledgeTuple;

    /**
     * pledge tuple:
     * [0] owner
     * [6] completedDays
     * [7] status
     */

    const owner = pledge[0] as `0x${string}`;
    const completedDays = pledge[6] as number;
    const status = pledge[7] as number;

    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
      return Response.json(
        { error: "Not pledge owner" },
        { status: 403 }
      );
    }

    /* ---------------- BUILD MESSAGE (MATCH CONTRACT) ---------------- */

    const messageHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters(
          "uint256 pledgeId, address user, address contractAddress, uint8 completedDays, uint8 status"
        ),
        [
          BigInt(pledgeId),
          userAddress,
          LOCKD_ADDRESS,
          completedDays,
          status,
        ]
      )
    );

    /* ---------------- SIGN MESSAGE ---------------- */

    const signature = await signerClient.signMessage({
      message: { raw: messageHash },
    });

    return Response.json({ signature });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Failed to sign check-in" },
      { status: 500 }
    );
  }
}
