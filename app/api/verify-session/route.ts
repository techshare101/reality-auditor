import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripeClient";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

const stripe = getStripe();

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    console.log(`🔍 Verifying Stripe session: ${sessionId}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get userId from metadata
    const userId = session.metadata?.userId || session.metadata?.firebaseUid;
    
    if (!userId || userId === 'anonymous') {
      console.warn("⚠️ No userId found in session metadata");
      return NextResponse.json({ 
        success: true, 
        message: "Session verified but no user to update" 
      });
    }

    console.log(`✅ Session verified for user: ${userId}`);

    // Update Firestore immediately to ensure Pro status
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const currentPeriodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    // Update subscription document
    await db.collection("subscriptions").doc(userId).set({
      planType: "pro",
      status: "active",
      auditsLimit: 999999, // Unlimited (large number)
      auditsUsed: 0,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      customerEmail: session.customer_email,
      currentPeriodStart: Timestamp.fromDate(monthStart),
      currentPeriodEnd: Timestamp.fromDate(currentPeriodEnd),
      updatedAt: Timestamp.now(),
    }, { merge: true });

    // Also update usage collection
    await db.collection("usage").doc(userId).set({
      audits_used: 0,
      audit_limit: 999999, // Unlimited (large number)
      plan: "pro",
      last_reset: Timestamp.now(),
      subscription_active: true,
      billing_cycle_start: monthStart.toISOString(),
      billing_cycle_end: currentPeriodEnd.toISOString(),
    }, { merge: true });

    console.log(`🎉 User ${userId} upgraded to Pro plan successfully!`);

    return NextResponse.json({ 
      success: true,
      userId,
      planType: "pro",
      message: "Subscription verified and updated"
    });

  } catch (error) {
    console.error("❌ Error verifying session:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}
