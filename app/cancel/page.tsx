"use client";

import { motion } from "framer-motion";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import MarketingLayout from "@/components/MarketingLayout";

export default function CancelPage() {
  return (
    <MarketingLayout title="Payment Cancelled - Reality Auditor" showBackToDashboard={false}>
    <div className="text-white flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl text-center"
      >
        {/* Cancel Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-xl">
            <XCircle size={48} className="text-white" />
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            Payment Cancelled
          </h1>

          <p className="text-xl text-gray-300 mb-6">
            No worries! Your payment was cancelled and no charges were made.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 mb-8 text-left space-y-3">
            <p className="text-gray-300">
              <strong>What happened?</strong> You cancelled the checkout process or closed the payment window.
            </p>
            <p className="text-gray-300">
              <strong>Next steps:</strong> You can try again anytime, or continue using Reality Auditor with the free plan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing" className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg">
              <RefreshCw size={20} className="mr-2" />
              Try Again
            </Link>
            
            <Link href="/" className="inline-flex items-center justify-center px-6 py-3 bg-gray-800 border border-gray-600 text-gray-200 font-semibold rounded-xl hover:bg-gray-700 transition">
              <ArrowLeft size={20} className="mr-2" />
              Back to Home
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4">Continue with Free Plan</h2>
          <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300">
            <p>• 5 audits per month</p>
            <p>• Basic truth score analysis</p>
            <p>• Bias pattern detection</p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-gray-400 text-sm"
        >
          Questions? Reach out at{" "}
          <a href="mailto:support@realityauditor.com" className="text-purple-400 hover:underline">
            support@realityauditor.com
          </a>
        </motion.p>
      </motion.div>
    </div>
    </MarketingLayout>
  );
}
