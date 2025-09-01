"use client";

import { motion } from "framer-motion";

export default function ComparisonTable() {
  const features = [
    { name: "Per-Article Analysis", ra: "✅", newsguard: "❌", adfontes: "❌", politifact: "❌", perplexity: "❌" },
    { name: "Truth Score (0–10)", ra: "✅", newsguard: "❌", adfontes: "❌", politifact: "❌", perplexity: "❌" },
    { name: "Bias Pattern Detection", ra: "✅", newsguard: "✅", adfontes: "✅", politifact: "❌", perplexity: "❌" },
    { name: "Missing Angles", ra: "✅", newsguard: "❌", adfontes: "❌", politifact: "❌", perplexity: "❌" },
    { name: "Manipulation Tactics", ra: "✅", newsguard: "❌", adfontes: "❌", politifact: "❌", perplexity: "❌" },
    { name: "Fact-Check Verdicts", ra: "✅", newsguard: "❌", adfontes: "❌", politifact: "✅", perplexity: "❌" },
    { name: "Real-Time Speed", ra: "⚡ Instant", newsguard: "🐌 Slow", adfontes: "Static", politifact: "🐌 Slow", perplexity: "⚡ Fast" },
    { name: "Citations", ra: "✅ Tavily", newsguard: "✅ References", adfontes: "❌ None", politifact: "✅ Articles", perplexity: "⚠️ Sometimes" },
    { name: "Scalability", ra: "Unlimited", newsguard: "Manual", adfontes: "Static", politifact: "Manual", perplexity: "Unlimited" },
    { name: "UI/UX", ra: "✨ Futuristic", newsguard: "Extension", adfontes: "Chart", politifact: "Articles", perplexity: "Chat-style" },
  ];

  const tools = [
    { name: "Reality Auditor", key: "ra", highlight: true },
    { name: "NewsGuard", key: "newsguard", highlight: false },
    { name: "Ad Fontes", key: "adfontes", highlight: false },
    { name: "PolitiFact", key: "politifact", highlight: false },
    { name: "Perplexity", key: "perplexity", highlight: false },
  ];

  return (
    <div className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent mb-4">
            How We Compare
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Reality Auditor vs. the competition: See why we're the only tool that gives you complete truth analysis in real-time.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-x-auto"
        >
          <div className="min-w-full border-collapse rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl bg-white/5 border border-white/10">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-700/20 border-b border-white/10">
              <div className="grid grid-cols-6 gap-4 p-6">
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Feature</h3>
                </div>
                {tools.map((tool, index) => (
                  <div key={tool.key} className="text-center">
                    <h3 className={`text-lg font-bold ${
                      tool.highlight 
                        ? "bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent" 
                        : "text-white"
                    }`}>
                      {tool.name}
                    </h3>
                    {tool.highlight && (
                      <span className="inline-block mt-1 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-xs font-semibold text-white">
                        That's Us!
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Table Body */}
            <div>
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="grid grid-cols-6 gap-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div className="text-left">
                    <span className="font-medium text-gray-200">{feature.name}</span>
                  </div>
                  
                  {/* Reality Auditor Column (Highlighted) */}
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 text-green-400 font-semibold">
                      {feature.ra}
                    </span>
                  </div>

                  {/* Other Tools */}
                  <div className="text-center text-gray-400">{feature.newsguard}</div>
                  <div className="text-center text-gray-400">{feature.adfontes}</div>
                  <div className="text-center text-gray-400">{feature.politifact}</div>
                  <div className="text-center text-gray-400">{feature.perplexity}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-xl text-gray-300 mb-6">
            Ready to experience the most comprehensive truth analysis available?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/pricing"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg"
            >
              Get Reality Auditor Pro
            </a>
            <a
              href="/"
              className="px-8 py-3 rounded-xl bg-gray-800 border border-gray-600 text-gray-200 font-semibold hover:bg-gray-700 transition"
            >
              Try Free Demo
            </a>
          </div>
        </motion.div>

        {/* Key Differentiators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-20 grid md:grid-cols-3 gap-8"
        >
          <div className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Real-Time Analysis</h3>
            <p className="text-gray-300">
              Get instant truth scores and bias detection on any article, not just pre-selected sources.
            </p>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Lens Approach</h3>
            <p className="text-gray-300">
              Analyze bias, manipulation tactics, missing angles, and fact-check accuracy all in one scan.
            </p>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">GPT-5 Powered</h3>
            <p className="text-gray-300">
              Leveraging the latest AI with Tavily grounding for accurate, cited truth analysis.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
