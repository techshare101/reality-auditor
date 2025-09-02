"use client";

import { AnimatePresence } from "framer-motion";
import GlowingToast, { useToast, setGlobalToastFunction } from "./GlowingToast";
import { useEffect } from "react";

export default function ToastContainer() {
  const { toasts, removeToast, addToast } = useToast();
  
  // Set up global toast function
  useEffect(() => {
    setGlobalToastFunction(addToast);
  }, [addToast]);

  return (
    <AnimatePresence>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            top: `${(index * 120) + 20}px`,
            right: "20px",
            zIndex: 50,
          }}
        >
          <GlowingToast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </AnimatePresence>
  );
}
