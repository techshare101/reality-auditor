import Stripe from "stripe";
import { db as adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",  // Latest stable version
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Enhanced debug logging helper
function logWebhookEvent(event: Stripe.Event) {
  console.log(`\n🎯 Webhook Event: ${event.type}`);
  console.log(`🔑 Event ID: ${event.id}`);
  if (event.data?.object) {
    console.log(`📦 Object ID: ${(event.data.object as any).id}`);
    console.log(`📋 Metadata:`, (event.data.object as any).metadata);
  }
}

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
    isActive: data.status === "active",
    isProUser: data.plan === "pro",
    currentPeriodEnd: data.current_period_end,
  });
  console.log(`🔄 Updating subscription for user ${uid}:`, data);

  // Write to user_subscriptions collection
  await adminDb
    .collection("user_subscriptions")
    .doc(uid)
    .set(data, { merge: true });

  // Mirror essential fields to users collection
    // Mirror essential fields to users collection with additional fields
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

// Handle events asynchronously
async function handleEvent(event: Stripe.Event) {
  logWebhookEvent(event);

  switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userEmail = session.customer_email;
        const userId = session.metadata?.userId || session.metadata?.uid;

        console.log(`\n💫 Processing checkout.session.completed`);
        console.log(`📧 Customer email: ${userEmail}`);
        console.log(`👤 User ID: ${userId}`);
        console.log(`💳 Customer ID: ${customerId}`);
        console.log(`🔄 Subscription ID: ${session.subscription}`);

        if (!userId) {
          console.error("❌ No userId found in session metadata");
          return NextResponse.json({ error: "No user ID in metadata" }, { status: 400 });
        }

          console.log(`\n🔄 Updating Firestore for user ${userId}...`);
          await updateSubscription(userId, {
            plan: "pro",
            status: "active",
            subscriptionId: session.subscription as string,
            customerId: customerId,
            current_period_end: session.expires_at ? new Date(session.expires_at * 1000) : null,
            updatedAt: new Date(),
          });
          console.log(`✅ Firestore update complete!`);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as any;  // Type as any for now since Stripe types are incomplete
        const customerId = subscription.customer as string;

        console.log("🔄 Subscription updated:", subscription.status);
        console.log("📅 Current period end:", new Date(subscription.current_period_end * 1000));

        // Lookup user by customerId
        const usersSnapshot = await adminDb
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;
          
          await updateSubscription(userId, {
            plan: subscription.status === "active" ? "pro" : "free",
            status: subscription.status,
            subscriptionId: subscription.id,
            customerId: customerId,
            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            updatedAt: new Date(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;  // Type as any for Stripe types compatibility
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
          
          await updateSubscription(userId, {
            plan: "free",
            status: "cancelled",
            subscriptionId: subscription.id,
            customerId: customerId,
            current_period_end: null,
            updatedAt: new Date(),
          });
        }
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
          
          const inv: any = invoice as any;
          await updateSubscription(userDoc.id, {
            plan: "pro",  // Keep them on pro but mark as past_due
            status: "past_due",
            subscriptionId: inv.subscription ?? undefined,
            customerId: customerId,
            current_period_end: null,
            updatedAt: new Date(),
          });
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

  } catch (err) {
    console.error("🔥 Error handling Stripe webhook:", err);
    throw err; // Re-throw to be caught by the outer handler
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
    console.log('🔐 Attempting signature verification...');
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Signature verified!');
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ✅ Acknowledge webhook immediately
  const response = new Response("ok", { status: 200 });

  // 🔄 Process the event asynchronously
  handleEvent(event).catch(err => {
    console.error("🔥 Error in async webhook handler:", err);
  });

  return response;
}
