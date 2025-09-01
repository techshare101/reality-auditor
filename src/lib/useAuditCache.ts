// src/lib/useAuditCache.ts
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const CACHE_KEY_PREFIX = "realityauditor:audits";

export type AuditPayload = {
  url: string;
  result: any; // RealityAuditSchema
  createdAt: string;
  userId?: string; // Track which user created this
};

export function useAuditCache(initial?: AuditPayload) {
  const { user } = useAuth();
  const cacheKey = user ? `${CACHE_KEY_PREFIX}:${user.uid}` : CACHE_KEY_PREFIX;
  
  const [audits, setAudits] = useState<AuditPayload[]>(() => {
    if (typeof window !== "undefined" && user) {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        try {
          // Filter to only show current user's audits
          const allAudits = JSON.parse(raw) as AuditPayload[];
          return allAudits.filter(a => !a.userId || a.userId === user.uid);
        } catch {
          return [];
        }
      }
    }
    return initial ? [initial] : [];
  });

  // Re-load audits when user changes
  useEffect(() => {
    if (!user) {
      setAudits([]);
      return;
    }
    
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      try {
        const allAudits = JSON.parse(raw) as AuditPayload[];
        setAudits(allAudits.filter(a => !a.userId || a.userId === user.uid));
      } catch {
        setAudits([]);
      }
    }
  }, [user?.uid, cacheKey]);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(audits.slice(0, 5)));
      } catch {}
    }
  }, [audits, cacheKey, user]);

  function addAudit(payload: Omit<AuditPayload, "createdAt" | "userId">) {
    if (!user) return;
    
    const newAudit: AuditPayload = {
      ...payload,
      createdAt: new Date().toISOString(),
      userId: user.uid,
    };
    setAudits((prev) => [newAudit, ...prev].slice(0, 5));
  }

  function clearAudits() {
    setAudits([]);
    if (user) {
      try { localStorage.removeItem(cacheKey); } catch {}
    }
  }

  return { audits, addAudit, clearAudits };
}

