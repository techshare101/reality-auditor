'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import AuditResult from '@/components/AuditResult';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRecentAudits } from '@/hooks/useRecentAudits';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function AuditDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { getAuditById } = useRecentAudits();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAudit() {
      try {
        // 1. First try to get from cache
        const cachedAudit = getAuditById(params.id);
        
        if (cachedAudit) {
          console.log('✅ Loaded audit from cache:', params.id);
          setAudit({
            id: cachedAudit.id,
            url: cachedAudit.url,
            result: {
              truth_score: cachedAudit.truthScore,
              summary: cachedAudit.summary,
              trust_badge: cachedAudit.trustBadge,
              bias_patterns: cachedAudit.biasPatterns || [],
              missing_angles: cachedAudit.missingAngles || [],
              warnings: cachedAudit.warnings || [],
              citations: cachedAudit.citations || [],
              sources: cachedAudit.sources || [],
            },
            metadata: {
              title: cachedAudit.title,
              outlet: cachedAudit.outlet,
            },
            createdAt: cachedAudit.createdAt,
          });
          setLoading(false);
          return;
        }

        // 2. If not in cache and user is logged in, try Firestore
        if (user && db) {
          console.log('🔍 Fetching audit from Firestore:', params.id);
          const docRef = doc(db, 'audits', params.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check if the audit belongs to the current user
            if (data.userId && data.userId !== user.uid) {
              setError('You do not have permission to view this audit.');
              setLoading(false);
              return;
            }
            
            setAudit({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
            });
          } else {
            setError('Audit not found.');
          }
        } else if (!user) {
          setError('Please log in to view this audit.');
        } else {
          setError('Audit not found in your recent audits.');
        }
      } catch (err) {
        console.error('Error loading audit:', err);
        setError('Failed to load audit. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadAudit();
  }, [params.id, user, getAuditById]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!audit) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <div className="space-y-6">
          {/* Title and metadata */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-2">
              {audit.metadata?.title || 'Reality Audit'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{audit.metadata?.outlet || 'Unknown source'}</span>
              {audit.url && (
                <>
                  <span>•</span>
                  <a 
                    href={audit.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-gray-200 underline"
                  >
                    View original
                  </a>
                </>
              )}
              <span>•</span>
              <span>{new Date(audit.createdAt).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Render the audit result */}
          <AuditResult data={audit.result} url={audit.url} />
        </div>
      </div>
    </div>
  );
}
