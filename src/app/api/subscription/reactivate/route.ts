import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    // Verify the Firebase token
    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscriptionId" },
        { status: 400 }
      );
    }

    console.log(`🔄 Reactivating subscription ${subscriptionId} for user ${userId}`);

    // Fetch the subscription to verify ownership
    const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Verify the subscription belongs to the user
    if (subscription.metadata?.firebase_uid && subscription.metadata.firebase_uid !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to reactivate this subscription" },
        { status: 403 }
      );
    }

    // Check if subscription is currently set to cancel
    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: "Subscription is already active" },
        { status: 400 }
      );
    }

    // Reactivate the subscription
    const updated: Stripe.Subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      metadata: {
        ...subscription.metadata,
        reactivated_by: userId,
        reactivated_at: new Date().toISOString(),
      }
    });

    console.log(`✅ Subscription ${subscriptionId} reactivated successfully`);

    // Update Firestore to keep UI in sync
    try {
      const userSubscriptionRef = db.collection('user_subscription_status').doc(userId);
      await userSubscriptionRef.update({
        'subscription.cancel_at_period_end': false,
        'subscription.status': updated.status,
        'subscription.canceled_at': null,
        'updated_at': FieldValue.serverTimestamp(),
        'reactivated_at': FieldValue.serverTimestamp(),
        'cancel_requested_at': null,
      });
      console.log(`📝 Updated Firestore subscription status for user ${userId}`);
    } catch (firestoreError) {
      console.error('Failed to update Firestore:', firestoreError);
      // Don't fail the request if Firestore update fails
    }

    return NextResponse.json({ 
      success: true, 
      subscription: {
        id: updated.id,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end,
        status: updated.status,
      },
      message: "Your subscription has been reactivated successfully!",
    });
  } catch (err: any) {
    console.error("❌ Reactivate subscription error:", err);
    
    if (err.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { 
          error: "Invalid subscription ID", 
          code: "invalid_subscription",
          retryable: false 
        },
        { status: 400 }
      );
    }

    if (err.type === 'StripeAPIError') {
      return NextResponse.json(
        { 
          error: "Stripe service error. Please try again.", 
          code: "stripe_api_error",
          retryable: true 
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to reactivate subscription", 
        code: "unknown_error",
        retryable: true,
        details: err.message 
      },
      { status: 500 }
    );
  }
}
