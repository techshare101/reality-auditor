"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { useSubscriptionStatus } from './useSubscriptionStatus';
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

type AuditStats = {
  count: number;
  limit: number;
  remaining: number;
  percentUsed: number;
};

export function useSubscriptionWithAudits() {
  const [user, setUser] = useState<User | null>(null);
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

  // Use the new subscription hook
  const { subscription, isPro, planLimit, loading: subLoading } = useSubscriptionStatus(user?.uid || null);

  // Count audits for this month
  useEffect(() => {
    let mounted = true;
    if (!user) return;

    const countAudits = async () => {
      try {
        if (isPro) {
          if (!mounted) return;
          setAuditStats({ 
            count: 0, 
            limit: planLimit, 
            remaining: planLimit, 
            percentUsed: 0 
          });
          setLoading(false);
          return;
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const auditsQuery = query(
          collection(db, 'audits'),
          where('userId', '==', currentUser.uid),
          where('createdAt', '>=', Timestamp.fromDate(monthStart))
        );
        
        const snapshot = await getDocs(auditsQuery);
        const count = snapshot.size;
        const limit = 5; // Free tier limit
        
        if (!mounted) return;
        setAuditStats({
          count,
          limit,
          remaining: Math.max(0, limit - count),
          percentUsed: (count / limit) * 100
        });
      } catch (error) {
        console.error('Error counting audits:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Initial count
    countAudits();

    return () => {
      mounted = false;
    };
  }, [user, isPro, planLimit]);

  // Re-export subscription status
  const canAudit = isPro || auditStats.remaining > 0;
  const isOverLimit = !isPro && auditStats.count >= planLimit;

  // Loading state combines subscription and audit loading
  const isLoading = loading || subLoading;

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
    
    setAuditStats({
      count,
      limit: planLimit,
      remaining: Math.max(0, planLimit - count),
      percentUsed: (count / planLimit) * 100
    });
  }, [user, isPro, planLimit]);

  return {
    user,
    subscription,
    loading: isLoading,
    isPro,
    canAudit,
    isOverLimit,
    auditStats,
    refreshAuditCount
  };
}
