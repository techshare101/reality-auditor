"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Sparkles, Crown, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MarketingLayout from "@/components/MarketingLayout";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    // Optional: Fetch session details to show customer info
    if (sessionId) {
      fetch(`/api/checkout/verify?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.customer_email) {
            setCustomerEmail(data.customer_email);
          }
        })
        .catch(err => console.log('Could not fetch session details:', err));
    }
  }, [sessionId]);

  return (
    <div className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Celebration Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          {/* Success Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
            className="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20"
          >
            <Crown size={64} className="text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-5xl md:text-6xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
              🎉 You're Now Pro!
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-2xl text-gray-300 mb-2"
          >
            Welcome to <span className="text-purple-400 font-bold">Reality Auditor Pro</span>
          </motion.p>

          {customerEmail && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-gray-400 mb-8"
            >
              Confirmation sent to: <span className="text-white font-semibold">{customerEmail}</span>
            </motion.p>
          )}
        </motion.div>

        {/* Pro Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          <div className="bg-gradient-to-br from-purple-600/20 to-indigo-700/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Unlimited Power</h3>
                <p className="text-gray-300 text-sm">No more monthly limits</p>
              </div>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={16} />
                <span>Unlimited audits per month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={16} />
                <span>Priority processing queue</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-700/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Advanced Analysis</h3>
                <p className="text-gray-300 text-sm">Complete truth detection</p>
              </div>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={16} />
                <span>Full audit lenses</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={16} />
                <span>Export capabilities</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-2xl"
            >
              <Zap size={24} className="mr-2" />
              Start Auditing Now
            </Link>
            
            <Link
              href="/compare"
              className="inline-flex items-center justify-center px-8 py-4 bg-gray-800/50 border border-gray-600 text-gray-200 font-semibold rounded-xl hover:bg-gray-700/50 transition backdrop-blur-sm"
            >
              See What Makes Us Different
              <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
        </motion.div>

        {/* Session Info */}
        {sessionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-xs text-gray-400">
                Transaction ID: <span className="font-mono">{sessionId}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Need this for support? Keep this confirmation for your records.
              </p>
            </div>
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-12"
        >
          <div className="bg-gradient-to-r from-purple-600/10 to-indigo-700/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Need Help Getting Started?</h3>
            <p className="text-gray-400 mb-4">
              Our team is here to help you get the most out of Reality Auditor Pro.
            </p>
            <a
              href="mailto:support@realityauditor.com"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              📧 support@realityauditor.com
              <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <MarketingLayout title="Success - Reality Auditor Pro" showBackToDashboard={false}>
      <Suspense fallback={
        <div className="min-h-screen text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-purple-500"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </MarketingLayout>
  );
}
