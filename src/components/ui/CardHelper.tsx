"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface CardHelperProps {
  message: string;
  tone?: "neutral" | "warning" | "danger" | "success";
  className?: string;
}

export function CardHelper({ message, tone = "neutral", className = "" }: CardHelperProps) {
  const colorMap = {
    neutral: "text-gray-400 hover:text-gray-300",
    warning: "text-yellow-400 hover:text-yellow-300",
    danger: "text-red-400 hover:text-red-300",
    success: "text-green-400 hover:text-green-300",
  };

  const bgMap = {
    neutral: "bg-gray-500/10",
    warning: "bg-yellow-500/10",
    danger: "bg-red-500/10",
    success: "bg-green-500/10",
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${bgMap[tone]} ${colorMap[tone]} cursor-help transition-all duration-200 ${className}`}
          >
            <Info size={14} className="flex-shrink-0" />
            <span className="text-xs font-medium">Info</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs text-xs p-3 bg-gray-900/95 border-gray-700 backdrop-blur-xl"
          sideOffset={5}
        >
          <p className="leading-relaxed">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
