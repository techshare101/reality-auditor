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

function debugLog(message: string, data?: any) {
  console.log(
    `%c🔄 [Subscription Debug] %c${message}`,
    "color: #0ea5e9; font-weight: bold;",
    "color: inherit",
    data ? data : ""
  );
}

export function useAuditAccess(auditsCount: number = 0) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    debugLog(`Hook initialized. User: ${user?.uid || "no user"}`);

    if (!user?.uid) {
      debugLog("No user, resetting subscription state");
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Check for optimistic update first
    const hasJustPaid = localStorage.getItem("justPaid") === "true";
    if (hasJustPaid) {
      debugLog("Found optimistic update flag (justPaid). Setting temporary Pro status.");
      setSubscription({
        plan: "pro",
        status: "active",
        isActive: true,
      });
      setLoading(false);
    }

    const userRef = doc(db, "users", user.uid);
    debugLog(`Starting subscription listener for user ${user.uid}`);
    
    const unsub = onSnapshot(userRef, {
      next: (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const currentPeriodEnd = userData.current_period_end?.toDate?.() || null;
          
          debugLog("Received Firestore update", {
            plan: userData.plan,
            status: userData.status,
            isProUser: userData.isProUser,
            isActive: userData.isActive,
            currentPeriodEnd
          });
          
          // Clear optimistic flag if we have real data
          if (hasJustPaid) {
            debugLog("Clearing optimistic update flag");
            localStorage.removeItem("justPaid");
          }

          // Determine active status using multiple indicators
          const isActive = userData.isActive || 
            userData.isProUser || 
            (userData.status === "active") || 
            (!!currentPeriodEnd && currentPeriodEnd > new Date());

          debugLog(`Computed active status: ${isActive}`, {
            fromIsActive: userData.isActive,
            fromIsProUser: userData.isProUser,
            fromStatus: userData.status === "active",
            fromPeriodEnd: !!currentPeriodEnd && currentPeriodEnd > new Date()
          });

          setSubscription({
            plan: userData.plan || "free",
            status: isActive ? "active" : "inactive",
            currentPeriodEnd,
            isActive,
          });
        } else {
          debugLog("No subscription document found, setting free tier defaults");
          setSubscription({
            plan: "free",
            status: "inactive",
            isActive: false,
          });
        }
        setLoading(false);
      },
      error: (error) => {
        console.error("❌ Error listening to subscription:", error);
        debugLog("Subscription listener error, maintaining optimistic state if just paid");
        if (!hasJustPaid) {
          setSubscription({
            plan: "free",
            status: "inactive",
            isActive: false,
          });
        }
        setLoading(false);
      }
    }
    );

    return () => {
      debugLog("Cleaning up subscription listener");
      unsub();
    };
  }, [user?.uid]);

  // Compute audit access status
  const isPro = subscription?.isActive && ["pro", "team"].includes(subscription?.plan || "");
  const isTeam = subscription?.isActive && subscription?.plan === "team";
  const planLimit = isTeam ? 500 : isPro ? 100 : 5;
  const canAudit = isPro || auditsCount < planLimit;
  const needsPaywall = !isPro && auditsCount >= planLimit;
  const remainingAudits = Math.max(0, planLimit - auditsCount);
  const percentageUsed = Math.min(100, (auditsCount / planLimit) * 100);

  // Debug log state changes
  useEffect(() => {
    debugLog("Subscription state updated", {
      subscription,
      isPro,
      isTeam,
      planLimit,
      canAudit,
      needsPaywall,
      remainingAudits,
      percentageUsed
    });
  }, [subscription, isPro, isTeam, planLimit, canAudit, needsPaywall, remainingAudits, percentageUsed]);

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
