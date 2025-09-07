import { db } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripeClient";
import { getFirestore } from "firebase-admin/firestore";

// Helper to get price ID based on plan
function getPriceId(plan: string) {
  return {
    basic: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    team: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID,
  }[plan] || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
}

// Helper to get audit limit based on plan
function getAuditLimit(plan: string) {
  return {
    free: 5,
    basic: 30,
    pro: 100,
    team: 500,
  }[plan] || 5;
}

async function testWebhook() {
  try {
    console.log("🔧 Starting webhook test...\n");

    // Test user ID - change this to a real user ID from your Firestore
    const TEST_USER_ID = "TEST_USER_123";
    const TEST_EMAIL = "test@example.com";

    // Mock checkout.session.completed event
    const mockCheckoutEvent = {
      id: "evt_test_webhook_check",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_webhook",
          customer: "cus_test_webhook",
          subscription: "sub_test_webhook",
          metadata: {
            userId: TEST_USER_ID,
            uid: TEST_USER_ID, // Both formats for compatibility
          },
          customer_details: {
            email: TEST_EMAIL,
          },
          expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        },
      },
    };

    console.log("📝 Mock event data:", JSON.stringify(mockCheckoutEvent, null, 2));

    // Simulating webhook handler logic
    const session = mockCheckoutEvent.data.object;
    const userId = session.metadata?.userId || session.metadata?.uid;

    if (!userId) {
      throw new Error("No userId found in session metadata!");
    }

    // Update Firestore with subscription data
    const batch = getFirestore().batch();
    const now = new Date();
    const periodEnd = new Date(session.expires_at * 1000);

    // 1. Update main subscriptions collection
    const subscriptionRef = getFirestore().collection("subscriptions").doc(userId);
    batch.set(subscriptionRef, {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      plan: "pro",
      status: "active",
      currentPeriodEnd: periodEnd,
      sessionId: session.id,
      email: session.customer_details?.email,
      updatedAt: now,
    }, { merge: true });

    // 2. Update user subscription status
    const userStatusRef = getFirestore().collection("user_subscription_status").doc(userId);
    batch.set(userStatusRef, {
      plan: "pro",
      status: "active",
      isActive: true,
      stripeSubscriptionId: session.subscription,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    }, { merge: true });

    // 3. Update usage record
    const usageRef = getFirestore().collection("usage").doc(userId);
    batch.set(usageRef, {
      plan: "pro",
      audit_limit: getAuditLimit("pro"),
      audits_used: 0,
      updatedAt: now,
    }, { merge: true });

    // 4. Store Stripe customer mapping
    const customerMappingRef = getFirestore().collection("stripe_customers").doc(session.customer);
    batch.set(customerMappingRef, {
      userId,
      email: session.customer_details?.email,
      updatedAt: now,
    });

    // Commit all updates
    await batch.commit();

    console.log("\n✅ Test successful! Updated documents:");
    console.log(`- subscriptions/${userId}`);
    console.log(`- user_subscription_status/${userId}`);
    console.log(`- usage/${userId}`);
    console.log(`- stripe_customers/${session.customer}`);

    // Verify the updates
    const verifyDoc = await getFirestore()
      .collection("user_subscription_status")
      .doc(userId)
      .get();

    console.log("\n📋 Verification - subscription status:", verifyDoc.data());

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  }
}

// Run the test
console.log("🚀 Starting webhook test script...\n");
testWebhook()
  .then(() => {
    console.log("\n✨ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test script failed:", error);
    process.exit(1);
  });
