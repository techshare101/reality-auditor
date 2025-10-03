import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// Simple endpoint to check if a user is Pro
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("uid");

  if (!userId) {
    return NextResponse.json({ 
      isPro: false,
      error: "Missing uid parameter" 
    }, { status: 400 });
  }

  try {
    // Check profiles collection for subscription status
    const profileDoc = await db.collection("profiles").doc(userId).get();

    if (!profileDoc.exists) {
      return NextResponse.json({ 
        isPro: false,
        subscription_status: "free",
        userId 
      });
    }

    const data = profileDoc.data();
    const status = data?.subscription_status || "free";
    const isPro = status === "pro";

    return NextResponse.json({
      isPro,
      subscription_status: status,
      userId
    });
  } catch (error: any) {
    console.error("❌ Subscription check error:", error.message);
    // Default to free on error
    return NextResponse.json({ 
      isPro: false,
      subscription_status: "free",
      error: "Check failed" 
    });
  }
}