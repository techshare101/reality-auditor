"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuditCache } from "@/lib/useAuditCache";
import { useSearchParams } from "next/navigation";
import RealityAuditorApp from "@/components/RealityAuditor";
import SubscriptionCards from "@/components/SubscriptionCards";
import RecentAuditsCard from "@/components/RecentAuditsCard";
import BillingDebugPanel from "@/components/BillingDebugPanel";
import InfoModal from "@/components/InfoModal";

export default function DashboardClient() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { clearAudits } = useAuditCache();
  const searchParams = useSearchParams();
  const debugMode = searchParams?.get('debug') === '1';

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, router]);

  const handleClearCache = useCallback(() => {
    if (confirm('Clear local audit history? This only affects this device.')) {
      clearAudits();
    }
  }, [clearAudits]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white">
      {/* Dashboard Header */}
      <div className="px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-white/70 mt-1">
                Welcome back, {user.email}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/15">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.email?.split('@')[0]}</span>
              </div>
              <Button
                onClick={handleClearCache}
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

          {/* Legal quick links */}
          <div className="flex items-center gap-4 text-xs text-white/70 mb-4">
            <span className="opacity-70">Legal:</span>
            <div className="flex items-center gap-3">
              <InfoModal
                triggerLabel="Privacy Policy"
                title="Privacy Policy"
                className="text-indigo-300 hover:text-indigo-200 underline"
              >
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
              <InfoModal
                triggerLabel="Terms of Service"
                title="Terms of Service"
                className="text-indigo-300 hover:text-indigo-200 underline"
              >
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
          
          {debugMode && (
            <div className="mb-6">
              <BillingDebugPanel />
            </div>
          )}

          {/* Subscription Cards */}
          <div className="mb-8">
            <SubscriptionCards />
          </div>
          
          {/* Recent Audits */}
          <div className="mb-8">
            <RecentAuditsCard />
          </div>
        </div>
      </div>
      
      {/* Reality Auditor Main App */}
      <main>
        <RealityAuditorApp />
      </main>
    </div>
  );
}
