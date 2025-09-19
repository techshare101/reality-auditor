"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface UnifiedAuditAccess {
  isProUser: boolean;
  plan: string;
  used: number;
  canAudit: boolean;
  showPaywall: boolean;
  renewalDate: string | null;
  loading: boolean;
  error: string | null;
}

export function useUnifiedAuditAccess(): UnifiedAuditAccess {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UnifiedAuditAccess>({
    isProUser: false,
    plan: "free",
    used: 0,
    canAudit: true,
    showPaywall: false,
    renewalDate: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!user?.uid) {
      setData(prev => ({ ...prev, loading: false, error: null }));
      setLoading(false);
      return;
    }

    console.log(`🔍 Setting up unified access listener for ${user.uid}`);
    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        const currentPeriodEnd = userData.current_period_end?.toDate?.() || null;

        const isActive = userData.isActive || 
          userData.isProUser || 
          (userData.status === "active") || 
          (!!currentPeriodEnd && currentPeriodEnd > new Date());

        const isProUser = isActive && (userData.plan === "pro" || userData.plan === "team");
        const used = userData.audits_used || 0;
        const canAudit = isProUser || used < 5;
        const showPaywall = !isProUser && used >= 5;

        let renewalDate = null;
        if (currentPeriodEnd) {
          renewalDate = currentPeriodEnd.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric"
          });
        }

        setData({
          isProUser,
          plan: userData.plan || "free",
          used,
          canAudit,
          showPaywall,
          renewalDate,
          loading: false,
          error: null
        });

        console.log(`✅ Access updated:`, { isProUser, plan: userData.plan, used, canAudit });
      } else {
        setData({
          isProUser: false,
          plan: "free",
          used: 0,
          canAudit: true,
          showPaywall: false,
          renewalDate: null,
          loading: false,
          error: null
        });
      }
      setLoading(false);
    }, error => {
      console.error("Failed to fetch user status:", error);
      setData({
        isProUser: false,
        plan: "free",
        used: 0,
        canAudit: true,
        showPaywall: false,
        renewalDate: null,
        loading: false,
        error: (error as any)?.message || 'Permission denied or network error'
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return {
    ...data,
    loading
  };
}
