"use client";

import { motion } from "framer-motion";
import { useAuditUsage } from "@/hooks/useAuditUsage";
import { useProStatus } from "@/hooks/useProStatus";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  Infinity
} from "lucide-react";

export default function AuditUsageBadge() {
  const { user } = useAuth();
  const proStatus = useProStatus(user?.uid);
  const usage = useAuditUsage();
  
  if (!user) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-500/10 border border-gray-500/20">
        <span className="text-sm text-gray-400">Sign in to track audits</span>
      </div>
    );
  }

  if (proStatus === "loading") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-500/10 border border-gray-500/20 animate-pulse">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  const isPro = proStatus === "pro";
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${
        isPro 
          ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
          : usage.isNearLimit
            ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
            : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20"
      }`}
    >
      {/* Icon */}
      <div className={`p-1 rounded-lg ${
        isPro 
          ? "bg-emerald-500/20"
          : usage.isNearLimit
            ? "bg-amber-500/20"
            : "bg-blue-500/20"
      }`}>
        {isPro ? (
          <Infinity className="w-4 h-4 text-emerald-400" />
        ) : usage.isNearLimit ? (
          <AlertCircle className="w-4 h-4 text-amber-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-blue-400" />
        )}
      </div>

      {/* Usage Text */}
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${
          isPro 
            ? "text-emerald-200"
            : usage.isNearLimit
              ? "text-amber-200"
              : "text-blue-200"
        }`}>
          {usage.displayText}
        </span>
        
        {/* Progress bar for free users */}
        {!isPro && usage.percentage > 0 && (
          <div className="w-24 mt-1">
            <Progress 
              value={usage.percentage} 
              className={`h-1.5 ${
                usage.isNearLimit 
                  ? "[&>*[data-slot='progress-indicator']]:bg-amber-500" 
                  : "[&>*[data-slot='progress-indicator']]:bg-blue-500"
              }`}
            />
          </div>
        )}
      </div>

      {/* Status Icon */}
      {isPro ? (
        <CheckCircle className="w-4 h-4 text-emerald-400" />
      ) : usage.remaining === 0 ? (
        <AlertCircle className="w-4 h-4 text-red-400" />
      ) : null}
    </motion.div>
  );
}