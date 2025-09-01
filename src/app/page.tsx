"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Sparkles, TrendingUp, Search, AlertTriangle, CheckCircle } from "lucide-react";
import InfoModal from "@/components/InfoModal";
import ComparisonTable from "@/components/ComparisonTable";

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                Reality Auditor
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/compare" className="text-gray-300 hover:text-white transition-colors">
                Compare
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold hover:scale-105 transition-transform"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative text-center py-32 px-6 overflow-hidden pt-44">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
              animate={{
                x: [Math.random() * 1920, Math.random() * 1920],
                y: [Math.random() * 1080, Math.random() * 1080],
              }}
              transition={{
                repeat: Infinity,
                duration: Math.random() * 10 + 10,
                ease: "linear",
              }}
              style={{
                left: Math.random() * 100 + "%",
                top: Math.random() * 100 + "%",
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent leading-tight">
            See Through The Noise
          </h1>
          <p className="mt-6 text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Reality Auditor is your AI-powered truth lens. Paste any article, 
            news piece, or transcript — and get an instant audit of truth, bias, 
            manipulation, omissions, and real citations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:scale-105 transition inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Sign Up Free 🚀
            </Link>
            <Link
              href="/demo"
              className="px-8 py-4 rounded-xl bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700 transition inline-flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Try Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-center mb-16"
          >
            How Reality Auditor Works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { 
                title: "1. Paste Article", 
                desc: "Drop in any article URL or text content.",
                icon: Search,
                color: "from-blue-500/20 to-indigo-700/20",
                border: "border-blue-500/40"
              },
              { 
                title: "2. Audit Reality", 
                desc: "AI runs multi-lens truth analysis in seconds.",
                icon: Eye,
                color: "from-purple-500/20 to-purple-700/20",
                border: "border-purple-500/40"
              },
              { 
                title: "3. See the Truth", 
                desc: "Get scores, warnings, bias patterns, and citations.",
                icon: CheckCircle,
                color: "from-green-500/20 to-emerald-700/20",
                border: "border-green-500/40"
              },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className={`p-8 bg-gradient-to-br ${step.color} border ${step.border} backdrop-blur-xl rounded-2xl shadow-xl hover:scale-105 transition-transform`}
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-center mb-16"
          >
            Why Choose Reality Auditor?
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Truth Score",
                desc: "AI-generated credibility rating (0–10) with confidence levels.",
                color: "from-green-500/20 to-green-700/20",
                border: "border-green-500/40",
                icon: TrendingUp
              },
              {
                title: "Bias Patterns", 
                desc: "Detect cherry-picking, loaded language, and framing bias.",
                color: "from-orange-500/20 to-orange-700/20",
                border: "border-orange-500/40",
                icon: Search
              },
              {
                title: "Manipulation Alerts",
                desc: "Flags fear tactics, oversimplifications, and propaganda cues.",
                color: "from-red-500/20 to-red-700/20",
                border: "border-red-500/40",
                icon: AlertTriangle
              },
              {
                title: "Fact Checks",
                desc: "Verified claims with citations from credible sources.",
                color: "from-blue-500/20 to-indigo-700/20",
                border: "border-blue-500/40",
                icon: CheckCircle
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-6 rounded-2xl bg-gradient-to-br ${feature.color} border ${feature.border} hover:scale-105 transition-transform`}
                >
                  <div className="w-12 h-12 mb-4 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-center mb-16"
          >
            Reality Auditor vs Alternatives
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ComparisonTable />
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-24 px-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-4xl font-semibold mb-6">Ready to See the Truth?</h3>
          <p className="mt-4 text-xl text-gray-300 max-w-2xl mx-auto">
            Join journalists, researchers, and everyday readers using Reality Auditor to cut through media bias and manipulation.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:scale-105 transition text-lg"
          >
            <Sparkles className="w-6 h-6" />
            Sign Up Free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Reality Auditor</span>
              </div>
              <p className="text-gray-400 text-sm">
                X-ray vision for media bias. Powered by cutting-edge AI.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <div className="space-y-2">
                <Link href="/pricing" className="text-gray-400 hover:text-white block transition-colors text-sm">
                  Pricing
                </Link>
                <Link href="/compare" className="text-gray-400 hover:text-white block transition-colors text-sm">
                  Compare
                </Link>
                <Link href="/dashboard" className="text-gray-400 hover:text-white block transition-colors text-sm">
                  Dashboard
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <div className="space-y-2">
                <a href="mailto:hello@realityauditor.com" className="text-gray-400 hover:text-white block transition-colors text-sm">
                  Contact
                </a>
                <a href="mailto:support@realityauditor.com" className="text-gray-400 hover:text-white block transition-colors text-sm">
                  Support
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <div className="space-y-2">
                <InfoModal triggerLabel="Privacy Policy" title="Privacy Policy">
                  <p>
                    Reality Auditor respects your privacy. We never sell your data. Audit results are stored
                    only to enforce usage limits. Anonymized usage data may be used to improve the service.
                  </p>
                  <p>
                    Authentication is handled via Firebase Auth. Payments are processed by Stripe — we never
                    see or store your card details.
                  </p>
                  <p>
                    By using this site, you agree to these practices. Contact us at support@realityauditor.com with questions.
                  </p>
                </InfoModal>
                <InfoModal triggerLabel="Terms of Service" title="Terms of Service">
                  <p>
                    By accessing or using Reality Auditor, you agree to comply with these Terms of Service.
                  </p>
                  <p>
                    You are responsible for how you use the audits generated. Reality Auditor does not
                    guarantee 100% accuracy of analysis or citations.
                  </p>
                  <p>
                    Subscriptions are billed via Stripe. You may cancel anytime via the Billing Portal.
                  </p>
                  <p>
                    We reserve the right to update these terms to keep the service secure and compliant.
                  </p>
                </InfoModal>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Reality Auditor. Powered by MetalMindTech • AgentForge Kernel.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
