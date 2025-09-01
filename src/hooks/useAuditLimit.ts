"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function useAuditLimit(defaultLimit: number = 5) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load count and limit from Firestore subscription document
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const usage = data.usage || 0;
          const planLimit = data.limit || defaultLimit;
          const planType = data.plan || 'free';
          
          setCount(usage);
          setLimit(planLimit);
          setHasPaidSubscription(planType !== 'free');
          
          console.log(`🔄 Firestore audit count updated: ${usage}/${planLimit} (${planType} plan)`);
        } else {
          // No subscription document exists, use defaults
          setCount(0);
          setLimit(defaultLimit);
          setHasPaidSubscription(false);
          console.log(`📝 No subscription document found, using defaults: 0/${defaultLimit}`);
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error listening to subscription document:", error);
        // Fallback to defaults on error
        setCount(0);
        setLimit(defaultLimit);
        setHasPaidSubscription(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, defaultLimit]);

  // Increment is now handled by the backend, so this is just for compatibility
  const increment = useCallback(() => {
    // The actual increment happens in the backend when an audit is completed
    // This function exists for backward compatibility
    console.log(`📈 Increment called, but actual update happens in backend`);
    return count + 1;
  }, [count]);

  // Reset function (mainly for testing)
  const reset = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      await fetch('/api/reset-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("🔄 Usage reset via API");
    } catch (error) {
      console.error("❌ Error resetting usage:", error);
    }
  }, [user]);

  // Check if user has a paid subscription
  const hasPaidPlan = useCallback(() => {
    return hasPaidSubscription;
  }, [hasPaidSubscription]);

  const isOverLimit = count >= limit && !hasPaidSubscription;
  const remaining = Math.max(0, limit - count);
  const percentUsed = limit > 0 ? (count / limit) * 100 : 0;

  return {
    count,
    limit,
    remaining,
    percentUsed,
    increment,
    reset,
    isOverLimit,
    canAudit: !isOverLimit,
    hasPaidPlan: hasPaidPlan(),
    loading
  };
}
