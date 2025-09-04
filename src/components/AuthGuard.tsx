"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  fallback,
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-xl text-white/70">Checking authentication...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children until we confirm user is authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
