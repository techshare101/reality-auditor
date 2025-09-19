"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditAccess } from "@/hooks/useAuditAccess";
import { Sparkles } from "lucide-react";

export interface AuditBannerProps {
  used: number;
}

export function AuditBanner({ used }: AuditBannerProps) {
  const { user } = useAuth();
  const { subscription, isPro } = useAuditAccess();
  const plan = subscription?.plan;
  const isProUser = !!isPro;
  const [renewalDate, setRenewalDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(
      doc(db, "user_subscriptions", user.uid),
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.current_period_end) {
            const date = data.current_period_end.toDate?.();
            if (date) {
              setRenewalDate(
                date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              );
            }
          }
        }
      },
      (error) => {
        console.warn("Subscription renewal date listener error:", error);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  if (isProUser) {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500 text-green-400 px-4 py-2 font-bold shadow-md flex items-center gap-2 animate-pulse">
        <Sparkles className="w-5 h-5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>Unlimited Audits Active</span>
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
              {plan?.toUpperCase() || "PRO"}
            </span>
          </div>
          {renewalDate && (
            <div className="text-xs text-green-300 mt-0.5">
              Renews on {renewalDate}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500 text-amber-400 px-4 py-3 font-medium shadow-md">
      Free Audits Used: {used}/5
    </div>
  );
}

export default AuditBanner;
