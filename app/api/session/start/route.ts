import { NextRequest } from "next/server";
import { db } from "@/lib/firebase/admin";

// Start a new focus session
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

        const startTime = Math.floor(Date.now() / 1000);

        // Store session in Firestore for validation
        await db.collection("sessions").doc(`${pledgeId}_${userAddress}`).set({
            pledgeId,
            userAddress,
            startTime,
            createdAt: new Date(),
        });

        console.log("=== SESSION STARTED ===");
        console.log("Pledge ID:", pledgeId);
        console.log("User:", userAddress);
        console.log("Start Time:", startTime);

        return Response.json({
            success: true,
            startTime,
            message: "Session started. Focus time!"
        });
    } catch (err: any) {
        console.error("[SESSION START ERROR]", err);
        return Response.json(
            { error: err.message || "Failed to start session" },
            { status: 500 }
        );
    }
}
