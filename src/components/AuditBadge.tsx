import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Loader2 } from "lucide-react";
import { useUnifiedAuditAccess } from "@/hooks/useUnifiedAuditAccess";
import { useEffect } from "react";

export function AuditBadge({ compact, onClick }: { compact?: boolean; onClick?: () => void }) {
  const { isProUser, audits_used, loading, plan } = useUnifiedAuditAccess();

  // Debug log subscription state
  useEffect(() => {
    console.log('🎫 AuditBadge State:', {
      isProUser,
      plan,
      audits_used,
      loading,
    });
  }, [isProUser, plan, audits_used, loading]);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 px-6 py-3 rounded-2xl text-center shadow-xl">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking subscription...</span>
        </div>
      </motion.div>
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
      <AnimatePresence mode="wait">
        {isProUser ? (
          <motion.div
            key="pro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-bold text-lg">Unlimited Audits Active</span>
            </div>
            <span className="text-green-400/80 text-sm">Thank you for being a Pro member!</span>
          </motion.div>
        ) : (
          <motion.div
            key="free"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-2">
            <span className="text-amber-300 font-bold text-lg">
              Free Audits Used: {audits_used}/5
            </span>
            {onClick && (
              <motion.span 
                whileHover={{ scale: 1.05 }}
                className="text-xs bg-amber-400/20 text-amber-200 px-3 py-1 rounded-full flex items-center gap-2 cursor-pointer hover:bg-amber-400/30 transition-colors">
                <Crown className="w-3.5 h-3.5" />
                Upgrade to Pro
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
