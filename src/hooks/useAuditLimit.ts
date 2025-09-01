"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const AUDIT_COUNT_KEY = "realityauditor:auditCount";
const LAST_RESET_KEY = "realityauditor:lastReset";

export function useAuditLimit(limit: number = 5) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [lastReset, setLastReset] = useState<string | null>(null);

  // Get the current month key (YYYY-MM)
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Load count from localStorage
  useEffect(() => {
    const storedCount = localStorage.getItem(AUDIT_COUNT_KEY);
    const storedReset = localStorage.getItem(LAST_RESET_KEY);
    const currentMonth = getCurrentMonthKey();

    // Reset if it's a new month
    if (storedReset !== currentMonth) {
      localStorage.setItem(AUDIT_COUNT_KEY, "0");
      localStorage.setItem(LAST_RESET_KEY, currentMonth);
      setCount(0);
      setLastReset(currentMonth);
      console.log("🔄 Monthly audit count reset");
    } else {
      setCount(storedCount ? parseInt(storedCount, 10) : 0);
      setLastReset(storedReset);
    }
  }, []);

  // Increment the count
  const increment = useCallback(() => {
    const newCount = count + 1;
    setCount(newCount);
    localStorage.setItem(AUDIT_COUNT_KEY, newCount.toString());
    console.log(`📈 Local audit count: ${newCount}/${limit}`);
    return newCount;
  }, [count, limit]);

  // Force reset (for testing or after upgrade)
  const reset = useCallback(() => {
    setCount(0);
    const currentMonth = getCurrentMonthKey();
    localStorage.setItem(AUDIT_COUNT_KEY, "0");
    localStorage.setItem(LAST_RESET_KEY, currentMonth);
    setLastReset(currentMonth);
    console.log("🔄 Audit count manually reset");
  }, []);

  // Check if user has a paid subscription (bypass limit)
  const hasPaidPlan = useCallback(() => {
    // This will be updated when subscription status is properly loaded
    // For now, we'll just check if user exists and trust the backend
    return false; // Force everyone through the limit for safety
  }, [user]);

  const isOverLimit = count >= limit && !hasPaidPlan();
  const remaining = Math.max(0, limit - count);
  const percentUsed = (count / limit) * 100;

  return {
    count,
    limit,
    remaining,
    percentUsed,
    increment,
    reset,
    isOverLimit,
    canAudit: !isOverLimit,
    hasPaidPlan: hasPaidPlan()
  };
}
