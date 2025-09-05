"use client";

import React, { useState } from 'react';
import { useRecentAudits } from '@/hooks/useRecentAudits';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { History, ArrowRight, FileText, Clock, Trash2, RefreshCw, Cloud } from 'lucide-react';

const RecentAuditsCard = React.memo(function RecentAuditsCard() {
  const { audits, loading, syncing, clearAudits, removeAudit, maxAudits, isPro, refresh } = useRecentAudits();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
          <div className="flex items-center gap-2">
            {syncing && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <Cloud className="w-3 h-3 animate-pulse" />
                <span>Syncing...</span>
              </div>
            )}
            <span className="text-sm text-white/50">
              {audits.length} of {maxAudits} max
            </span>
            {audits.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-all duration-200"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => refresh && refresh()}
              className="text-xs p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/60 transition-all duration-200"
              title="Refresh from cloud"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {audits.map((audit, index) => {
            let host = '';
            try { 
              host = audit.url ? new URL(audit.url).hostname.replace(/^www\./, '') : 'Direct paste';
            } catch { 
              host = 'Direct paste'; 
            }
            const title = audit.title || audit.summary?.substring(0, 60) + '...' || 'Untitled Audit';
            const outlet = audit.outlet || host;
            const created = new Date(audit.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const truthScore = audit.truthScore || 0;
            const badge = audit.trustBadge;
            
            return (
              <motion.div
                key={audit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <Link
                  href={`/pasted-content/${audit.id}`}
                  className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200"
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
                <button
                  onClick={() => removeAudit(audit.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-all duration-200"
                  title="Remove audit"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
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
      
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-800 rounded-xl p-4 max-w-sm w-full border border-white/10">
            <h4 className="text-white font-medium mb-2">Clear all audits?</h4>
            <p className="text-white/60 text-sm mb-4">This will remove all {audits.length} audits from your history. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  clearAudits();
                  setShowClearConfirm(false);
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all duration-200 text-sm font-medium"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default RecentAuditsCard;
