"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type PlanType = "free" | "basic" | "pro" | "team";

interface PlanButtonProps {
  plan: PlanType;
  priceId?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function PlanButton({ plan, priceId, className = "", children }: PlanButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleProCheckout = async () => {
    setLoading(true);
    
    try {
      // If user is not logged in, redirect to signup first
      if (!user) {
        router.push("/signup?plan=basic&redirect=checkout");
        return;
      }

      // Get the auth token
      const token = await user.getIdToken();
      
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: priceId || "price_1S2KmxGRxp9eu0DJrdcrLLNR", // Basic plan price ID
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const baseClasses = "w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2";

  if (plan === "free") {
    return (
      <Link
        href="/signup"
        className={`${baseClasses} bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700 ${className}`}
      >
        {children || "Get Started"}
      </Link>
    );
  }

  if (plan === "basic" || plan === "pro") {
    return (
      <button
        onClick={handleProCheckout}
        disabled={loading}
        className={`${baseClasses} bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Processing...
          </>
        ) : (
          children || (plan === "basic" ? "Upgrade to Basic" : "Upgrade to Pro")
        )}
      </button>
    );
  }

  if (plan === "team") {
    return (
      <a
        href="mailto:sales@realityauditor.com?subject=Reality Auditor Team Plan Inquiry"
        className={`${baseClasses} bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700 ${className}`}
      >
        {children || "Contact Sales"}
      </a>
    );
  }

  return null;
}
