"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Loader2, Star, Zap, Shield } from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";
import PlanButton from "@/components/PlanButton";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with truth scanning.",
    features: [
      "5 audits per month",
      "Basic truth score",
      "Bias pattern detection",
    ],
    cta: "Get Started",
    highlight: false,
    href: "/signup",
  },
  {
    name: "Basic",
    price: "$19/mo",
    description: "For journalists, researchers, and fact-checkers.",
    features: [
      "100+ audits per month",
      "Full audit lenses (bias, omissions, manipulation)",
      "Export to PDF/CSV",
      "Audit history library",
      "Priority queue (faster processing)",
    ],
    cta: "Upgrade to Basic",
    highlight: true,
    priceId: "price_1S2KmxGRxp9eu0DJrdcrLLNR",
  },
  {
    name: "Team",
    price: "$99/mo",
    description: "For newsrooms, NGOs, and legal teams.",
    features: [
      "Everything in Basic",
      "5 team seats included",
      "Shared audit library",
      "Slack/Teams integration",
      "API access",
    ],
    cta: "Contact Sales",
    highlight: false,
    href: "mailto:sales@realityauditor.com",
  },
];

export default function PricingPage() {

  return (
    <MarketingLayout title="Pricing - Reality Auditor" showBackToDashboard={true}>
    <div className="text-white py-16 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent"
        >
          Choose Your Reality Audit Plan
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-lg text-gray-300 leading-relaxed"
        >
          Start with our{" "}
          <span className="text-purple-400 font-semibold">free tier</span> and upgrade as you grow.  
          Every plan includes our cutting-edge AI bias detection, truth scoring, and real-time fact verification.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex justify-center gap-4"
        >
          <a
            href="/"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            Try Free Demo
          </a>
          <a
            href="/compare"
            className="px-6 py-3 rounded-xl bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700 transition"
          >
            Compare Features
          </a>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            className={`p-6 rounded-2xl border backdrop-blur-xl shadow-xl relative ${
              tier.highlight
                ? "bg-gradient-to-br from-purple-600/30 to-indigo-700/30 border-white/40 scale-105"
                : "bg-white/5 border-white/10"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
            )}

            <h2 className="text-2xl font-semibold mb-2">{tier.name}</h2>
            <p className="text-3xl font-bold mb-2">{tier.price}</p>
            <p className="text-gray-300 mb-6">{tier.description}</p>

            <ul className="space-y-3 text-left mb-8">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✔</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <PlanButton 
              plan={tier.name.toLowerCase() as "free" | "basic" | "team"}
              priceId={tier.priceId}
            >
              {tier.cta}
            </PlanButton>

            {tier.name === "Basic" && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Cancel anytime • Secure payment by Stripe
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center mt-12"
      >
        <p className="text-gray-400 mb-4">
          All plans include our core truth-detection technology powered by GPT-5 and Tavily grounding.
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <span>✓ 30-day money back guarantee</span>
          <span>✓ Cancel anytime</span>
          <span>✓ Secure payments</span>
          <span>✓ 24/7 support</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-8"
      >
        <p className="text-gray-400 text-sm">
          Questions about pricing?{" "}
          <a 
            href="mailto:sales@realityauditor.com" 
            className="text-purple-400 hover:underline"
          >
            Contact our sales team
          </a>
        </p>
      </motion.div>
    </div>
    </MarketingLayout>
  );
}
