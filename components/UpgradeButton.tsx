"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProStatus } from "@/hooks/useProStatus";
import { 
  CreditCard, 
  Settings, 
  Loader2, 
  ArrowUpRight 
} from "lucide-react";

interface UpgradeButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
}

export default function UpgradeButton({ 
  className = "", 
  size = "default",
  variant = "default" 
}: UpgradeButtonProps) {
  const { user } = useAuth();
  const proStatus = useProStatus(user?.uid);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const isPro = proStatus === "pro";
  const isLoading = proStatus === "loading" || loading;

  const handleClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    
    try {
      const idToken = await user.getIdToken();
      
      if (isPro) {
        // Pro users go to Stripe Customer Portal
        const res = await fetch("/api/stripe/portal", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });
        
        const data = await res.json();
        
        if (data.url) {
          window.location.href = data.url;
        } else {
          console.error("Failed to create portal session:", data.error);
          router.push("/pricing");
        }
      } else {
        // Free users go to checkout
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
          }),
        });
        
        const data = await res.json();
        
        if (data.url) {
          window.location.href = data.url;
        } else {
          router.push("/pricing");
        }
      }
    } catch (err) {
      console.error("Upgrade/Portal redirect failed:", err);
      router.push("/pricing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
      size={size}
      variant={variant}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : isPro ? (
        <>
          <Settings className="w-4 h-4 mr-2" />
          Manage Subscription
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Upgrade to Pro
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </>
      )}
    </Button>
  );
}