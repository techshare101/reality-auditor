"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionStatus = {
  plan: string;
  status: string;
  currentPeriodEnd?: Date;
  isActive?: boolean;
};

export function useAuditAccess(auditsCount: number = 0) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Check for optimistic update first
    const hasJustPaid = localStorage.getItem("justPaid") === "true";
    if (hasJustPaid) {
      setSubscription({
        plan: "pro",
        status: "active",
        isActive: true,
      });
      setLoading(false);
    }

    const userRef = doc(db, "users", user.uid);
    
    const unsub = onSnapshot(
      userRef,
      {
        next: (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const currentPeriodEnd = userData.current_period_end?.toDate?.() || null;
            
            // Clear optimistic flag if we have real data
            if (hasJustPaid) {
              localStorage.removeItem("justPaid");
            }

            // Determine active status using multiple indicators
            const isActive = userData.isActive || 
              userData.isProUser || 
              (userData.status === "active") || 
              (!!currentPeriodEnd && currentPeriodEnd > new Date());

            setSubscription({
              plan: userData.plan || "free",
              status: isActive ? "active" : "inactive",
              currentPeriodEnd,
              isActive,
            });
          } else {
            setSubscription({
              plan: "free",
              status: "inactive",
              isActive: false,
            });
          }
          setLoading(false);
        },
        error: (error) => {
          console.error("Error listening to subscription:", error);
          if (!hasJustPaid) {
            setSubscription({
              plan: "free",
              status: "inactive",
              isActive: false,
            });
          }
          setLoading(false);
        },
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Compute audit access status
  const isPro = subscription?.isActive && ["pro", "team"].includes(subscription?.plan || "");
  const isTeam = subscription?.isActive && subscription?.plan === "team";
  const planLimit = isTeam ? 500 : isPro ? 100 : 5;
  const canAudit = isPro || auditsCount < planLimit;
  const needsPaywall = !isPro && auditsCount >= planLimit;
  const remainingAudits = Math.max(0, planLimit - auditsCount);
  const percentageUsed = Math.min(100, (auditsCount / planLimit) * 100);

  return {
    subscription,
    isPro,
    isTeam,
    planLimit,
    canAudit,
    needsPaywall,
    remainingAudits,
    percentageUsed,
    loading,
  };
}
