"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

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
  createdAt: string | Date | Timestamp; // ISO string for localStorage
  userId?: string;
  userEmail?: string;
  localOnly?: boolean; // flag for audits not yet synced to Firestore
  biasPatterns?: string[];
  missingAngles?: string[];
  warnings?: string[];
  citations?: any[];
}

const STORAGE_KEY = 'reality_auditor_recent_audits';
const MAX_AUDITS_FREE = 5;
const MAX_AUDITS_PRO = 50;

export function useRecentAudits() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Determine if user is Pro (you can enhance this with your actual Pro check)
  const isPro = user?.email === 'valentin2v2000@gmail.com' || false;
  const maxAudits = isPro ? MAX_AUDITS_PRO : MAX_AUDITS_FREE;

  // Sync with Firestore
  const syncWithFirestore = async (uid: string) => {
    setSyncing(true);
    try {
      const auditsRef = collection(db, 'audits');
      const q = query(
        auditsRef,
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(maxAudits)
      );
      
      const snapshot = await getDocs(q);
      const firestoreAudits: AuditRecord[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      })) as AuditRecord[];

      if (firestoreAudits.length > 0) {
        // Merge with local audits (prefer Firestore version if IDs match)
        const localAudits = audits.filter(a => a.localOnly);
        const firestoreIds = new Set(firestoreAudits.map(a => a.id));
        const uniqueLocalAudits = localAudits.filter(a => !firestoreIds.has(a.id));
        
        const mergedAudits = [...firestoreAudits, ...uniqueLocalAudits]
          .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
          .slice(0, maxAudits);
        
        setAudits(mergedAudits);
        const storageKey = `${STORAGE_KEY}_${uid}`;
        localStorage.setItem(storageKey, JSON.stringify(mergedAudits));
        console.log(`✅ Synced ${firestoreAudits.length} audits from Firestore`);
      }
    } catch (error) {
      console.error('❌ Firestore sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Load audits from localStorage on mount
  useEffect(() => {
    const loadAudits = async () => {
      try {
        const storageKey = user ? `${STORAGE_KEY}_${user.uid}` : STORAGE_KEY;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsedAudits = JSON.parse(stored);
          // Sort by date (newest first) and limit
          const sortedAudits = parsedAudits
            .sort((a: AuditRecord, b: AuditRecord) => 
              new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
            )
            .slice(0, maxAudits);
          
          setAudits(sortedAudits);
        }
        
        // Sync with Firestore if user is logged in
        if (user?.uid && db) {
          await syncWithFirestore(user.uid);
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
  const addAudit = useCallback(async (auditData: {
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
      bias_patterns?: string[];
      missing_angles?: string[];
      warnings?: string[];
      citations?: any[];
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
      biasPatterns: auditData.result?.bias_patterns,
      missingAngles: auditData.result?.missing_angles,
      warnings: auditData.result?.warnings,
      citations: auditData.result?.citations,
      createdAt: new Date().toISOString(),
      userId: user?.uid,
      userEmail: user?.email || undefined,
      localOnly: !user?.uid // Mark as local-only if not logged in
    };

    // Update state immediately
    setAudits(prev => {
      // Add new audit at the beginning and limit
      const updated = [newAudit, ...prev].slice(0, maxAudits);
      return updated;
    });

    // Save to Firestore in background (if logged in)
    if (user?.uid && db) {
      try {
        const docRef = doc(db, 'audits', newAudit.id);
        await setDoc(docRef, {
          ...newAudit,
          createdAt: serverTimestamp(),
          localOnly: false,
        });
        console.log('✅ Audit saved to Firestore:', newAudit.id);
        
        // Update local record to remove localOnly flag
        setAudits(prev => 
          prev.map(audit => 
            audit.id === newAudit.id ? { ...audit, localOnly: false } : audit
          )
        );
      } catch (error) {
        console.error('❌ Firestore save failed:', error);
        // Keep the audit locally even if Firestore fails
      }
    }

    return newAudit;
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
    syncing,
    addAudit,
    removeAudit,
    clearAudits,
    getAuditById,
    maxAudits,
    isPro,
    refresh: () => user?.uid && syncWithFirestore(user.uid),
  };
}
