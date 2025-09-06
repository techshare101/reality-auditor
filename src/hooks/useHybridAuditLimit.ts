"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { LocalUsageTracker } from "@/lib/local-usage-tracker";
import { hasPaidPlan as checkHasPaidPlan } from "@/lib/hasPaidPlan";
import { useImmediateProAccess } from "@/hooks/useImmediateProAccess";

export function useHybridAuditLimit(defaultLimit: number = 5) {
  const { user } = useAuth();
  const { hasJustUpgraded } = useImmediateProAccess();
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUsingLocalFallback, setIsUsingLocalFallback] = useState(false);
  
  // HARDCODED PRO EMAILS - These emails ALWAYS get Pro treatment
  const GUARANTEED_PRO_EMAILS = [
    'valentin2v2000@gmail.com',
    // Add more Pro emails here as needed
  ];

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

    // Check Pro status using bulletproof helper
    const checkProStatus = async () => {
      // FIRST: Check if user just upgraded
      if (hasJustUpgraded) {
        console.log(`🚀 IMMEDIATE PRO ACCESS GRANTED - User just upgraded via Stripe!`);
        setHasPaidSubscription(true);
        setLoading(false);
        return;
      }
      
      // SECOND: Check if this is a guaranteed Pro email
      if (user.email && GUARANTEED_PRO_EMAILS.includes(user.email.toLowerCase())) {
        console.log(`✨ GUARANTEED PRO EMAIL DETECTED: ${user.email}`);
        setHasPaidSubscription(true);
        setLoading(false);
        return;
      }
      
      // Otherwise, check normally
      const planStatus = await checkHasPaidPlan(user);
      setHasPaidSubscription(planStatus.isPro);
      console.log(`🎯 Pro status check result:`, planStatus);
    };
    checkProStatus();

    // Then listen to real-time Firestore data
    const unsubscribe = onSnapshot(
      doc(db, "subscriptions", user.uid),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const usage = data.usage || data.auditsUsed || 0;
          const planLimit = data.limit || data.auditsLimit || defaultLimit;
          
          setCount(usage);
          setLimit(planLimit);
          setIsUsingLocalFallback(false);
          
          // Sync local storage with Firestore
          LocalUsageTracker.syncWithFirestore(user.uid, usage);
          
          // Re-check Pro status with bulletproof helper
          // But ALWAYS respect guaranteed Pro emails
          if (user.email && GUARANTEED_PRO_EMAILS.includes(user.email.toLowerCase())) {
            setHasPaidSubscription(true);
          } else {
            const planStatus = await checkHasPaidPlan(user);
            setHasPaidSubscription(planStatus.isPro);
          }
          
          console.log(`🔄 Firestore subscription data:`, {
            isPro: hasPaidSubscription,
            usage: `${usage}/${planLimit}`,
            rawData: data
          });
        } else {
          // No subscription document exists, check if email has Pro
          console.log(`📝 No subscription document found by UID, checking email...`);
          // Check guaranteed Pro emails first
          if (user.email && GUARANTEED_PRO_EMAILS.includes(user.email.toLowerCase())) {
            setHasPaidSubscription(true);
          } else {
            const planStatus = await checkHasPaidPlan(user);
            setHasPaidSubscription(planStatus.isPro);
          }
          
          if (!hasPaidSubscription) {
            setIsUsingLocalFallback(true);
          }
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
    // Include immediate Pro access from recent upgrade
    return hasPaidSubscription || hasJustUpgraded;
  }, [hasPaidSubscription, hasJustUpgraded]);

  // Check both regular Pro status AND immediate upgrade status
  const isEffectivelyPro = hasPaidSubscription || hasJustUpgraded;
  const isOverLimit = count >= limit && !isEffectivelyPro;
  const remaining = isEffectivelyPro ? 999 : Math.max(0, limit - count);
  const percentUsed = isEffectivelyPro ? 0 : (limit > 0 ? (count / limit) * 100 : 0);

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
