import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeClient";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Stripe } from "stripe";

// In App Router, we handle raw body directly in the function
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") as string;
  const body = await req.text();
  
  const stripe = getStripe();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log("✅ Stripe event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("💳 Checkout completed:", session.id);
        
        // Get userId from metadata
        const userId = session.metadata?.userId || session.metadata?.uid;
        
        if (!userId) {
          console.error("❌ No userId found in checkout session metadata");
          break;
        }

        console.log(`🎉 Upgrading user ${userId} to Pro`);
        
        // Update profiles collection
        await db.collection("profiles").doc(userId).set({
          subscription_status: "pro",
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });
        
        // Update usage collection
        await db.collection("usage").doc(userId).set({
          plan: "pro",
          audit_limit: 100, // Your Pro plan limit
          audits_used: 0, // Reset on upgrade
          updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });
        
        // Create customer mapping for future webhook events
        if (session.customer) {
          await db.collection("stripe_customers").doc(session.customer as string).set({
            userId,
            created_at: FieldValue.serverTimestamp(),
          });
        }
        
        console.log(`✅ User ${userId} upgraded to Pro successfully`);
        break;
      }
      
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🔄 Subscription updated:", subscription.id);
        
        // Find user by customer ID
        const customerDoc = await db.collection("stripe_customers")
          .doc(subscription.customer as string)
          .get();
          
        if (!customerDoc.exists) {
          console.error(`❌ No user found for customer: ${subscription.customer}`);
          break;
        }
        
        const userId = customerDoc.data()?.userId;
        if (!userId) {
          console.error(`❌ No userId in customer mapping: ${subscription.customer}`);
          break;
        }
        
        const isActive = subscription.status === "active";
        const plan = isActive ? "pro" : "free";
        
        // Update profile
        await db.collection("profiles").doc(userId).update({
          subscription_status: plan,
          stripe_subscription_status: subscription.status,
          subscription_updated_at: FieldValue.serverTimestamp(),
          current_period_end: new Date((subscription as any).current_period_end * 1000),
        });
        
        // Update usage limits
        await db.collection("usage").doc(userId).update({
          plan,
          audit_limit: plan === "pro" ? 100 : 5,
          updated_at: FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ User ${userId} subscription updated to ${plan}`);
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("❌ Subscription cancelled:", subscription.id);
        
        // Find user by customer ID
        const customerDoc = await db.collection("stripe_customers")
          .doc(subscription.customer as string)
          .get();
          
        if (!customerDoc.exists) {
          console.error(`❌ No user found for customer: ${subscription.customer}`);
          break;
        }
        
        const userId = customerDoc.data()?.userId;
        if (!userId) {
          console.error(`❌ No userId in customer mapping: ${subscription.customer}`);
          break;
        }
        
        // Downgrade to free
        await db.collection("profiles").doc(userId).update({
          subscription_status: "free",
          stripe_subscription_status: "cancelled",
          subscription_cancelled_at: FieldValue.serverTimestamp(),
          subscription_updated_at: FieldValue.serverTimestamp(),
        });
        
        // Update usage to free plan
        await db.collection("usage").doc(userId).update({
          plan: "free",
          audit_limit: 5,
          updated_at: FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ User ${userId} downgraded to free plan`);
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("💰 Payment succeeded:", invoice.id);
        
        // Reset monthly usage on subscription renewal
        if ((invoice as any).subscription && (invoice as any).billing_reason === "subscription_cycle") {
          const customerDoc = await db.collection("stripe_customers")
            .doc(invoice.customer as string)
            .get();
            
          if (customerDoc.exists) {
            const userId = customerDoc.data()?.userId;
            if (userId) {
              await db.collection("usage").doc(userId).update({
                audits_used: 0,
                last_reset: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp(),
              });
              console.log(`✅ Reset usage for user ${userId}`);
            }
          }
        }
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("⚠️ Payment failed for:", invoice.customer);
        
        // Optional: Update payment status
        const customerDoc = await db.collection("stripe_customers")
          .doc(invoice.customer as string)
          .get();
          
        if (customerDoc.exists) {
          const userId = customerDoc.data()?.userId;
          if (userId) {
            await db.collection("profiles").doc(userId).update({
              payment_status: "failed",
              last_payment_error: FieldValue.serverTimestamp(),
            });
            console.warn(`⚠️ Payment failed for user ${userId}`);
          }
        }
        break;
      }
      
      default:
        console.log("ℹ️ Unhandled event:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Webhook error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}