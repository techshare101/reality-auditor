import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripeClient";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Stripe portal route called");

    // Get auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    let userId: string;
    
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error("❌ Auth verification failed:", authError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    console.log(`🔍 Looking up Stripe customer for user: ${userId}`);

    // Get user's Stripe customer ID from Firestore
    const profileDoc = await db.collection("profiles").doc(userId).get();
    const subscriptionDoc = await db.collection("subscriptions").doc(userId).get();
    const userDoc = await db.collection("users").doc(userId).get();
    
    // Try to find Stripe customer ID in different places
    let stripeCustomerId = 
      profileDoc.data()?.stripe_customer_id || 
      subscriptionDoc.data()?.stripeCustomerId ||
      userDoc.data()?.stripeCustomerId ||
      userDoc.data()?.customerId;

    if (!stripeCustomerId) {
      // Try to find from stripe_customers collection
      const customersSnapshot = await db.collection("stripe_customers")
        .where("userId", "==", userId)
        .limit(1)
        .get();
      
      if (!customersSnapshot.empty) {
        stripeCustomerId = customersSnapshot.docs[0].id;
      }
    }

    if (!stripeCustomerId) {
      console.error("❌ No Stripe customer ID found for user");
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    console.log(`✅ Found Stripe customer ID: ${stripeCustomerId}`);

    // Create billing portal session
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    console.log(`✅ Portal session created: ${session.id}`);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Portal session error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has active subscription
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ hasSubscription: false });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Check if user is Pro
    const profileDoc = await db.collection("profiles").doc(userId).get();
    const isPro = profileDoc.data()?.subscription_status === "pro";

    return NextResponse.json({ 
      hasSubscription: isPro,
      canAccessPortal: isPro 
    });
  } catch (error) {
    return NextResponse.json({ hasSubscription: false });
  }
}