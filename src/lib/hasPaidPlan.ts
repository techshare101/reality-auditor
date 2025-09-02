import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface User {
  uid: string;
  email?: string | null;
}

interface PlanStatus {
  isPro: boolean;
  plan: string;
  status: string;
  source?: 'uid' | 'email' | 'default';
}

/**
 * Bulletproof helper to check if a user has a Pro plan
 * Checks both by UID and email, auto-migrates email-based to UID-based
 */
export async function hasPaidPlan(user: User | null): Promise<PlanStatus> {
  if (!user) {
    return { isPro: false, plan: "free", status: "inactive", source: 'default' };
  }

  let plan = "free";
  let status = "inactive";
  let source: 'uid' | 'email' | 'default' = 'default';

  try {
    // --- 1. Check by UID (preferred key)
    console.log(`🔍 Checking subscription for UID: ${user.uid}`);
    const uidRef = doc(db, "subscriptions", user.uid);
    const uidSnap = await getDoc(uidRef);

    if (uidSnap.exists()) {
      const data = uidSnap.data();
      plan = data.plan || data.planType || "free";
      status = data.status || "inactive";
      source = 'uid';
      console.log(`✅ Found subscription by UID: plan=${plan}, status=${status}`);
    }

    // --- 2. If UID not Pro, try Email fallback
    if ((plan === "free" || status !== "active") && user.email) {
      console.log(`🔍 Checking subscription for email: ${user.email}`);
      const emailRef = doc(db, "subscriptions", user.email);
      const emailSnap = await getDoc(emailRef);

      if (emailSnap.exists()) {
        const emailData = emailSnap.data();
        const emailPlan = emailData.plan || emailData.planType || "free";
        const emailStatus = emailData.status || "inactive";
        
        console.log(`✅ Found subscription by email: plan=${emailPlan}, status=${emailStatus}`);

        // If email has Pro but UID doesn't, use email data
        if (emailPlan === "pro" && emailStatus === "active") {
          plan = emailPlan;
          status = emailStatus;
          source = 'email';

          // --- 3. Auto-migrate email record → UID record
          console.log(`🔄 Migrating Pro subscription from email to UID...`);
          await setDoc(
            uidRef,
            {
              // Copy all data from email doc first
              ...emailData,
              // Then override with correct values
              plan: emailPlan,
              planType: emailPlan, // Support both field names
              status: emailStatus,
              migratedFrom: user.email,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          console.log(`✅ Migration complete! Pro status now linked to UID`);
        }
      }
    }

    const isPro = (plan === "pro" || plan === "basic") && status === "active";
    
    console.log(`🎯 Final result: isPro=${isPro}, plan=${plan}, status=${status}, source=${source}`);
    
    return { isPro, plan, status, source };

  } catch (error) {
    console.error("❌ Error checking paid plan:", error);
    return { isPro: false, plan: "free", status: "error", source: 'default' };
  }
}

/**
 * Force sync subscription status between email and UID
 * Use this after Stripe webhook to ensure both are in sync
 */
export async function syncSubscriptionStatus(
  userId: string,
  userEmail: string | null | undefined,
  planData: {
    plan: string;
    status: string;
    [key: string]: any;
  }
) {
  const updates = {
    ...planData,
    planType: planData.plan, // Support both field names
    updatedAt: serverTimestamp(),
  };

  // Always update by UID
  const uidRef = doc(db, "subscriptions", userId);
  await setDoc(uidRef, updates, { merge: true });
  console.log(`✅ Updated subscription for UID: ${userId}`);

  // Also update by email if available
  if (userEmail) {
    const emailRef = doc(db, "subscriptions", userEmail);
    await setDoc(emailRef, updates, { merge: true });
    console.log(`✅ Updated subscription for email: ${userEmail}`);
  }
}
