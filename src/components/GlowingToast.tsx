"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { useEffect } from "react";

interface GlowingToastProps {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export default function GlowingToast({ 
  type, 
  title, 
  message, 
  onClose,
  duration = 5000 
}: GlowingToastProps) {
  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          glow: "from-emerald-500/40 to-green-500/40",
          bg: "bg-emerald-900/50",
          border: "border-emerald-500/50",
          text: "text-emerald-200",
          icon: CheckCircle,
          iconColor: "text-emerald-400"
        };
      case "error":
        return {
          glow: "from-red-500/40 to-rose-500/40",
          bg: "bg-red-900/50",
          border: "border-red-500/50",
          text: "text-red-200",
          icon: XCircle,
          iconColor: "text-red-400"
        };
      case "info":
      default:
        return {
          glow: "from-indigo-500/40 to-purple-500/40",
          bg: "bg-indigo-900/50",
          border: "border-indigo-500/50",
          text: "text-indigo-200",
          icon: AlertCircle,
          iconColor: "text-indigo-400"
        };
    }
  };

  const colors = getColors();
  const Icon = colors.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="fixed top-4 right-4 z-50 max-w-md"
    >
      <div className="relative overflow-hidden rounded-2xl">
        {/* Animated glow background */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${colors.glow} blur-xl animate-pulse`} 
        />
        
        {/* Main toast content */}
        <div className={`
          relative ${colors.bg} ${colors.border} border-2
          backdrop-blur-xl rounded-2xl shadow-2xl
          p-4 flex items-start gap-3
        `}>
          {/* Icon with pulse */}
          <div className="relative">
            <div className={`absolute inset-0 ${colors.iconColor} blur-lg animate-pulse`} />
            <Icon className={`relative w-6 h-6 ${colors.iconColor}`} />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${colors.text} text-lg leading-tight`}>
              {title}
            </h3>
            {message && (
              <p className={`mt-1 text-sm ${colors.text} opacity-80`}>
                {message}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              p-1 rounded-lg ${colors.text} opacity-60 
              hover:opacity-100 hover:bg-white/10 
              transition-all duration-200
            `}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.glow} origin-left`}
        />
      </div>
    </motion.div>
  );
}

// Toast Manager using React Context
import { createContext, useContext, useState, ReactNode } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

// Global toast trigger (we'll implement this with a singleton pattern)
let globalAddToast: ((toast: Omit<Toast, "id">) => void) | null = null;

export function setGlobalToastFunction(addToast: (toast: Omit<Toast, "id">) => void) {
  globalAddToast = addToast;
}

// Helper function for easy toast triggering
export const showToast = {
  success: (title: string, message?: string) => {
    if (globalAddToast) {
      globalAddToast({ type: "success", title, message });
    }
  },
  error: (title: string, message?: string) => {
    if (globalAddToast) {
      globalAddToast({ type: "error", title, message });
    }
  },
  info: (title: string, message?: string) => {
    if (globalAddToast) {
      globalAddToast({ type: "info", title, message });
    }
  },
};
