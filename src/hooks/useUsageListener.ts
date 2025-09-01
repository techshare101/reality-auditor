import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { UsageData } from "@/utils/auditCountHelper";

export function useUsageListener(userId: string | null) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const ref = doc(db, "usage", userId);
    setLoading(true);

    const unsub = onSnapshot(
      ref, 
      (snap) => {
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
        console.error("Error listening to usage:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { usage, loading, error };
}
