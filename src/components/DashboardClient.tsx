"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { User, LogOut, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuditCache } from "@/lib/useAuditCache";
import { useSearchParams } from "next/navigation";
import RealityAuditorApp from "@/components/RealityAuditor";
import SubscriptionCards from "@/components/SubscriptionCards";
import RecentAuditsCard from "@/components/RecentAuditsCard";
import BillingDebugPanel from "@/components/BillingDebugPanel";
import InfoModal from "@/components/InfoModal";
import { showToast, ToastProvider } from "@/components/GlowingToast";
import ToastContainer from "@/components/ToastContainer";
import Image from "next/image";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";
import TopBadge from "@/components/TopBadge";

export default function DashboardClient() {
  // All hooks must be called unconditionally at the top level
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Handle logout callback
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, router]);
  
  // URL parameters
  const debugMode = searchParams?.get('debug') === '1';
  const upgrade = searchParams?.get('upgrade');
  const sessionId = searchParams?.get('session_id');

  // Handle loading timeout
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle session verification
  useEffect(() => {
    if (upgrade === 'success' && sessionId) {
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(() => {
          setShowSuccess(true);
          router.replace('/dashboard');
        })
        .catch(() => setShowError(true));
    } else if (upgrade === 'cancelled') {
      showToast.info(
        "Upgrade Cancelled",
        "You're still on the Free Plan. Upgrade anytime!"
      );
      router.replace('/dashboard');
    }
  }, [upgrade, sessionId, router]);

  if (!user) {
    // Even if no user, still register hooks above consistently
  }

  // Show success/error notifications
  useEffect(() => {
    if (upgrade === 'success' && sessionId) {
      // Verify the session and update Firestore
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(() => {
          showToast.success(
            "🎉 Welcome to Reality Auditor Pro!",
            "Unlimited audits unlocked. Your dashboard is updating..."
          );
          // Clean up URL params
          router.replace('/dashboard');
        })
        .catch(() => {
          showToast.error(
            "Verification Failed",
            "Please refresh the page or contact support."
          );
        });
    } else if (upgrade === 'cancelled') {
      showToast.info(
        "Upgrade Cancelled",
        "You're still on the Free Plan. Upgrade anytime!"
      );
      // Clean up URL params
      router.replace('/dashboard');
    }
  }, [upgrade, sessionId, router]);



  if (!user) return null;

  // Show success/error notifications
  useEffect(() => {
    if (showSuccess) {
      showToast.success(
        "🎉 Welcome to Reality Auditor Pro!",
        "Unlimited audits unlocked. Your dashboard is updating..."
      );
      setShowSuccess(false);
    }
    if (showError) {
      showToast.error(
        "Verification Failed",
        "Please refresh the page or contact support."
      );
      setShowError(false);
    }
  }, [showSuccess, showError]);

  // Render loading state after all hooks are registered
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If still no user after loading, render nothing
  if (!user) return null;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white">
        {/* Toast Container */}
        <ToastContainer />
        
        {/* Dashboard Header */}
      <div className="px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-start gap-3">
              {/* Logo - will show when logo.png is added to public folder */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                {/* Check if logo exists, otherwise show fallback icon */}
                <Image
                  src="/logo.png"
                  alt="Reality Auditor Logo"
                  width={48}
                  height={48}
                  className="object-cover"
                  onError={(e) => {
                    // Hide image on error and show fallback
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <Eye className="w-7 h-7 text-white hidden" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent flex items-center gap-2">
                  Dashboard
                </h1>
                <p className="text-white/70 mt-1">
                  Welcome back, {user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <TopBadge className="px-3 py-1 rounded-full text-white font-medium" />
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/15">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.email?.split('@')[0]}</span>
              </div>
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
    </ToastProvider>
  );
}
