"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { LocalUsageTracker } from "@/lib/local-usage-tracker";

export function useHybridAuditLimit(defaultLimit: number = 5) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUsingLocalFallback, setIsUsingLocalFallback] = useState(false);

  // Initialize with local storage data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Get local usage immediately
    const localUsage = LocalUsageTracker.getUsage(user.uid);
    setCount(localUsage.auditsUsed);
    setLimit(defaultLimit);
    setIsUsingLocalFallback(true);
    console.log(`📊 Initial local usage for ${user.uid}: ${localUsage.auditsUsed}/${defaultLimit}`);

    // Then try to get Firestore data
    const unsubscribe = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const usage = data.usage || data.auditsUsed || 0;
          const planLimit = data.limit || data.auditsLimit || defaultLimit;
          const planType = data.plan || data.planType || 'free';
          const status = data.status || 'free';
          
          // Check if user has Pro plan - both planType and status should indicate Pro
          const isPro = (planType === 'pro' || planType === 'basic') && status === 'active';
          
          setCount(usage);
          setLimit(planLimit);
          setHasPaidSubscription(isPro);
          setIsUsingLocalFallback(false);
          
          // Sync local storage with Firestore
          LocalUsageTracker.syncWithFirestore(user.uid, usage);
          
          console.log(`🔄 Firestore subscription data:`, {
            planType,
            status,
            isPro,
            usage: `${usage}/${planLimit}`,
            rawData: data
          });
        } else {
          // No subscription document exists, keep using local storage
          console.log(`📝 No subscription document found, using local storage`);
          setIsUsingLocalFallback(true);
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error listening to subscription document:", error);
        // Keep using local storage on error
        setIsUsingLocalFallback(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, defaultLimit]);

  // Listen for audit completion events
  useEffect(() => {
    if (!user) return;

    const handleAuditCompleted = () => {
      console.log("🎯 Audit completed event detected");
      
      if (isUsingLocalFallback) {
        // Refresh from local storage
        const localUsage = LocalUsageTracker.getUsage(user.uid);
        setCount(localUsage.auditsUsed);
        console.log(`📊 Refreshed local usage: ${localUsage.auditsUsed}/${limit}`);
      }
      // If using Firestore, the real-time listener will handle updates
    };

    window.addEventListener('audit-completed', handleAuditCompleted as any);
    return () => window.removeEventListener('audit-completed', handleAuditCompleted as any);
  }, [user, isUsingLocalFallback, limit]);

  // Increment function for compatibility
  const increment = useCallback(() => {
    if (!user) return count;
    
    if (isUsingLocalFallback) {
      const result = LocalUsageTracker.incrementUsage(user.uid);
      if (result.success) {
        setCount(result.auditsUsed);
        console.log(`📈 Local usage incremented: ${result.auditsUsed}/${limit}`);
      }
      return result.auditsUsed;
    }
    
    // For Firestore, increment happens in backend
    console.log(`📈 Increment called, but actual update happens in backend`);
    return count + 1;
  }, [count, user, isUsingLocalFallback, limit]);

  // Reset function (mainly for testing)
  const reset = useCallback(async () => {
    if (!user) return;
    
    if (isUsingLocalFallback) {
      LocalUsageTracker.resetUsage(user.uid);
      setCount(0);
      console.log("🔄 Local usage reset");
      return;
    }
    
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
  }, [user, isUsingLocalFallback]);

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
    loading,
    isUsingLocalFallback
  };
}
