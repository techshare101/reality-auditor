"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArticleContentCardProps {
  content: string;
  setContent: (content: string) => void;
  onAudit: () => void;
  onTryDemo: () => void;
  onClearAll: () => void;
  loading: boolean;
  error: string | null;
}

export default function ArticleContentCard({
  content,
  setContent,
  onAudit,
  onTryDemo,
  onClearAll,
  loading,
  error
}: ArticleContentCardProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongContent = content.length > 800;

  return (
    <>
      {/* Glassmorphic Card Container */}
      <div className="lg:col-span-3 p-6 rounded-3xl bg-white/10 dark:bg-gray-900/20 border border-white/15 dark:border-gray-700/30 backdrop-blur-xl shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white drop-shadow-sm">
              Article / Transcript Content
            </h3>
          </div>
          
          {/* Preview Button */}
          {content && (
            <motion.button
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500/20 to-indigo-600/20 hover:from-purple-500/30 hover:to-indigo-600/30 border border-purple-500/30 text-purple-200 rounded-lg transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="w-4 h-4" />
              Preview
            </motion.button>
          )}
        </div>

        {/* SOLID Background Textarea - PERFECT READABILITY */}
        <div className="relative mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste article text, news content, or meeting transcript..."
            className={`
              w-full 
              ${isExpanded ? 'h-80' : 'h-48'}
              max-h-96
              p-4 
              rounded-xl
              border-2
              resize-none
              transition-all duration-200
              text-base leading-relaxed
              overflow-y-auto
              
              /* SOLID BACKGROUNDS - NO BLUR ON TEXT */
              bg-white dark:bg-gray-900
              text-gray-900 dark:text-gray-100
              border-gray-300 dark:border-gray-600
              
              /* FOCUS STATES */
              focus:border-indigo-500 dark:focus:border-indigo-400
              focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20
              focus:outline-none
              
              /* PLACEHOLDER */
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            `}
          />
          
          {/* Expand/Collapse Toggle */}
          {isLongContent && (
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute bottom-3 right-3 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isExpanded ? '↑ Show Less' : '↓ Expand'}
            </motion.button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Button 
            onClick={onAudit} 
            className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0 shadow-lg transition-all duration-200"
            disabled={loading || (!content.trim())}
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"
                />
                Auditing...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Audit Reality
              </>
            )}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={onTryDemo} 
            className="flex-1 h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-200"
            disabled={loading}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mr-2"
            >
              ✨
            </motion.div>
            Try Demo
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClearAll} 
            className="h-12 border-white/20 hover:bg-white/10 text-white transition-all duration-200"
            disabled={loading}
          >
            Clear All
          </Button>
        </div>
        
        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-white drop-shadow-sm">{error}</span>
          </motion.div>
        )}
      </div>

      {/* Full-Screen Reading Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl max-w-5xl max-h-[90vh] overflow-hidden w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <Eye className="w-6 h-6 text-indigo-600" />
                  Article Preview
                </h3>
                <motion.button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </motion.button>
              </div>
              
              {/* Modal Content - PERFECTLY READABLE */}
              <div className="p-8 overflow-y-auto max-h-[70vh] bg-white dark:bg-gray-900 custom-scrollbar">
                <div className="prose prose-gray dark:prose-invert prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed text-lg">
                    {content || (
                      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                        <p>No content to preview...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
                  <span>📝 {content.length} characters</span>
                  <span>📊 {content.split(/\s+/).filter(w => w.length > 0).length} words</span>
                  <span>⏱️ ~{Math.ceil(content.split(/\s+/).filter(w => w.length > 0).length / 200)} min read</span>
                </div>
                <Button
                  onClick={() => setShowPreviewModal(false)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                >
                  Close Preview
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
