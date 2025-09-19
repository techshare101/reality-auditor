"use client";

import { type FC } from 'react';
import { type MouseEvent } from 'react';
import { motion } from "framer-motion";
import { useUnifiedAuditAccess } from "@/hooks/useUnifiedAuditAccess";
import { Sparkles, Loader2, Crown } from "lucide-react";

export interface AuditBadgeProps {
  onClick?: () => void;  // Optional click handler for Pro upgrade
  compact?: boolean;      // Optional compact mode for header display
}

export const AuditBadge: FC<AuditBadgeProps> = ({ onClick, compact = false }) => {
  const { isProUser, plan, used, loading, showPaywall } = useUnifiedAuditAccess();

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isProUser && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (isProUser) {
    return (
      <div className={compact ? "" : "flex justify-center"}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${compact ? 'inline-flex' : 'flex'} items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30`}
        >
          <Sparkles className="w-4 h-4 text-green-400" />
          <div className="flex items-center gap-2 text-green-200">
            <span>Pro Access</span>
            <span className="text-xs bg-green-600/50 px-2 py-0.5 rounded-full">
              {plan?.toUpperCase() || "PRO"}
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "flex justify-center"}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleClick}
        className={`
          ${compact ? 'inline-flex' : 'flex'} items-center gap-2 px-4 py-2 rounded-full
          ${showPaywall
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-white/5 border-white/10 text-white/90'
          } border
          ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <span>{compact ? `${used}/5 Free Audits` : `Free Audits Used: ${used}/5`}</span>
          {showPaywall && onClick && (
            <span className="text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Upgrade
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};
