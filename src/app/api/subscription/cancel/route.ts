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

    console.log(`🚫 Cancelling subscription ${subscriptionId} for user ${userId}`);

    // Fetch the subscription to verify ownership
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Verify the subscription belongs to the user (via metadata or customer lookup)
    if (subscription.metadata?.firebase_uid && subscription.metadata.firebase_uid !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this subscription" },
        { status: 403 }
      );
    }

    // Mark subscription to cancel at end of billing period
    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancelled_by: userId,
        cancelled_at: new Date().toISOString(),
      }
    }) as any; // Type assertion to handle Stripe response

    console.log(`✅ Subscription ${subscriptionId} marked for cancellation at period end`);

    // Update Firestore to keep UI in sync
    try {
      const userSubscriptionRef = db.collection('user_subscription_status').doc(userId);
      await userSubscriptionRef.update({
        'subscription.cancel_at_period_end': true,
        'subscription.current_period_end': updated.current_period_end,
        'subscription.status': updated.status,
        'subscription.canceled_at': updated.canceled_at || null,
        'updated_at': FieldValue.serverTimestamp(),
        'cancel_requested_at': FieldValue.serverTimestamp(),
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
        canceled_at: updated.canceled_at || null,
      },
      message: `Subscription will be cancelled at the end of the current billing period (${new Date(updated.current_period_end * 1000).toLocaleDateString()})`,
    });
  } catch (err: any) {
    console.error("❌ Cancel subscription error:", err);
    
    // Provide specific error messages for common Stripe errors
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

    if (err.type === 'StripeConnectionError') {
      return NextResponse.json(
        { 
          error: "Network error. Please check your connection and try again.", 
          code: "connection_error",
          retryable: true 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to cancel subscription", 
        code: "unknown_error",
        retryable: true,
        details: err.message 
      },
      { status: 500 }
    );
  }
}
