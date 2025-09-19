import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase-admin";
import { getStripe, stripeHelpers } from "@/lib/stripeClient";
import type Stripe from "stripe";

// Live Stripe Price IDs
const PRICE_PLANS: Record<string, string> = {
  basic_monthly: "price_1S2KmxGRxp9eu0DJrdcrLLNR", // ✅ Your $19/month plan
  // Placeholders (update when ready)
  basic_yearly: "price_basic_yearly_placeholder",
  pro_monthly: "price_pro_monthly_placeholder",
  pro_yearly: "price_pro_yearly_placeholder",
  enterprise_monthly: "price_enterprise_monthly_placeholder",
  enterprise_yearly: "price_enterprise_yearly_placeholder",
};

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Stripe checkout route called");

    const body = await request.json();
    const { priceId } = body;

    if (!priceId || !Object.values(PRICE_PLANS).includes(priceId)) {
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
        monthly: PRICE_PLANS.basic_monthly,
        yearly: PRICE_PLANS.basic_yearly,
        name: "Basic Plan",
        price: 19,
        audits: 50,
        features: [
          "50 audits/month",
          "Advanced analysis",
          "Email support",
          "Priority processing",
        ],
      },
    },
    available: {
      basic_monthly: {
        priceId: PRICE_PLANS.basic_monthly,
        name: "Basic Plan",
        price: 19,
        currency: "USD",
        interval: "month",
        audits: 50,
      },
    },
  });
}
