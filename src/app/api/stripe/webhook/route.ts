import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.error("❌ No Stripe signature found");
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`🎯 Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("💳 Checkout session completed:", session.id);

        // Get customer email and metadata
        const customerEmail = session.customer_email;
        const userId = session.metadata?.userId || session.client_reference_id;

        if (!userId) {
          console.error("❌ No userId found in checkout session metadata");
          break;
        }

        console.log(`👤 Processing subscription for user: ${userId}`);

        // Determine plan type based on price ID
        const priceId = session.metadata?.priceId;
        let planType = "basic";
        let auditsLimit = 100;

        // Map price IDs to plans and limits
        const priceToPlan: Record<string, { plan: string; limit: number }> = {
          'price_1QUsqXRrC5nflManTGgCF3pY': { plan: 'basic', limit: 100 },
          'price_1QUstJRrC5nflManZvdQKFgJ': { plan: 'pro', limit: 500 },
          // Add your actual price IDs here
        };
        
        const planInfo = priceToPlan[priceId || ''] || { plan: 'basic', limit: 100 };
        planType = planInfo.plan;
        auditsLimit = planInfo.limit;

        // Get subscription details
        const subscriptionId = session.subscription as string;
        let subscription: Stripe.Subscription | null = null;

        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }

        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const currentPeriodEnd = subscription?.current_period_end 
          ? new Date(subscription.current_period_end * 1000)
          : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

        // Update Firestore subscription document
        const subscriptionRef = db.collection("subscriptions").doc(userId);
        await subscriptionRef.set({
          planType,
          status: "active",
          auditsLimit,
          auditsUsed: 0, // Reset usage on new subscription
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          customerEmail,
          currentPeriodStart: Timestamp.fromDate(monthStart),
          currentPeriodEnd: Timestamp.fromDate(currentPeriodEnd),
          updatedAt: Timestamp.now(),
        }, { merge: true });

        // Also update the usage collection for real-time tracking
        const usageRef = db.collection("usage").doc(userId);
        await usageRef.set({
          audits_used: 0,
          audit_limit: auditsLimit,
          plan: planType,
          last_reset: Timestamp.now(),
          subscription_active: true,
          billing_cycle_start: monthStart.toISOString(),
          billing_cycle_end: currentPeriodEnd.toISOString(),
        }, { merge: true });

        console.log(`✅ Upgraded ${userId} to ${planType} plan with ${auditsLimit} audits/month`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🔄 Subscription updated:", subscription.id);

        // Find user by Stripe subscription ID
        const subscriptionsQuery = await db.collection("subscriptions")
          .where("stripeSubscriptionId", "==", subscription.id)
          .limit(1)
          .get();

        if (subscriptionsQuery.empty) {
          console.error("❌ No user found for subscription:", subscription.id);
          break;
        }

        const doc = subscriptionsQuery.docs[0];
        const userId = doc.id;

        // Update subscription status
        await doc.ref.update({
          status: subscription.status,
          currentPeriodEnd: Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
          updatedAt: Timestamp.now(),
        });

        console.log(`✅ Updated subscription status for ${userId}: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🗑️ Subscription canceled:", subscription.id);

        // Find user by Stripe subscription ID
        const subscriptionsQuery = await db.collection("subscriptions")
          .where("stripeSubscriptionId", "==", subscription.id)
          .limit(1)
          .get();

        if (subscriptionsQuery.empty) {
          console.error("❌ No user found for subscription:", subscription.id);
          break;
        }

        const doc = subscriptionsQuery.docs[0];
        const userId = doc.id;

        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

        // Downgrade to free plan
        await doc.ref.set({
          planType: "free",
          status: "free",
          auditsLimit: 5,
          auditsUsed: 0,
          previousPlan: doc.data().planType,
          canceledAt: Timestamp.now(),
          currentPeriodStart: Timestamp.fromDate(monthStart),
          currentPeriodEnd: Timestamp.fromDate(nextMonthStart),
          updatedAt: Timestamp.now(),
        }, { merge: true });

        // Also update the usage collection
        const usageRef = db.collection("usage").doc(userId);
        await usageRef.set({
          audit_limit: 5,
          plan: "free",
          subscription_active: false,
          last_reset: Timestamp.now(),
        }, { merge: true });

        console.log(`✅ Downgraded ${userId} to free plan`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("💰 Payment succeeded for invoice:", invoice.id);

        // Reset monthly usage on successful payment for subscription cycles
        if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
          const subscriptionsQuery = await db.collection("subscriptions")
            .where("stripeSubscriptionId", "==", invoice.subscription)
            .limit(1)
            .get();

          if (!subscriptionsQuery.empty) {
            const doc = subscriptionsQuery.docs[0];
            const userId = doc.id;
            const userData = doc.data();

            // Update subscription collection
            await doc.ref.update({
              auditsUsed: 0,
              lastPaymentDate: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            // Reset usage in the usage collection
            const usageRef = db.collection("usage").doc(userId);
            const previousUsage = (await usageRef.get()).data();
            
            await usageRef.set({
              audits_used: 0,
              audit_limit: userData.auditsLimit || 100,
              plan: userData.planType || 'basic',
              last_reset: Timestamp.now(),
              previous_period_usage: previousUsage?.audits_used || 0,
              billing_cycle_start: new Date().toISOString(),
              subscription_active: true
            }, { merge: true });

            console.log(`✅ Reset usage counter for ${userId} on new billing cycle`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("❌ Payment failed for invoice:", invoice.id);

        // Handle failed payments
        if (invoice.subscription) {
          const subscriptionsQuery = await db.collection("subscriptions")
            .where("stripeSubscriptionId", "==", invoice.subscription)
            .limit(1)
            .get();

          if (!subscriptionsQuery.empty) {
            const doc = subscriptionsQuery.docs[0];
            
            await doc.ref.update({
              paymentStatus: "failed",
              lastPaymentError: invoice.status,
              updatedAt: Timestamp.now(),
            });

            console.log(`⚠️ Marked payment as failed for subscription ${invoice.subscription}`);
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "stripe-webhook",
    timestamp: new Date().toISOString(),
  });
}
