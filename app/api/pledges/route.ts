import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin"

// GET Request

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pledgeId = searchParams.get("pledgeId");

    if (!pledgeId) {
      return NextResponse.json(
        { error: "pledgeId is required" },
        { status: 400 }
      );
    }

    const ref = db.collection("pledgeMetadata").doc(pledgeId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Pledge metadata not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(snap.data());
  } catch (error) {
    console.error("[GET /api/pledges]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST Request

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { pledgeId, title, description, owner } = body;

    /* ---------------- VALIDATION ---------------- */

    if (!pledgeId || typeof pledgeId !== "string") {
      return NextResponse.json(
        { error: "Invalid pledgeId" },
        { status: 400 }
      );
    }

    if (!owner || typeof owner !== "string") {
      return NextResponse.json(
        { error: "Invalid owner address" },
        { status: 400 }
      );
    }

    /* ---------------- FIRESTORE WRITE ---------------- */

    const ref = db.collection("pledgeMetadata").doc(pledgeId);

    await ref.set({
      pledgeId,
      title: title ?? "",
      description: description ?? "",
      owner,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/pledges]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
