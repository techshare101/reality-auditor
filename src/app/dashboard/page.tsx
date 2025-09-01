"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RealityAuditorApp from "@/components/RealityAuditor";
import SubscriptionCards from "@/components/SubscriptionCards";
import RecentAuditsCard from "@/components/RecentAuditsCard";
import { motion } from "framer-motion";
import { Loader2, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuditCache } from "@/lib/useAuditCache";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { clearAudits } = useAuditCache();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-gray-300">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white">
      {/* Dashboard Header */}
      <div className="px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent"
              >
                Dashboard
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/70 mt-1"
              >
                Welcome back, {user.email}
              </motion.p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/15">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.email?.split('@')[0]}</span>
              </div>
              <Button
                onClick={() => {
                  if (confirm('Clear local audit history? This only affects this device.')) {
                    clearAudits();
                  }
                }}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 border border-white/20"
              >
                Clear Local Cache
              </Button>
              <Button
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 border border-white/20"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
          
          {/* Subscription Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <SubscriptionCards />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <RecentAuditsCard />
          </motion.div>
        </div>
      </div>
      
      {/* Reality Auditor Main App */}
      <main>
        <RealityAuditorApp />
      </main>
    </div>
  );
}
