"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData } from 'firebase/firestore';
import Link from 'next/link';

interface Audit {
  id: string;
  url?: string;
  content?: string;
  createdAt: Date;
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
}

const RecentAuditsCard = React.memo(function RecentAuditsCard() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAudits([]);
      setLoading(false);
      return;
    }

    // Set up real-time listener for user's audits
    const q = query(
      collection(db, 'audits'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const auditData: Audit[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          auditData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          } as Audit);
        });
        setAudits(auditData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching audits:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <div className="text-sm text-gray-400">Loading recent audits...</div>
      </div>
    );
  }

  if (!audits.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Recent Audits</h3>
      </div>
      <ul className="space-y-2">
        {audits.map((audit) => {
          let host = '';
          try { 
            host = audit.url ? new URL(audit.url).hostname.replace(/^www\./, '') : 'Direct paste';
          } catch { 
            host = 'Direct paste'; 
          }
          const outlet = audit.result?.sources?.[0]?.outlet || audit.metadata?.outlet || 'Unknown Source';
          const created = audit.createdAt.toLocaleString();
          const truthScore = audit.result?.truth_score || 0;
          
          return (
            <li key={audit.id} className="border-b border-white/5 pb-2 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{outlet}</div>
                  <div className="text-xs opacity-70 truncate">{host} • {created}</div>
                  <div className="text-xs mt-1">
                    Truth Score: <span className={`font-semibold ${
                      truthScore >= 7 ? 'text-green-400' : 
                      truthScore >= 4 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>{truthScore}/10</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/pasted-content/${audit.id}`}
                    className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export default RecentAuditsCard;

