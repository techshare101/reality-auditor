import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase-admin";
import { getStripe, stripeHelpers } from "@/lib/stripeClient";
import type Stripe from "stripe";

import { STRIPE_PRICES, PLAN_METADATA } from '@/lib/stripe-config';

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Stripe checkout route called");

    const body = await request.json();
    const { priceId } = body;

    if (!priceId || !Object.values(STRIPE_PRICES).includes(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // 🔑 Grab auth info (optional, for Firebase users)
    let userId: string | null = null;
    let userEmail: string | null = null;
    let stripeCustomerId: string | null = null;

    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || null;

        // Lookup existing Stripe customer in Firestore
        try {
          const customerDoc = await db.collection("customers").doc(userId).get();
          if (customerDoc.exists) {
            stripeCustomerId = customerDoc.data()?.stripeCustomerId || null;
          }
        } catch (firestoreError) {
          console.warn("⚠️ Firestore lookup failed:", firestoreError);
        }
      } catch (authError) {
        console.warn("⚠️ Auth decode failed:", authError);
      }
    }

    const stripe = getStripe();

    // ✅ Checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
      billing_address_collection: "auto",
      metadata: {
        userId: userId || "anonymous", // 👈 critical for webhook
        firebaseUid: userId || "anonymous",
        priceId,
        source: "reality_auditor_upgrade",
      },
      subscription_data: {
        metadata: {
          userId: userId || "anonymous", // 👈 backup inside subscription
          firebaseUid: userId || "anonymous",
          plan: priceId,
        },
      },
    };

    // ✅ Attach or create customer
    if (stripeCustomerId) {
      sessionConfig.customer = stripeCustomerId;
    } else if (userEmail) {
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripeHelpers.createCheckoutSession(sessionConfig);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("❌ Checkout session error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// ✅ Optional GET for frontend plan info
export async function GET() {
  return NextResponse.json({
    plans: {
      basic: {
        monthly: STRIPE_PRICES.basic_monthly,
        name: PLAN_METADATA.basic_monthly.name,
        price: PLAN_METADATA.basic_monthly.price,
        features: PLAN_METADATA.basic_monthly.features,
      },
    },
    available: {
      basic_monthly: {
        priceId: STRIPE_PRICES.basic_monthly,
        ...PLAN_METADATA.basic_monthly,
      },
    },
  });
}
