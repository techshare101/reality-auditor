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
    const userEmail = decodedToken.email;
    
    console.log(`🔄 Syncing subscription status for user ${userId} (${userEmail})`);

    // Get user's subscription status from Firestore
    const userSubRef = db.collection('user_subscription_status').doc(userId);
    const userSubDoc = await userSubRef.get();
    const userData = userSubDoc.data();

    if (!userData) {
      console.log('📝 No subscription data found in Firestore, creating free tier');
      await userSubRef.set({
        email: userEmail,
        userId: userId,
        status: 'free',
        subscription: null,
        audits_used: 0,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      
      return NextResponse.json({ 
        success: true, 
        status: 'free',
        message: 'Created free tier subscription status'
      });
    }

    // If user has a Stripe subscription ID, sync with Stripe
    if (userData.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          userData.stripeSubscriptionId
        ) as any;

        console.log(`📊 Stripe subscription status: ${subscription.status}`);

        // Update Firestore with latest Stripe data
        await userSubRef.update({
          'subscription.status': subscription.status,
          'subscription.current_period_end': subscription.current_period_end,
          'subscription.cancel_at_period_end': subscription.cancel_at_period_end || false,
          'subscription.canceled_at': subscription.canceled_at || null,
          'status': subscription.status === 'active' ? 'paid' : 
                   subscription.status === 'past_due' ? 'overdue' : 
                   subscription.status === 'canceled' ? 'free' : subscription.status,
          'updated_at': FieldValue.serverTimestamp(),
          'last_sync': FieldValue.serverTimestamp()
        });

        return NextResponse.json({ 
          success: true,
          status: subscription.status,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end
          },
          message: 'Subscription synced successfully'
        });
      } catch (stripeError: any) {
        console.error('❌ Stripe sync error:', stripeError);
        
        // If subscription not found in Stripe, reset to free
        if (stripeError.code === 'resource_missing') {
          await userSubRef.update({
            status: 'free',
            subscription: null,
            stripeSubscriptionId: null,
            updated_at: FieldValue.serverTimestamp()
          });
          
          return NextResponse.json({ 
            success: true,
            status: 'free',
            message: 'Subscription not found in Stripe, reset to free tier'
          });
        }
        
        throw stripeError;
      }
    } else {
      // No Stripe subscription, ensure status is free
      if (userData.status === 'overdue' || userData.status === 'past_due') {
        console.log('🔧 Fixing incorrect overdue status for free user');
        await userSubRef.update({
          status: 'free',
          subscription: null,
          updated_at: FieldValue.serverTimestamp()
        });
      }
      
      return NextResponse.json({ 
        success: true,
        status: 'free',
        message: 'Free tier user, no sync needed'
      });
    }
  } catch (err: any) {
    console.error("❌ Subscription sync error:", err);
    return NextResponse.json(
      { 
        error: "Failed to sync subscription", 
        details: err.message 
      },
      { status: 500 }
    );
  }
}
