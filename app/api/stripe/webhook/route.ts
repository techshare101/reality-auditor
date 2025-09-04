// Stripe webhook handler for Reality Auditor
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db as adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userEmail = session.customer_email;
        const userId = session.metadata?.userId;

        console.log("✅ Checkout completed for:", userEmail);

        // Store user subscription status
        if (userEmail && userId) {
          await adminDb
            .collection("users")
            .doc(userId)
            .set(
              {
                stripeCustomerId: customerId,
                subscription: {
                  plan: session.metadata?.plan || "pro",
                  status: "active",
                  stripeSessionId: session.id,
                  amount: session.amount_total ? session.amount_total / 100 : 0,
                  currency: session.currency,
                },
                email: userEmail,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          // Also update the subscription collection for easy querying
          await adminDb
            .collection("subscriptions")
            .doc(userId)
            .set({
              userId,
              email: userEmail,
              stripeCustomerId: customerId,
              plan: session.metadata?.plan || "pro",
              status: "active",
              currentPeriodStart: new Date(),
              updatedAt: FieldValue.serverTimestamp(),
            });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log("🔄 Subscription updated:", subscription.status);

        // Lookup user by customerId
        const usersSnapshot = await adminDb
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;
          
          await userDoc.ref.set(
            {
              subscription: {
                plan: subscription.items.data[0].price.nickname || "pro",
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              },
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Update subscription collection
          await adminDb
            .collection("subscriptions")
            .doc(userId)
            .set(
              {
                plan: subscription.items.data[0].price.nickname || "pro",
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
                currentPeriodStart: new Date(subscription.currentPeriodStart * 1000),
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log("❌ Subscription cancelled");

        // Lookup user by customerId
        const usersSnapshot = await adminDb
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;
          
          await userDoc.ref.set(
            {
              subscription: {
                plan: "free",
                status: "cancelled",
                cancelledAt: FieldValue.serverTimestamp(),
              },
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Update subscription collection
          await adminDb
            .collection("subscriptions")
            .doc(userId)
            .set(
              {
                status: "cancelled",
                cancelledAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("💰 Payment succeeded for invoice:", invoice.id);
        // You can add invoice tracking here if needed
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.log("💳 Payment failed for customer:", customerId);
        
        // Update user's subscription status
        const usersSnapshot = await adminDb
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          
          await userDoc.ref.set(
            {
              subscription: {
                status: "past_due",
                paymentFailed: true,
                lastPaymentFailure: FieldValue.serverTimestamp(),
              },
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Error handling Stripe webhook:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
