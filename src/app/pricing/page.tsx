"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Loader2, Star, Zap, Shield } from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";

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
    name: "Pro",
    price: "$19/mo",
    description: "For journalists, researchers, and fact-checkers.",
    features: [
      "Unlimited audits",
      "Full audit lenses (bias, omissions, manipulation)",
      "Export to PDF/CSV",
      "Audit history library",
      "Priority queue (faster processing)",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_1S1tnbGnOgSIwPZhYfV3aFXe",
  },
  {
    name: "Team",
    price: "$99/mo",
    description: "For newsrooms, NGOs, and legal teams.",
    features: [
      "Everything in Pro",
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
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    setLoading(priceId);
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleButtonClick = (tier: typeof tiers[0]) => {
    if (tier.priceId) {
      handleCheckout(tier.priceId);
    } else if (tier.href) {
      if (tier.href.startsWith("mailto:")) {
        window.location.href = tier.href;
      } else {
        window.location.href = tier.href;
      }
    }
  };

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

            <button
              onClick={() => handleButtonClick(tier)}
              disabled={loading === tier.priceId}
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                tier.highlight
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:scale-105 disabled:hover:scale-100"
                  : "bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700"
              } ${loading === tier.priceId ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading === tier.priceId ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                tier.cta
              )}
            </button>

            {tier.name === "Pro" && (
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
