import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useUnifiedAuditAccess } from "@/hooks/useUnifiedAuditAccess";

export function AuditBadge({ compact, onClick }: { compact?: boolean; onClick?: () => void }) {
  const { isProUser, audits_used, loading } = useUnifiedAuditAccess();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-800/50 border border-gray-600/20 text-gray-400 px-6 py-3 rounded-2xl text-center">
        Checking subscription...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`
        ${compact ? "inline-flex" : "flex"} items-center justify-center px-6 py-3 rounded-2xl shadow-lg
        border backdrop-blur-md transition-all
        ${isProUser
          ? "bg-green-500/10 border-green-500/30 text-green-200"
          : "bg-amber-500/10 border-amber-500/30 text-amber-200"}
        ${onClick ? "cursor-pointer hover:bg-white/10 transition-colors" : ""}
      `}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        {isProUser ? (
          <>
            <span className="text-green-300 font-bold text-lg">✨ Unlimited Audits Active</span>
            <span className="text-green-400 text-sm">Thank you for being a Pro member!</span>
          </>
        ) : (
          <>
            <span className="text-amber-300 font-bold text-lg">
              Free Audits Used: {audits_used ?? 0}/5
            </span>
            {onClick && (
              <span className="text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-amber-400/30">
                <Crown className="w-3 h-3" />
                Upgrade
              </span>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
