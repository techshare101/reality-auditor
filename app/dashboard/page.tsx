"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import DashboardClient from "@/components/DashboardClient";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const loadingFallback = (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xl text-white/70">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <AuthGuard fallback={loadingFallback}>
      <Suspense fallback={loadingFallback}>
        <DashboardClient />
      </Suspense>
    </AuthGuard>
  );
}
