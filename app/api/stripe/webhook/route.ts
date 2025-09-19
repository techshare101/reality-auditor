import Stripe from "stripe";
import { db as adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateSubscription(uid: string, data: any) {
  try {
    console.log("📝 Updating subscription for", uid, data);

    await adminDb.collection("user_subscriptions").doc(uid).set(data, { merge: true });
    await adminDb.collection("users").doc(uid).set({
      ...data,
      isActive: data.status === "active",
      isProUser: data.plan === "pro",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("✅ Subscription updated in Firestore");
  } catch (err) {
    console.error("🔥 Firestore update failed:", err);
  }
}

async function handleEvent(event: Stripe.Event) {
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.metadata?.uid;
        if (!userId) throw new Error("Missing userId in session metadata");

        await updateSubscription(userId, {
          plan: "pro",
          status: "active",
          subscriptionId: session.subscription as string,
          customerId: session.customer as string,
          current_period_end: session.expires_at ? new Date(session.expires_at * 1000) : null,
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

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
            customerId,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

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
            customerId,
          });
        }
        break;
      }

      default:
        console.log("⚠️ Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("🔥 handleEvent failed:", err);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    await handleEvent(event); // ✅ await so errors are caught
    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
