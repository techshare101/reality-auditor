import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, enableIndexedDbPersistence } from "firebase/firestore";
import { UsageData } from "@/utils/auditCountHelper";

export function useUsageListener(userId: string | null) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    let unsubscribeUsage: (() => void) | undefined;
    let unsubscribeUser: (() => void) | undefined;
    let mounted = true;

    async function setupListener() {
      if (!userId) {
        setLoading(false);
        setIsProUser(false);
        return;
      }

      try {
        // Enable offline persistence
        await enableIndexedDbPersistence(db).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code === 'unimplemented') {
            console.warn('The current browser doesn\'t support persistence.');
          }
        });

        // Usage listener
        const usageRef = doc(db, "usage", userId);
        if (!mounted) return;

        setLoading(true);
        setError(null);

        unsubscribeUsage = onSnapshot(
          usageRef,
          { includeMetadataChanges: true },
          (snap) => {
            if (!mounted) return;

            if (snap.exists()) {
              setUsage(snap.data() as UsageData);
            } else {
              // Initialize with default values if document doesn't exist
              setUsage({
                audits_used: 0,
                audit_limit: 5,
                plan: "free",
                last_reset: new Date().toISOString()
              });
            }
            setLoading(false);
            setError(null);
          },
          (err) => {
            if (!mounted) return;
            console.error("Error listening to usage:", err);
            setError(err.message);
            setLoading(false);
            setTimeout(() => { if (mounted) setupListener(); }, 5000);
          }
        );

        // User subscription listener (source of truth for Pro)
        const userRef = doc(db, "users", userId);
        unsubscribeUser = onSnapshot(
          userRef,
          { includeMetadataChanges: true },
          (snap) => {
            if (!mounted) return;
            if (snap.exists()) {
              const data: any = snap.data();
              const currentPeriodEnd = data.current_period_end?.toDate?.() || null;
              const isActive = data.isActive || data.isProUser || (data.status === 'active') || (!!currentPeriodEnd && currentPeriodEnd > new Date());
              setIsProUser(isActive && (data.plan === 'pro' || data.plan === 'team'));
            } else {
              setIsProUser(false);
            }
          },
          (err) => {
            console.warn('Subscription status listener error:', err);
            setIsProUser(false);
          }
        );
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to setup usage listener:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        setLoading(false);
      }
    }

    setupListener();

    return () => {
      mounted = false;
      if (unsubscribeUsage) unsubscribeUsage();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [userId]);

  return { usage, loading, error, isProUser };
}
