"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, Maximize2 } from "lucide-react";

interface CollapsibleTextProps {
  text: string;
  title?: string;
  maxLines?: number;
  className?: string;
  showModal?: boolean;
}

export default function CollapsibleText({ 
  text, 
  title = "Content", 
  maxLines = 4, 
  className = "",
  showModal = true 
}: CollapsibleTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModalView, setShowModalView] = useState(false);

  // Determine if text needs truncation
  const words = text.split(' ');
  const isLongText = words.length > 50; // Roughly more than 4-5 lines

  const truncatedText = isLongText && !isExpanded 
    ? words.slice(0, 50).join(' ') + '...' 
    : text;

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="relative">
          <motion.p 
            className="text-gray-100 drop-shadow-sm leading-relaxed text-base"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.05))",
              WebkitBackgroundClip: "text",
              padding: "0.25rem 0"
            }}
          >
            {truncatedText}
          </motion.p>
          
          {/* Gradient fade at bottom when collapsed */}
          {isLongText && !isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Control buttons */}
        {isLongText && (
          <div className="flex items-center gap-3 mt-4">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-colors font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Read More
                </>
              )}
            </motion.button>
            
            {showModal && (
              <motion.button
                onClick={() => setShowModalView(true)}
                className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Maximize2 className="w-4 h-4" />
                Pop-up View
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Modal View */}
      <AnimatePresence>
        {showModalView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModalView(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                <motion.button
                  onClick={() => setShowModalView(false)}
                  className="p-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="prose prose-invert prose-lg max-w-none">
                  <p className="text-gray-100 leading-relaxed text-lg whitespace-pre-wrap">
                    {text}
                  </p>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-white/10 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                <motion.button
                  onClick={() => setShowModalView(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl text-white font-semibold shadow-lg transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close Reading View
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
