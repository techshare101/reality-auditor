"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface ProUpgradeError {
  code: string;
  message: string;
  details?: any;
}

export function useProUpgrade() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProUpgradeError | null>(null);

  const startCheckout = async () => {
    if (!user) {
      // Store redirect intent in session storage
      sessionStorage.setItem("upgrade_after_login", "true");
      router.push("/login?redirect=upgrade");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a checkout session with user's uid
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          returnUrl: window.location.origin + "/success",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw {
          code: "CHECKOUT_ERROR",
          message: data.error || "Failed to start checkout",
          details: data.details,
        };
      }

      // Save checkout intent to session storage (used for optimistic updates)
      sessionStorage.setItem(
        "pro_upgrade_intent",
        JSON.stringify({
          timestamp: Date.now(),
          userId: user.uid,
          sessionId: data.sessionId,
          email: user.email,
        })
      );

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError({
        code: err.code || "UNKNOWN_ERROR",
        message: err.message || "Something went wrong",
        details: err.details,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    // Check if we have a pending upgrade after login
    const shouldUpgrade = sessionStorage.getItem("upgrade_after_login");
    if (shouldUpgrade) {
      sessionStorage.removeItem("upgrade_after_login");
      startCheckout();
    }
  };

  return {
    startCheckout,
    handleLoginRedirect,
    loading,
    error,
  };
}
