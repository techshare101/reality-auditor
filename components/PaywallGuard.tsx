"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProStatus } from "@/hooks/useProStatus";
import PaywallPopup from "@/components/PaywallPopup";

interface PaywallGuardProps {
  children: ReactNode;
  feature?: string; // Optional: track which feature triggered the paywall
}

export default function PaywallGuard({ children, feature = "audit" }: PaywallGuardProps) {
  const { user } = useAuth();
  const status = useProStatus(user?.uid);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in or free plan -> show paywall
  if (!user || status === "free") {
    return <PaywallPopup feature={feature} />;
  }

  // Pro user -> allow access
  return <>{children}</>;
}