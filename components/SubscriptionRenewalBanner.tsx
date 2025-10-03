"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProStatus } from "@/hooks/useProStatus";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function SubscriptionRenewalBanner() {
  const { user } = useAuth();
  const proStatus = useProStatus(user?.uid);
  const [renewalInfo, setRenewalInfo] = useState<{
    currentPeriodEnd?: Date;
    lastReset?: Date;
    daysUntilRenewal?: number;
    isRenewedThisMonth?: boolean;
  }>({});

  useEffect(() => {
    if (!user?.uid || proStatus !== "pro") return;

    // Listen to both profiles and usage collections for renewal info
    const profileUnsub = onSnapshot(
      doc(db, "profiles", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const periodEnd = data.current_period_end?.toDate?.() || 
                           (data.current_period_end ? new Date(data.current_period_end) : null);
          
          if (periodEnd) {
            const now = new Date();
            const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            setRenewalInfo(prev => ({
              ...prev,
              currentPeriodEnd: periodEnd,
              daysUntilRenewal: daysLeft
            }));
          }
        }
      }
    );

    const usageUnsub = onSnapshot(
      doc(db, "usage", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const lastReset = data.last_reset?.toDate?.() || 
                           (data.last_reset ? new Date(data.last_reset) : null);
          
          if (lastReset) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const resetMonth = lastReset.getMonth();
            const isRenewedThisMonth = currentMonth === resetMonth && 
                                      now.getFullYear() === lastReset.getFullYear();
            
            setRenewalInfo(prev => ({
              ...prev,
              lastReset,
              isRenewedThisMonth
            }));
          }
        }
      }
    );

    return () => {
      profileUnsub();
      usageUnsub();
    };
  }, [user?.uid, proStatus]);

  if (proStatus !== "pro" || !renewalInfo.currentPeriodEnd) {
    return null;
  }

  const { currentPeriodEnd, lastReset, daysUntilRenewal, isRenewedThisMonth } = renewalInfo;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            {isRenewedThisMonth ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Calendar className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-white">
              {isRenewedThisMonth ? "Recently Renewed!" : "Pro Subscription Active"}
            </h3>
            <p className="text-sm text-white/70">
              {isRenewedThisMonth ? (
                <>Usage reset on {lastReset?.toLocaleDateString()}</>
              ) : (
                <>Next renewal: {currentPeriodEnd?.toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {daysUntilRenewal && daysUntilRenewal > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-white/80">
                {daysUntilRenewal} days until renewal
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-200 font-medium">
              100 audits/month
            </span>
          </div>
        </div>
      </div>

      {/* Show renewal soon warning */}
      {daysUntilRenewal && daysUntilRenewal <= 3 && daysUntilRenewal > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            Your subscription will renew in {daysUntilRenewal} day{daysUntilRenewal > 1 ? 's' : ''}. 
            Make sure your payment method is up to date.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}