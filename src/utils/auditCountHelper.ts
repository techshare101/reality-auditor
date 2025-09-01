import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore";

export interface UsageData {
  audits_used: number;
  audit_limit: number;
  plan: string;
  last_reset?: string;
}

export async function checkAndIncrementUsage(userId: string) {
  const ref = doc(db, "usage", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Create initial usage record for new users
    const initialData: UsageData = {
      audits_used: 0,
      audit_limit: 5, // Free plan default
      plan: "free",
      last_reset: new Date().toISOString()
    };
    await setDoc(ref, initialData);
    
    // Increment and return
    await updateDoc(ref, {
      audits_used: increment(1)
    });
    
    return {
      allowed: true,
      remaining: 4, // 5 - 1
      auditsUsed: 1,
      auditsLimit: 5
    };
  }

  const data = snap.data() as UsageData;
  const auditsUsed = data.audits_used || 0;
  const auditLimit = data.audit_limit || 5;

  // Check if limit reached
  if (auditsUsed >= auditLimit) {
    return { 
      allowed: false, 
      remaining: 0,
      auditsUsed,
      auditsLimit: auditLimit,
      plan: data.plan
    };
  }

  // Increment usage
  await updateDoc(ref, {
    audits_used: increment(1)
  });

  return {
    allowed: true,
    remaining: auditLimit - (auditsUsed + 1),
    auditsUsed: auditsUsed + 1,
    auditsLimit: auditLimit,
    plan: data.plan
  };
}

// Reset usage (for billing cycle resets)
export async function resetUsage(userId: string) {
  const ref = doc(db, "usage", userId);
  await updateDoc(ref, {
    audits_used: 0,
    last_reset: new Date().toISOString()
  });
}

// Update audit limit (after subscription change)
export async function updateAuditLimit(userId: string, newLimit: number, plan: string) {
  const ref = doc(db, "usage", userId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    // Create new record
    await setDoc(ref, {
      audits_used: 0,
      audit_limit: newLimit,
      plan: plan,
      last_reset: new Date().toISOString()
    });
  } else {
    // Update existing
    await updateDoc(ref, {
      audit_limit: newLimit,
      plan: plan
    });
  }
}
