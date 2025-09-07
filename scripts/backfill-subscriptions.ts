import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin with service account
const serviceAccount = require('./service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const adminDb = getFirestore();
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",  // Latest stable version
});

async function updateSubscriptionStatus(
  userId: string,
  data: {
    plan: "pro" | "free";
    status: string;
    subscriptionId?: string;
    customerId?: string;
    current_period_end?: Date | null;
    email?: string;
  },
  dryRun: boolean
) {
  console.log(`🔄 ${dryRun ? "[DRY RUN] " : ""}Updating subscription for user ${userId}:`, data);

  if (dryRun) return;

  const now = new Date();
  const baseUpdate = {
    plan: data.plan,
    status: data.status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Update user doc
  await adminDb
    .collection("users")
    .doc(userId)
    .set(
      {
        subscription: {
          ...baseUpdate,
          subscriptionId: data.subscriptionId,
          customerId: data.customerId,
          current_period_end: data.current_period_end,
        },
        email: data.email,
      },
      { merge: true }
    );

  // Update subscriptions collection
  await adminDb
    .collection("subscriptions")
    .doc(userId)
    .set(
      {
        ...baseUpdate,
        userId,
        email: data.email,
        subscriptionId: data.subscriptionId,
        current_period_end: data.current_period_end,
        current_period_start: now,
      },
      { merge: true }
    );

  console.log(`✅ Successfully updated subscription status for ${userId}`);
}

async function backfillSubscriptions(dryRun: boolean = true) {
  console.log(`🚀 Starting subscription backfill ${dryRun ? "(DRY RUN)" : ""}`);
  
  try {
    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      expand: ["data.customer"],
    });

    console.log(`Found ${subscriptions.data.length} active subscriptions in Stripe`);

    for (const subscription of subscriptions.data) {
      const customer = subscription.customer as Stripe.Customer;
      const customerEmail = customer.email;
      
      if (!customerEmail) {
        console.warn(`⚠️ No email found for customer ${customer.id}`);
        continue;
      }

      console.log(`📧 Looking up user by email: ${customerEmail}`);

      // Look up user in Firestore by email
      const usersSnapshot = await adminDb
        .collection("users")
        .where("email", "==", customerEmail)
        .limit(1)
        .get();

      let userId: string;
      
      if (usersSnapshot.empty) {
        console.log(`📝 Creating new user for ${customerEmail}`);
        
        // Create a new user document
        const userRef = adminDb.collection("users").doc();
        userId = userRef.id;
        
        await userRef.set({
          email: customerEmail,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ Created new user ${userId}`);
      } else {
        const userDoc = usersSnapshot.docs[0];
        userId = userDoc.id;
        console.log(`✅ Found existing user ${userId}`);
      }
      
      console.log(`✅ Found user ${userId} with email ${customerEmail}`);

      const sub: any = subscription as any;
      await updateSubscriptionStatus(
        userId,
        {
          plan: "pro",
          status: "active",
          subscriptionId: sub.id,
          customerId: (subscription.customer as any)?.id || (subscription.customer as string) || customer.id,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          email: (customer as any).email || undefined,
        },
        dryRun
      );
    }

    console.log(`✅ Backfill complete! Processed ${subscriptions.data.length} subscriptions`);
  } catch (error) {
    console.error("❌ Error during backfill:", error);
    process.exit(1);
  }
}

// Check if --execute flag is passed
const execute = process.argv.includes("--execute");

if (execute) {
  console.log("⚡ Running backfill in LIVE mode");
  backfillSubscriptions(false);
} else {
  console.log("🔍 Running backfill in DRY RUN mode");
  console.log("To execute for real, run with --execute flag");
  backfillSubscriptions(true);
}
