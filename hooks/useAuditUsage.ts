import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useProStatus } from "@/hooks/useProStatus";

interface AuditUsageInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isNearLimit: boolean;
  displayText: string;
  lastReset?: Date;
}

export function useAuditUsage() {
  const { user } = useAuth();
  const proStatus = useProStatus(user?.uid);
  const [usage, setUsage] = useState<AuditUsageInfo>({
    used: 0,
    limit: 5,
    remaining: 5,
    percentage: 0,
    isNearLimit: false,
    displayText: "Loading...",
  });

  useEffect(() => {
    if (!user?.uid) {
      setUsage({
        used: 0,
        limit: 5,
        remaining: 5,
        percentage: 0,
        isNearLimit: false,
        displayText: "Sign in to track usage",
      });
      return;
    }

    // Pro users have unlimited audits
    if (proStatus === "pro") {
      setUsage({
        used: 0,
        limit: 999999,
        remaining: 999999,
        percentage: 0,
        isNearLimit: false,
        displayText: "Unlimited audits",
      });
      return;
    }

    // For free users, listen to usage collection
    const unsub = onSnapshot(
      doc(db, "usage", user.uid),
      (snap) => {
        const data = snap.data();
        const used = data?.audits_used || 0;
        const limit = 5;
        const remaining = Math.max(0, limit - used);
        const percentage = (used / limit) * 100;
        const isNearLimit = remaining <= 1;
        
        // Format last reset date
        const lastReset = data?.last_reset?.toDate?.() || 
                         (data?.last_reset ? new Date(data.last_reset) : undefined);

        setUsage({
          used,
          limit,
          remaining,
          percentage,
          isNearLimit,
          displayText: `${used} / ${limit} audits used`,
          lastReset,
        });
      },
      (error) => {
        console.error("Error fetching usage:", error);
        setUsage({
          used: 0,
          limit: 5,
          remaining: 5,
          percentage: 0,
          isNearLimit: false,
          displayText: "Error loading usage",
        });
      }
    );

    return () => unsub();
  }, [user?.uid, proStatus]);

  return usage;
}