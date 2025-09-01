"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import { useState } from "react";

interface MarketingLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackToDashboard?: boolean;
}

export default function MarketingLayout({ 
  children, 
  title = "Reality Auditor", 
  showBackToDashboard = true 
}: MarketingLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Compare", href: "/compare" },
    { name: "Dashboard", href: "/dashboard" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">RA</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                Reality Auditor
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold hover:scale-105 transition-transform"
              >
                Get Pro
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pb-4 border-t border-white/10"
            >
              <div className="flex flex-col gap-4 mt-4">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-center"
                >
                  Get Pro
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {showBackToDashboard && (
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RA</span>
                </div>
                <span className="text-lg font-bold text-white">Reality Auditor</span>
              </div>
              <p className="text-gray-400 text-sm">
                X-ray vision for media bias. Powered by GPT-5 and Tavily grounding.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <div className="space-y-2">
                <Link href="/pricing" className="text-gray-400 hover:text-white block transition-colors">
                  Pricing
                </Link>
                <Link href="/compare" className="text-gray-400 hover:text-white block transition-colors">
                  Compare
                </Link>
                <Link href="/dashboard" className="text-gray-400 hover:text-white block transition-colors">
                  Dashboard
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <div className="space-y-2">
                <a href="mailto:hello@realityauditor.com" className="text-gray-400 hover:text-white block transition-colors">
                  Contact
                </a>
                <a href="mailto:support@realityauditor.com" className="text-gray-400 hover:text-white block transition-colors">
                  Support
                </a>
                <Link href="/privacy" className="text-gray-400 hover:text-white block transition-colors">
                  Privacy
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Connect</h3>
              <div className="space-y-2">
                <a href="https://twitter.com/realityauditor" className="text-gray-400 hover:text-white block transition-colors">
                  Twitter
                </a>
                <a href="https://github.com/realityauditor" className="text-gray-400 hover:text-white block transition-colors">
                  GitHub
                </a>
                <a href="mailto:hello@realityauditor.com" className="text-gray-400 hover:text-white block transition-colors">
                  Email
                </a>
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
