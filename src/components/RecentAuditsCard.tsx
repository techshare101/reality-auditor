"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData } from 'firebase/firestore';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { History, ArrowRight, FileText, Clock } from 'lucide-react';

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

    console.log('🔍 Setting up audit listener for user:', user.uid);
    
    // First, try a simple query without ordering to see if we get any audits
    const simpleQuery = query(
      collection(db, 'audits'),
      where('userId', '==', user.uid),
      limit(5)
    );
    
    // Try the simple query first to debug
    console.log('🔍 Trying simple query first (no ordering)...');
    
    // Set up real-time listener for user's audits
    const q = query(
      collection(db, 'audits'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📊 Received audit snapshot:', snapshot.size, 'documents');
        const auditData: Audit[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📄 Audit doc:', doc.id, data);
          auditData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          } as Audit);
        });
        // Sort by createdAt manually if we get results
        auditData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAudits(auditData.slice(0, 5)); // Take top 5
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error fetching audits with ordering:', error);
        // Check if it's an index error
        if (error.message?.includes('index') || error.message?.includes('requires an index')) {
          console.error('🔥 Firestore index required, trying fallback query without ordering...');
          
          // Fallback: Try without ordering and sort manually
          const fallbackUnsubscribe = onSnapshot(simpleQuery,
            (snapshot) => {
              console.log('📊 Fallback query succeeded! Got', snapshot.size, 'documents');
              const auditData: Audit[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('📄 Fallback audit doc:', doc.id, data);
                auditData.push({
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate() || new Date()
                } as Audit);
              });
              // Sort manually in JavaScript
              auditData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              setAudits(auditData.slice(0, 5)); // Take top 5
              setLoading(false);
            },
            (fallbackError) => {
              console.error('❌ Fallback query also failed:', fallbackError);
              setLoading(false);
            }
          );
          
          // Return the fallback unsubscribe function
          return () => fallbackUnsubscribe();
        } else {
          // Some other error
          console.error('❌ Non-index error:', error);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-3xl bg-white/10 border-white/15 backdrop-blur-xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <History className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Recent Audits
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (!audits.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-3xl bg-white/10 border-white/15 backdrop-blur-xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <History className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Recent Audits
          </h3>
        </div>
        <div className="text-center py-8">
          <FileText className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-white/50">No audits yet</p>
          <p className="text-sm text-white/30 mt-1">Start by auditing an article above!</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="rounded-3xl bg-white/10 border-white/15 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              <History className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Recent Audits
            </h3>
          </div>
          <span className="text-sm text-white/50">
            Last 5 audits
          </span>
        </div>
        
        <div className="space-y-3">
          {audits.map((audit, index) => {
            let host = '';
            try { 
              host = audit.url ? new URL(audit.url).hostname.replace(/^www\./, '') : 'Direct paste';
            } catch { 
              host = 'Direct paste'; 
            }
            const title = audit.metadata?.title || audit.result?.summary?.substring(0, 60) + '...' || 'Untitled Audit';
            const outlet = audit.result?.sources?.[0]?.outlet || audit.metadata?.outlet || host;
            const created = new Date(audit.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const truthScore = audit.result?.truth_score || 0;
            const badge = audit.result?.trust_badge;
            
            return (
              <motion.div
                key={audit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/pasted-content/${audit.id}`}
                  className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                        <span>{outlet}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{created}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {badge && (
                        <span className="text-2xl" title={badge.level}>
                          {badge.emoji}
                        </span>
                      )}
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          truthScore >= 7 ? 'text-green-400' : 
                          truthScore >= 4 ? 'text-yellow-400' : 
                          'text-red-400'
                        }`}>
                          {truthScore}/10
                        </div>
                        <div className="text-xs text-white/50">Truth Score</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        
        {/* View All Audits Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 pt-4 border-t border-white/10"
        >
          <Link
            href="/audits"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-all duration-200 group"
          >
            <span className="text-sm font-medium">View All Audits</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
});

export default RecentAuditsCard;

