"use client";

import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Loader2 } from "lucide-react";

export default function SubscriptionBadge() {
  const { subscription, loading, isPro } = useUserSubscription();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-800">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="relative">
        <div className="px-3 py-1 text-sm rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium animate-pulse shadow-lg">
          ✨ Pro
        </div>
        <div className="absolute inset-0 bg-green-400 rounded-lg blur-xl opacity-40"></div>
      </div>
    );
  }

  return (
    <div className="px-3 py-1 text-sm rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30">
      Free (5 audits)
    </div>
  );
}
