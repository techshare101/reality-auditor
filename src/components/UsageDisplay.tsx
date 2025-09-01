"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUsageListener } from "@/hooks/useUsageListener";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { 
  Zap, 
  Lock, 
  CreditCard, 
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UsageDisplay() {
  const { user } = useAuth();
  const router = useRouter();
  const { usage, loading, error } = useUsageListener(user?.uid || null);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl p-4 border border-gray-800">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">Loading usage...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-900/20 backdrop-blur-xl p-4 border border-red-800/50">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">Error loading usage</span>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const { audits_used, audit_limit, plan } = usage;
  const remaining = Math.max(audit_limit - audits_used, 0);
  const percentUsed = Math.min((audits_used / audit_limit) * 100, 100);
  const isLimitReached = remaining === 0;

  // Color based on usage
  const getBarColor = () => {
    if (percentUsed >= 100) return "bg-red-500";
    if (percentUsed >= 80) return "bg-amber-500";
    if (percentUsed >= 60) return "bg-yellow-500";
    return "bg-indigo-500";
  };

  return (
    <>
      {/* Usage Display Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gray-900/50 backdrop-blur-xl p-4 border border-gray-800"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Usage This Month</h3>
          {plan && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 capitalize">
              {plan} Plan
            </span>
          )}
        </div>
        
        <p className="text-xs text-gray-400 mb-3">
          {remaining} remaining of {audit_limit} audits
        </p>
        
        <div className="relative">
          <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentUsed}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-2 rounded-full ${getBarColor()} transition-colors duration-300`}
            />
          </div>
          
          {/* Animated pulse effect when near limit */}
          {percentUsed >= 80 && (
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 h-2 rounded-full bg-amber-400 blur-md"
            />
          )}
        </div>

        {/* Usage breakdown */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {audits_used} used
          </span>
          <span className={remaining <= 2 ? "text-amber-400 font-medium" : "text-gray-500"}>
            {remaining} left
          </span>
        </div>
      </motion.div>

      {/* Upgrade Overlay - Shows when limit is reached */}
      <AnimatePresence>
        {isLimitReached && plan === "free" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="bg-gradient-to-br from-gray-900 via-indigo-900/20 to-gray-900 border border-indigo-500/20 rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              {/* Lock Icon Animation */}
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut" 
                }}
                className="text-center mb-6"
              >
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/30">
                  <Lock className="w-12 h-12 text-red-400" />
                </div>
              </motion.div>

              {/* Title and Description */}
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-red-200 to-orange-200 bg-clip-text text-transparent mb-2">
                Audit Limit Reached
              </h2>
              <p className="text-center text-gray-400 mb-6">
                You've used all {audit_limit} free audits this month. Upgrade to continue auditing without limits.
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-medium">100+ Audits/Month</p>
                    <p className="text-gray-400 text-sm">Never worry about limits</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Cancel Anytime</p>
                    <p className="text-gray-400 text-sm">No long-term commitment</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20"
                  size="lg"
                >
                  Upgrade Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                  size="lg"
                >
                  Go Home
                </Button>
              </div>

              {/* Small print */}
              <p className="text-center text-xs text-gray-500 mt-4">
                Starting at just $29/month
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
