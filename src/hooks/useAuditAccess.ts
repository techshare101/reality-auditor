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
    let mounted = true;

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

    // Watch both subscription docs in Firestore
    const userSubRef = doc(db, "user_subscriptions", user.uid);
    const userRef = doc(db, "users", user.uid);
    
    const unsubscribeUserSub = onSnapshot(
      userSubRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.data();
          const currentPeriodEnd = data.current_period_end?.toDate?.() || null;
          const isActive = !!currentPeriodEnd && currentPeriodEnd > new Date();
          
          // Clear optimistic flag if we have real data
          if (hasJustPaid) {
            localStorage.removeItem("justPaid");
          }

          setSubscription({
            plan: data.plan || "free",
            status: isActive ? "active" : "inactive",
            currentPeriodEnd: currentPeriodEnd,
            isActive,
          });
          setLoading(false);
        } else {
          // If user_subscriptions doesn't exist, check users collection
          const unsubscribeUser = onSnapshot(
            userRef,
            { includeMetadataChanges: true },
            (userSnap) => {
              if (!mounted) return;

              if (userSnap.exists()) {
                const userData = userSnap.data();
                setSubscription({
                  plan: userData.plan || "free",
                  status: userData.status || "inactive",
                  isActive: userData.status === "active",
                });
              } else {
                setSubscription({
                  plan: "free",
                  status: "inactive",
                  isActive: false,
                });
              }
              setLoading(false);
            }
          );
          
          return () => unsubscribeUser();
        }
      }
      },
      (error) => {
        console.error("Error listening to subscription:", error);
        // Keep optimistic state if there's an error and we just paid
        if (!hasJustPaid) {
          setSubscription({
            plan: "free",
            status: "inactive",
            isActive: false,
          });
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      unsubscribeUserSub();
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
