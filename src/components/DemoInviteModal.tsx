"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, ArrowRight, Crown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DemoInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoInviteModal({ isOpen, onClose }: DemoInviteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md">
              {/* Glowing background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-3xl opacity-20" />
              
              {/* Modal content */}
              <div className="relative backdrop-blur-xl bg-white/10 border-2 border-white/20 shadow-2xl rounded-3xl p-8 overflow-hidden">
                {/* Animated background particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div
                    animate={{
                      x: [0, 100, 0],
                      y: [0, -100, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 20,
                      ease: "linear",
                    }}
                    className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"
                  />
                  <motion.div
                    animate={{
                      x: [0, -100, 0],
                      y: [0, 100, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 15,
                      ease: "linear",
                    }}
                    className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
                  />
                </div>

                {/* Pro badge */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-200">
                    <Crown className="w-3 h-3 mr-1" />
                    PRO Available
                  </Badge>
                </div>

                {/* Content */}
                <div className="relative space-y-6">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-2xl" />
                      <div className="relative p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl">
                        <Sparkles className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Title & Description */}
                  <div className="text-center space-y-3">
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent"
                    >
                      🚀 Start Auditing for Free
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/80 text-lg"
                    >
                      Sign up today and unlock{" "}
                      <span className="font-semibold text-white">
                        5 free audits every month
                      </span>
                    </motion.p>
                  </div>

                  {/* Features */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                  >
                    {[
                      { icon: "🎯", text: "Truth Score Analysis" },
                      { icon: "🔍", text: "Bias & Manipulation Detection" },
                      { icon: "✅", text: "Fact Verification with Citations" },
                    ].map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <span className="text-white/90">{feature.text}</span>
                      </div>
                    ))}
                  </motion.div>

                  {/* CTA Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-3"
                  >
                    <Link href="/register" className="block">
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-lg relative overflow-hidden group"
                      >
                        <motion.div
                          animate={{
                            x: ["-100%", "100%"],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: "linear",
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                        <span className="relative flex items-center justify-center gap-2">
                          <Zap className="w-5 h-5" />
                          Create Free Account
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </Button>
                    </Link>

                    <div className="text-center space-y-2">
                      <Link
                        href="/login"
                        className="text-sm text-white/60 hover:text-white transition-colors"
                      >
                        Already have an account? Log in here →
                      </Link>
                      <div className="text-xs text-white/40">
                        No credit card required • 5 audits/month free forever
                      </div>
                    </div>
                  </motion.div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 left-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-white/60"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
