"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProStatus } from "@/hooks/useProStatus";
import { useAuth } from "@/contexts/AuthContext";

interface MissionBannerProps {
  isNearLimit?: boolean;
}

export default function MissionBanner({ isNearLimit = false }: MissionBannerProps) {
  const { user } = useAuth();
  const status = useProStatus(user?.uid);
  const planType = status === 'pro' ? 'pro' : 'free';
  // Different slogans based on plan type
  const freeSlogans = [
    "🛡️ Cutting through fake news noise",
    "📊 Detecting hidden bias in media",
    "🔍 Truth scanning made simple",
    "🌍 Together we fight misinformation",
    "⚡ Exposing manipulation tactics daily",
    "🎯 Your reality check starts here"
  ];

  const proSlogans = [
    "✨ Unlimited audits unlocked",
    "🚀 Welcome to Reality Auditor Pro",
    "💎 Pro member • Unlimited power",
    "🌟 Thank you for joining the mission",
    "⚡ Pro status • No limits",
    "🔥 Fighting misinformation together"
  ];

  const limitWarningSlogans = [
    "⚠️ Running low on audits",
    "📈 Upgrade for unlimited audits",
    "🎯 Almost at your audit limit"
  ];

  // Select appropriate slogans based on status
  const slogans = isNearLimit ? limitWarningSlogans : (planType === 'pro' ? proSlogans : freeSlogans);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slogans.length);
    }, 4000); // rotate every 4 seconds
    return () => clearInterval(id);
  }, [slogans.length]);

  // Dynamic styling based on plan
  const getGlowColor = () => {
    if (isNearLimit) return "from-amber-500/30 to-orange-500/30";
    if (planType === 'pro') return "from-green-500/30 to-emerald-500/30";
    return "from-indigo-500/30 to-purple-500/30";
  };

  const getTextColor = () => {
    if (isNearLimit) return "text-amber-200";
    if (planType === 'pro') return "text-green-200";
    return "text-indigo-200";
  };

  const getBgColor = () => {
    if (isNearLimit) return "bg-amber-900/40";
    if (planType === 'pro') return "bg-green-900/40";
    return "bg-indigo-900/40";
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated background glow */}
      <div className={`absolute inset-0 bg-gradient-to-r ${getGlowColor()} blur-xl animate-pulse`} />
      
      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="relative text-center"
        >
          <span 
            className={`
              inline-flex items-center px-4 py-2 
              text-sm font-semibold ${getTextColor()}
              ${getBgColor()} backdrop-blur-sm
              rounded-full border border-white/10
              shadow-lg transition-all duration-500
            `}
          >
            {/* Pulsing dot indicator */}
            <span className={`
              w-2 h-2 rounded-full mr-2
              ${planType === 'pro' ? 'bg-green-400' : 'bg-indigo-400'}
              ${isNearLimit ? 'bg-amber-400' : ''}
              animate-pulse
            `} />
            
            {slogans[index]}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Optional: Progress indicator dots */}
      <div className="flex justify-center gap-1 mt-3">
        {slogans.map((_, i) => (
          <div
            key={i}
            className={`
              h-1 transition-all duration-300
              ${i === index ? 'w-6' : 'w-1'}
              ${i === index ? getTextColor().replace('text-', 'bg-') : 'bg-white/20'}
              rounded-full
            `}
          />
        ))}
      </div>
    </div>
  );
}
