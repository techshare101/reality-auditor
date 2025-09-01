"use client";

import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  variant?: "default" | "truth" | "bias" | "danger" | "success" | "info";
  intensity?: "light" | "medium" | "strong";
  glow?: boolean;
  children: React.ReactNode;
  motionProps?: MotionProps;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const variants = {
  default: "bg-white/10 border-white/15 text-white",
  truth: "bg-gradient-to-br from-emerald-500/15 via-green-600/10 to-emerald-700/15 border-emerald-500/30 text-white",
  bias: "bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-amber-700/15 border-amber-500/30 text-white",
  danger: "bg-gradient-to-br from-red-500/15 via-red-600/10 to-red-700/15 border-red-500/30 text-white",
  success: "bg-gradient-to-br from-emerald-500/15 via-green-600/10 to-emerald-700/15 border-emerald-500/30 text-white",
  info: "bg-gradient-to-br from-blue-500/15 via-indigo-600/10 to-purple-700/15 border-blue-500/30 text-white"
};

const intensities = {
  light: "backdrop-blur-md",
  medium: "backdrop-blur-lg",
  strong: "backdrop-blur-xl"
};

const glowEffects = {
  default: "",
  truth: "shadow-emerald-500/20 hover:shadow-emerald-500/30",
  bias: "shadow-amber-500/20 hover:shadow-amber-500/30", 
  danger: "shadow-red-500/20 hover:shadow-red-500/30",
  success: "shadow-emerald-500/20 hover:shadow-emerald-500/30",
  info: "shadow-blue-500/20 hover:shadow-blue-500/30"
};

export function GlassCard({ 
  variant = "default",
  intensity = "medium", 
  glow = false,
  className,
  children,
  motionProps,
  ...htmlProps 
}: GlassCardProps) {
  const baseClasses = cn(
    // Base structure
    "rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300",
    // Glassmorphism
    intensities[intensity],
    variants[variant],
    // Text contrast optimization
    "[&_p]:text-white/90 [&_span]:text-white/90 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white",
    "[&_.text-gray-200]:text-white/90 [&_.text-gray-300]:text-white/80 [&_.text-gray-400]:text-white/70",
    // Glow effects
    glow && glowEffects[variant],
    // Hover effects
    "group hover:shadow-3xl hover:scale-[1.01]",
    // Custom class overrides
    className
  );

  if (motionProps) {
    return (
      <motion.div 
        className={baseClasses}
        {...motionProps}
      >
        {/* Inner gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} {...htmlProps}>
      {/* Inner gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20 pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Header component for consistent card headers
export function GlassCardHeader({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("p-6 pb-3", className)} 
      {...props}
    >
      {children}
    </div>
  );
}

// Content component for consistent card content
export function GlassCardContent({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("px-6 pb-6", className)} 
      {...props}
    >
      {children}
    </div>
  );
}

// Title component with perfect text contrast
export function GlassCardTitle({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      className={cn(
        "text-xl font-semibold text-white drop-shadow-sm", 
        className
      )} 
      {...props}
    >
      {children}
    </h3>
  );
}
