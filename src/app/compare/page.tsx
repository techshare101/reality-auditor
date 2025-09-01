"use client";

import MarketingLayout from "@/components/MarketingLayout";
import ComparisonTable from "@/components/ComparisonTable";
import { motion } from "framer-motion";

export default function ComparePage() {
  return (
    <MarketingLayout title="Compare - Reality Auditor" showBackToDashboard={true}>
      <div className="text-white py-16 px-6">
        {/* 🔹 Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent"
          >
            See Why Reality Auditor Wins
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg text-gray-300 leading-relaxed"
          >
            Why settle for yesterday's fact-checking when you can{" "}
            <span className="text-purple-400 font-semibold">audit reality in real-time?</span>  
            Compare Reality Auditor to alternatives and discover the future of truth analysis.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex justify-center gap-4"
          >
            <a
              href="/pricing"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold shadow-lg hover:scale-105 transition"
            >
              Get Started Free
            </a>
            <a
              href="/pricing"
              className="px-6 py-3 rounded-xl bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700 transition"
            >
              View Pricing
            </a>
          </motion.div>
        </section>

        {/* 🔹 Comparison Table */}
        <section className="mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-center mb-10"
          >
            Feature-by-Feature Comparison
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ComparisonTable />
          </motion.div>
        </section>

        {/* 🔹 Bottom CTA */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center py-16 px-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 backdrop-blur-xl rounded-3xl"
        >
          <h3 className="text-2xl font-semibold">
            Ready to see through the noise?
          </h3>
          <p className="mt-3 text-gray-300 max-w-2xl mx-auto">
            Start using Reality Auditor today and experience the future of media transparency.
          </p>
          <a
            href="/pricing"
            className="mt-6 inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:scale-105 transition"
          >
            Start Auditing Now 🚀
          </a>
        </motion.section>
      </div>
    </MarketingLayout>
  );
}
