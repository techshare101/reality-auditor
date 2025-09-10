// src/lib/useAuditCache.ts
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const CACHE_KEY_PREFIX = "realityauditor:audits";

export type AuditPayload = {
  url: string;
  result: any; // RealityAuditSchema
  createdAt: string;
  userId?: string; // Track which user created this
};

function getCacheKey(userId?: string) {
  return userId ? `${CACHE_KEY_PREFIX}:${userId}` : CACHE_KEY_PREFIX;
}

export function useAuditCache(initial?: AuditPayload) {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditPayload[]>(initial ? [initial] : []);

  // Load cached audits when component mounts or user changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (!user) {
      setAudits(initial ? [initial] : []);
      return;
    }

    try {
      const raw = localStorage.getItem(getCacheKey(user.uid));
      if (!raw) return;

      const allAudits = JSON.parse(raw) as AuditPayload[];
      setAudits(allAudits.filter(a => !a.userId || a.userId === user.uid));
    } catch (error) {
      console.error('Error loading cached audits:', error);
      setAudits(initial ? [initial] : []);
    }
  }, [user, initial]);

  // Save audits to localStorage whenever they change
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    
    try {
      localStorage.setItem(getCacheKey(user.uid), JSON.stringify(audits.slice(0, 5)));
    } catch (error) {
      console.error('Error saving audits to cache:', error);
    }
  }, [audits, user]);

  const addAudit = useCallback(
    (payload: Omit<AuditPayload, "createdAt" | "userId">) => {
      if (!user) return;
      
      const newAudit: AuditPayload = {
        ...payload,
        createdAt: new Date().toISOString(),
        userId: user.uid,
      };
      setAudits((prev) => [newAudit, ...prev].slice(0, 5));
    },
    [user]
  );

  const clearAudits = useCallback(() => {
    setAudits([]);
    if (user && typeof window !== "undefined") {
      try {
        localStorage.removeItem(getCacheKey(user.uid));
      } catch (error) {
        console.error('Error clearing audits cache:', error);
      }
    }
  }, [user]);

  return { audits, addAudit, clearAudits };
}
