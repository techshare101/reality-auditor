import Stripe from "stripe";
import { db as adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",  // Latest stable version
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper to update subscription status in both collections
async function updateSubscription(uid: string, data: { 
  plan: "pro" | "free";
  status: string;
  subscriptionId?: string;
  customerId?: string;
  current_period_end?: Date | null;
  updatedAt: Date;
}) {
  console.log(`\n📝 Subscription Update`, {
    uid,
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
  });

  // Write to user_subscriptions collection
  await adminDb
    .collection("user_subscriptions")
    .doc(uid)
    .set(data, { merge: true });

  // Mirror essential fields to users collection
  await adminDb
    .collection("users")
    .doc(uid)
    .set({
      plan: data.plan,
      status: data.status,
      isActive: data.status === "active",
      isProUser: data.plan === "pro",
      stripeCustomerId: data.customerId,
      current_period_end: data.current_period_end,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

  console.log(`✅ Successfully updated subscription status in both collections`);
}

// Handle incoming webhook events
async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Checkout session completed:', session);
      
      const userId = session.metadata?.userId || session.metadata?.uid;

      if (!userId) {
        console.error("❌ No userId in session metadata");
        throw new Error('Missing userId in session metadata');
      }

      await updateSubscription(userId, {
        plan: "pro",
        status: "active",
        subscriptionId: session.subscription as string,
        customerId: session.customer as string,
        current_period_end: session.expires_at
          ? new Date(session.expires_at * 1000)
          : null,
        updatedAt: new Date(),
      });
      console.log(`✅ Updated subscription for user ${userId}`);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log('✅ Subscription updated:', subscription.id);

      const userSnapshot = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        
        await updateSubscription(userId, {
          plan: subscription.status === "active" ? "pro" : "free",
          status: subscription.status,
          subscriptionId: subscription.id,
          customerId: customerId,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          updatedAt: new Date(),
        });
        console.log(`✅ Updated subscription for user ${userId}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log('❌ Subscription deleted:', subscription.id);

      const userSnapshot = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        
        await updateSubscription(userId, {
          plan: "free",
          status: "cancelled",
          subscriptionId: subscription.id,
          customerId: customerId,
          current_period_end: null,
          updatedAt: new Date(),
        });
        console.log(`✅ Updated subscription for user ${userId}`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      console.log('❌ Payment failed for customer:', customerId);
      
      const userSnapshot = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        
        await updateSubscription(userId, {
          plan: "pro", // still pro, but payment failed
          status: "past_due",
          subscriptionId: invoice.subscription as string,
          customerId,
          current_period_end: null,
          updatedAt: new Date(),
        });
        console.log(`✅ Updated subscription status for user ${userId}`);
      }
      break;
    }

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }
}

// Main webhook endpoint handler
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ✅ Acknowledge webhook immediately
  const response = new Response("ok", { status: 200 });

  // 🔄 Process event asynchronously
  handleEvent(event).catch(err => {
    console.error("🔥 Error in async webhook handler:", err);
  });

  return response;
}
