"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, startAfter, onSnapshot, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";
import { History, ArrowLeft, ArrowRight, Clock, Search, Filter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const AUDITS_PER_PAGE = 10;

export default function AuditsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Initial load
    loadAudits();
  }, [user, router]);

  const loadAudits = async (loadMore = false) => {
    if (!user) return;

    setLoading(true);
    try {
      let q = query(
        collection(db, "audits"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(AUDITS_PER_PAGE)
      );

      if (loadMore && lastDoc) {
        q = query(
          collection(db, "audits"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(AUDITS_PER_PAGE)
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newAudits: Audit[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newAudits.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          } as Audit);
        });

        if (loadMore) {
          setAudits(prev => [...prev, ...newAudits]);
        } else {
          setAudits(newAudits);
        }

        setHasMore(newAudits.length === AUDITS_PER_PAGE);
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error loading audits:", error);
      setLoading(false);
    }
  };

  const filteredAudits = audits.filter(audit => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const title = audit.metadata?.title || audit.result?.summary || "";
    const outlet = audit.metadata?.outlet || audit.result?.sources?.[0]?.outlet || "";
    return title.toLowerCase().includes(searchLower) || outlet.toLowerCase().includes(searchLower);
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white">
      <div className="px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
              Audit History
            </h1>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Search audits by title or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Audits Grid */}
          {loading && audits.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-white/10 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredAudits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FileText className="w-16 h-16 mx-auto text-white/20 mb-4" />
              <p className="text-xl text-white/50 mb-2">
                {searchTerm ? "No audits found matching your search" : "No audits yet"}
              </p>
              <p className="text-white/30">
                {searchTerm ? "Try a different search term" : "Start auditing articles to see them here"}
              </p>
            </motion.div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredAudits.map((audit, index) => {
                  let host = "";
                  try {
                    host = audit.url ? new URL(audit.url).hostname.replace(/^www\./, "") : "Direct paste";
                  } catch {
                    host = "Direct paste";
                  }
                  const title = audit.metadata?.title || audit.result?.summary?.substring(0, 80) + "..." || "Untitled Audit";
                  const outlet = audit.result?.sources?.[0]?.outlet || audit.metadata?.outlet || host;
                  const created = new Date(audit.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  const truthScore = audit.result?.truth_score || 0;
                  const badge = audit.result?.trust_badge;

                  return (
                    <motion.div
                      key={audit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/pasted-content/${audit.id}`}
                        className="block p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200 group h-full"
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-white group-hover:text-indigo-300 transition-colors line-clamp-2 flex-1">
                              {title}
                            </h3>
                            {badge && (
                              <span className="text-3xl flex-shrink-0" title={badge.level}>
                                {badge.emoji}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-white/60 mb-3">
                            <span>{outlet}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{created}</span>
                            </div>
                          </div>

                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 text-sm">Truth Score:</span>
                              <span className={`text-2xl font-bold ${
                                truthScore >= 7 ? "text-green-400" : 
                                truthScore >= 4 ? "text-yellow-400" : 
                                "text-red-400"
                              }`}>
                                {truthScore}/10
                              </span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-indigo-400 transition-colors" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-center"
                >
                  <Button
                    onClick={() => loadAudits(true)}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30"
                  >
                    Load More Audits
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
