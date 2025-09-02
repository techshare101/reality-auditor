"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditRecord {
  id: string;
  url?: string;
  content?: string;
  title?: string;
  summary?: string;
  truthScore?: number;
  trustBadge?: {
    level: string;
    emoji: string;
  };
  outlet?: string;
  sources?: Array<{ outlet: string; url: string }>;
  createdAt: string; // ISO string for localStorage
  userId?: string;
  userEmail?: string;
}

const STORAGE_KEY = 'reality_auditor_recent_audits';
const MAX_AUDITS_FREE = 5;
const MAX_AUDITS_PRO = 50;

export function useRecentAudits() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine if user is Pro (you can enhance this with your actual Pro check)
  const isPro = user?.email === 'valentin2v2000@gmail.com' || false;
  const maxAudits = isPro ? MAX_AUDITS_PRO : MAX_AUDITS_FREE;

  // Load audits from localStorage on mount
  useEffect(() => {
    const loadAudits = () => {
      try {
        const storageKey = user ? `${STORAGE_KEY}_${user.uid}` : STORAGE_KEY;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsedAudits = JSON.parse(stored);
          // Sort by date (newest first) and limit
          const sortedAudits = parsedAudits
            .sort((a: AuditRecord, b: AuditRecord) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, maxAudits);
          
          setAudits(sortedAudits);
        }
      } catch (err) {
        console.error('Failed to parse audits from localStorage:', err);
        setAudits([]);
      } finally {
        setLoading(false);
      }
    };

    loadAudits();
  }, [user, maxAudits]);

  // Save audits to localStorage whenever they change
  useEffect(() => {
    if (!loading && user) {
      const storageKey = `${STORAGE_KEY}_${user.uid}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(audits));
      } catch (err) {
        console.error('Failed to save audits to localStorage:', err);
      }
    }
  }, [audits, user, loading]);

  // Add a new audit
  const addAudit = useCallback((auditData: {
    id: string;
    url?: string;
    content?: string;
    result?: {
      truth_score?: number;
      summary?: string;
      trust_badge?: {
        level: string;
        emoji: string;
      };
      sources?: Array<{ outlet: string; url: string }>;
    };
    metadata?: {
      title?: string;
      outlet?: string;
    };
  }) => {
    const newAudit: AuditRecord = {
      id: auditData.id,
      url: auditData.url,
      content: auditData.content,
      title: auditData.metadata?.title,
      summary: auditData.result?.summary,
      truthScore: auditData.result?.truth_score,
      trustBadge: auditData.result?.trust_badge,
      outlet: auditData.metadata?.outlet || 
        (auditData.url ? new URL(auditData.url).hostname.replace(/^www\./, '') : 'Direct paste'),
      sources: auditData.result?.sources,
      createdAt: new Date().toISOString(),
      userId: user?.uid,
      userEmail: user?.email || undefined
    };

    setAudits(prev => {
      // Add new audit at the beginning and limit
      const updated = [newAudit, ...prev].slice(0, maxAudits);
      return updated;
    });
  }, [user, maxAudits]);

  // Remove a specific audit
  const removeAudit = useCallback((auditId: string) => {
    setAudits(prev => prev.filter(audit => audit.id !== auditId));
  }, []);

  // Clear all audits
  const clearAudits = useCallback(() => {
    setAudits([]);
    if (user) {
      const storageKey = `${STORAGE_KEY}_${user.uid}`;
      localStorage.removeItem(storageKey);
    }
  }, [user]);

  // Get audit by ID
  const getAuditById = useCallback((id: string) => {
    return audits.find(audit => audit.id === id);
  }, [audits]);

  return {
    audits,
    loading,
    addAudit,
    removeAudit,
    clearAudits,
    getAuditById,
    maxAudits,
    isPro
  };
}
