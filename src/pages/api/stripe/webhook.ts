import { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
import { db as adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Disable body parsing, we need raw body for Stripe
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).json({ error: "No signature provided" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    return res.status(400).json({
      error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`
    });
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
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
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
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
                cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
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

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("🔥 Error handling Stripe webhook:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
