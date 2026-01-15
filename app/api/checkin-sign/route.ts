import { NextRequest } from "next/server";
import { keccak256, encodeAbiParameters } from "viem";
import { publicClient, signerClient } from "@/lib/viem-server";
import { LOCKD_ABI, LOCKD_ADDRESS } from "@/config/contract";
import { db } from "@/lib/firebase/admin";

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

    /* ---------------- VALIDATE SESSION DURATION (OPTIONAL) ---------------- */

    // ANTI-CHEAT: Check if user completed their session
    // If Firebase not configured, this validation is skipped
    let sessionValidationPassed = false;
    let sessionStartTime: number | undefined;
    let sessionDuration: number | undefined;

    try {
      const sessionDoc = await db
        .collection("sessions")
        .doc(`${pledgeId}_${userAddress}`)
        .get();

      if (!sessionDoc.exists) {
        console.warn("⚠️ No session found - skipping validation");
        sessionValidationPassed = true; // Allow if no session tracking
      } else {
        const sessionData = sessionDoc.data();
        sessionStartTime = sessionData?.startTime;

        if (!sessionStartTime) {
          console.warn("⚠️ Invalid session data");
          sessionValidationPassed = true;
        } else {
          // Read pledge to get session duration
          const pledgeForValidation = await publicClient.readContract({
            abi: LOCKD_ABI,
            address: LOCKD_ADDRESS,
            functionName: "pledges",
            args: [BigInt(pledgeId)],
          }) as PledgeTuple;

          sessionDuration = pledgeForValidation[4]; // sessionDuration field
          sessionValidationPassed = true; // Passed initial checks, now proceed to duration check
        }
      }
    } catch (firebaseError) {
      console.error("Firebase session validation failed:", firebaseError);
      console.warn("⚠️ Skipping session validation due to Firebase error.");
      sessionValidationPassed = true; // Skip validation if Firebase fails
    }

    // Only perform duration check if session validation was attempted and passed initial checks
    if (sessionValidationPassed && sessionStartTime !== undefined && sessionDuration !== undefined) {
      const currentTime = Math.floor(Date.now() / 1000);
      const elapsed = currentTime - sessionStartTime;

      console.log("=== SESSION VALIDATION ===");
      console.log("Session Duration Required:", sessionDuration, "seconds");
      console.log("Time Elapsed:", elapsed, "seconds");
      console.log("Remaining:", Math.max(0, sessionDuration - elapsed), "seconds");

      if (elapsed < sessionDuration) {
        const remaining = sessionDuration - elapsed;
        return Response.json(
          {
            error: "Session not completed yet. Keep focusing!",
            remainingSeconds: remaining,
            message: `You need to focus for ${Math.floor(remaining / 60)} more minutes`
          },
          { status: 403 }
        );
      }
    } else if (!sessionValidationPassed) {
      // This case should ideally not be reached if sessionValidationPassed is false due to an explicit error
      // but it's a fallback if the logic above doesn't explicitly return.
      // For now, the `sessionValidationPassed = true` in error/skip cases means this block won't trigger
      // unless there's a specific scenario where validation was intended but failed without setting the flag.
      // Given the current logic, if sessionValidationPassed is false, it means an explicit return happened.
    }

    console.log("✅ Session completed! Generating signature...");

    // Check if session duration has elapsed
    // This pledge read is for the actual check-in logic, not just validation
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

    // NEW CONTRACT: checkIn(pledgeId, signature) - NO TIMESTAMP!
    // Message hash: keccak256(abi.encode(pledgeId, user, contract, completedDays, status))
    const messageHash = keccak256(
      encodeAbiParameters(
        [
          { type: 'uint256' },  // pledgeId
          { type: 'address' },  // user
          { type: 'address' },  // contract address
          { type: 'uint8' },    // completedDays
          { type: 'uint8' },    // status (enum = uint8)
        ],
        [
          BigInt(pledgeId),
          userAddress as `0x${string}`,
          LOCKD_ADDRESS,
          completedDays,
          status,
        ]
      )
    );

    console.log("=== CHECK-IN SIGNATURE ===");
    console.log("PledgeId:", pledgeId);
    console.log("User:", userAddress);
    console.log("CompletedDays:", completedDays);
    console.log("Status:", status);
    console.log("Message Hash:", messageHash);

    /* ---------------- SIGN MESSAGE ---------------- */

    // Contract uses .toEthSignedMessageHash() which adds Ethereum prefix
    const signature = await signerClient.signMessage({
      message: { raw: messageHash },
    });

    console.log("Signature:", signature);

    return Response.json({ signature });
  } catch (err: any) {
    console.error("[CHECK-IN SIGN ERROR]", err);
    return Response.json(
      { error: err.message || "Failed to sign check-in" },
      { status: 500 }
    );
  }
}
