"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, LogOut, LayoutDashboard, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="glass-navbar">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
              Reality Auditor
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link 
                  href="/pricing" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Pricing
                </Link>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold hover:scale-105 transition-transform"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
