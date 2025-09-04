"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { 
  cancelSubscription, 
  formatCancellationDate, 
  getSubscriptionStatusDisplay 
} from "@/lib/subscription-management";

interface SubscriptionManagerProps {
  subscription: any;
  onUpdate?: () => void;
}

export default function SubscriptionManager({ 
  subscription, 
  onUpdate 
}: SubscriptionManagerProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelResult(null);

    try {
      const result = await cancelSubscription(subscription.id);
      
      setCancelResult({
        success: true,
        message: result.message || "Subscription cancelled successfully",
      });
      
      // Refresh the parent component
      if (onUpdate) {
        setTimeout(onUpdate, 2000);
      }
    } catch (error: any) {
      setCancelResult({
        success: false,
        error: error.message || "Failed to cancel subscription",
      });
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  const handleRetry = () => {
    setCancelResult(null);
    handleCancel();
  };

  const status = getSubscriptionStatusDisplay(subscription);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Subscription Status
          </h3>
          <div className={`flex items-center gap-2 ${status.color}`}>
            <span className="text-lg">{status.icon}</span>
            <span className="font-medium">{status.text}</span>
          </div>
        </div>
        
        {subscription && subscription.status === 'active' && !subscription.cancel_at_period_end && (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Cancel Subscription
          </button>
        )}
      </div>

      {/* Subscription details */}
      {subscription && (
        <div className="space-y-2 text-sm text-gray-400">
          <p>Plan: <span className="text-white font-medium">{subscription.plan?.nickname || 'Basic'}</span></p>
          <p>Next billing: <span className="text-white font-medium">
            {formatCancellationDate(subscription.current_period_end)}
          </span></p>
          {subscription.cancel_at_period_end && (
            <p className="text-orange-400">
              ⚠️ Your subscription will end on {formatCancellationDate(subscription.current_period_end)}
            </p>
          )}
        </div>
      )}

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-xl font-semibold text-white mb-4">
                Cancel Subscription?
              </h4>
              <p className="text-gray-400 mb-6">
                Your subscription will remain active until {formatCancellationDate(subscription.current_period_end)}. 
                You can reactivate anytime before this date.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={cancelling}
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Yes, Cancel"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel result notification */}
      <AnimatePresence>
        {cancelResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-4 rounded-xl ${
              cancelResult.success 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {cancelResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${
                  cancelResult.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  {cancelResult.message || cancelResult.error}
                </p>
                {!cancelResult.success && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
