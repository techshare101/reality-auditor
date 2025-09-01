// src/lib/useAuditCache.ts
import { useEffect, useState } from "react";

const CACHE_KEY = "realityauditor:audits";

export type AuditPayload = {
  url: string;
  result: any; // RealityAuditSchema
  createdAt: string;
};

export function useAuditCache(initial?: AuditPayload) {
  const [audits, setAudits] = useState<AuditPayload[]>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as AuditPayload[];
        } catch {
          return [];
        }
      }
    }
    return initial ? [initial] : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(audits.slice(0, 5)));
    } catch {}
  }, [audits]);

  function addAudit(payload: Omit<AuditPayload, "createdAt">) {
    const newAudit: AuditPayload = {
      ...payload,
      createdAt: new Date().toISOString(),
    };
    setAudits((prev) => [newAudit, ...prev].slice(0, 5));
  }

  function clearAudits() {
    setAudits([]);
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }

  return { audits, addAudit, clearAudits };
}

