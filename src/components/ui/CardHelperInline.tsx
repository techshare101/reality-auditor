"use client";

import { Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface CardHelperInlineProps {
  message: string;
  tone?: "neutral" | "warning" | "danger" | "success";
  defaultOpen?: boolean;
}

export function CardHelperInline({ 
  message, 
  tone = "neutral",
  defaultOpen = false 
}: CardHelperInlineProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toneStyles = {
    neutral: {
      button: "text-gray-400 hover:text-gray-300 bg-gray-500/10 hover:bg-gray-500/20",
      helper: "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    warning: {
      button: "text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20",
      helper: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    danger: {
      button: "text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20",
      helper: "bg-red-500/20 text-red-300 border-red-500/30"
    },
    success: {
      button: "text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20",
      helper: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    }
  };

  const styles = toneStyles[tone];

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${styles.button} cursor-pointer transition-all duration-200`}
      >
        <Info size={14} className="flex-shrink-0" />
        <span className="text-xs font-medium">Info</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="helper"
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}
              className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${styles.helper} backdrop-blur-md border shadow-md`}
            >
              <Info className="h-3 w-3 shrink-0 opacity-80" />
              <span className="leading-snug">{message}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
