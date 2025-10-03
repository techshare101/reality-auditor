"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import UpgradeButton from "@/components/UpgradeButton";
import { 
  Zap, Clock, TrendingUp, Sparkles, X 
} from "lucide-react";

interface PaywallPopupProps {
  feature?: string;
  onClose?: () => void;
}

export default function PaywallPopup({ feature = "audit", onClose }: PaywallPopupProps) {

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 border border-white/20 rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          )}

          {/* Icon and Title */}
          <div className="text-center mb-6">
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
              className="inline-flex p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 mb-4"
            >
              <Zap className="w-12 h-12 text-amber-300" />
            </motion.div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent mb-2">
              Pro Feature Required
            </h2>
            <p className="text-white/80 text-lg">
              Upgrade to Pro to access unlimited {feature}s
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="p-1 rounded-lg bg-green-500/20">
                <Clock className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <p className="text-white font-medium">100 Audits/Month</p>
                <p className="text-white/60 text-sm">20x more than the free plan</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="p-1 rounded-lg bg-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-white font-medium">Priority Processing</p>
                <p className="text-white/60 text-sm">Get faster results with dedicated resources</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="p-1 rounded-lg bg-purple-500/20">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <p className="text-white font-medium">Advanced Analysis</p>
                <p className="text-white/60 text-sm">Deeper insights with GPT-5 + citations</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center mb-6">
            <p className="text-white/60 mb-2">Starting at just</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">$19</span>
              <span className="text-white/60">/month</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <UpgradeButton
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
              size="lg"
            />
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/20 hover:bg-white/10"
                size="lg"
              >
                Maybe Later
              </Button>
            )}
          </div>

          {/* Free trial info */}
          <p className="text-center text-white/40 text-xs mt-4">
            Cancel anytime • Secure checkout with Stripe
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}