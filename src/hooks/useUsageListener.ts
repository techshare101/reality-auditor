import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, enableIndexedDbPersistence } from "firebase/firestore";
import { UsageData } from "@/utils/auditCountHelper";

export function useUsageListener(userId: string | null) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function setupListener() {
      if (!userId) {
        setLoading(false);
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

        const ref = doc(db, "usage", userId);
        if (!mounted) return;

        setLoading(true);
        setError(null);

        unsubscribe = onSnapshot(
          ref,
          {
            includeMetadataChanges: true,
          },
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
            
            // Attempt to recover by retrying in 5 seconds
            setTimeout(() => {
              if (mounted) {
                setupListener();
              }
            }, 5000);
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
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  return { usage, loading, error };
}
