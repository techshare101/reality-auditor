"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

type SubscriptionStatus = {
  plan: string;
  status: string;
  stripeCustomerId?: string;
  updatedAt: Date | null;
};

type AuditStats = {
  count: number;
  limit: number;
  remaining: number;
  percentUsed: number;
};

export function useSubscriptionWithAudits() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStats>({
    count: 0,
    limit: 5,
    remaining: 5,
    percentUsed: 0
  });
  const [loading, setLoading] = useState(true);

  // Listen to auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setSubscription(null);
        setAuditStats({
          count: 0,
          limit: 5,
          remaining: 5,
          percentUsed: 0
        });
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Listen to subscription and count audits
  useEffect(() => {
    if (!user) return;

    // Listen to subscription status
    const subRef = doc(db, "user_subscription_status", user.uid);
    const unsubSub = onSnapshot(
      subRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSubscription({
            plan: data.plan || 'free',
            status: data.status || 'inactive',
            stripeCustomerId: data.stripeCustomerId,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
          });
        } else {
          setSubscription({
            plan: 'free',
            status: 'inactive',
            updatedAt: null,
          });
        }
      }
    );

    // Count audits for this month (if free user)
    const countAudits = async () => {
      if (subscription?.plan === 'pro' && subscription?.status === 'active') {
        setAuditStats({
          count: 0,
          limit: Infinity,
          remaining: Infinity,
          percentUsed: 0
        });
        setLoading(false);
        return;
      }

      try {
        // Get current month start
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Query audits for current month
        const auditsQuery = query(
          collection(db, 'audits'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', Timestamp.fromDate(monthStart))
        );
        
        const snapshot = await getDocs(auditsQuery);
        const count = snapshot.size;
        const limit = 5; // Free tier limit
        
        setAuditStats({
          count,
          limit,
          remaining: Math.max(0, limit - count),
          percentUsed: (count / limit) * 100
        });
      } catch (error) {
        console.error('Error counting audits:', error);
      }
      
      setLoading(false);
    };

    countAudits();

    return () => unsubSub();
  }, [user, subscription]);

  const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';
  const canAudit = isPro || auditStats.remaining > 0;
  const isOverLimit = !isPro && auditStats.count >= auditStats.limit;

  // Refresh audit count
  const refreshAuditCount = useCallback(async () => {
    if (!user || isPro) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const auditsQuery = query(
      collection(db, 'audits'),
      where('userId', '==', user.uid),
      where('createdAt', '>=', Timestamp.fromDate(monthStart))
    );
    
    const snapshot = await getDocs(auditsQuery);
    const count = snapshot.size;
    
    setAuditStats(prev => ({
      ...prev,
      count,
      remaining: Math.max(0, prev.limit - count),
      percentUsed: (count / prev.limit) * 100
    }));
  }, [user, isPro]);

  return {
    user,
    subscription,
    loading,
    isPro,
    canAudit,
    isOverLimit,
    auditStats,
    refreshAuditCount
  };
}
