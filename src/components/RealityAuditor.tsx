"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Globe, 
  FileText, 
  Wand2, 
  Link2, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  ListChecks, 
  Search,
  Eye,
  TrendingUp,
  Zap,
  Clock,
  User,
  Calendar,
  Building,
  CreditCard,
  ArrowUpRight,
  CheckCircle
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AuditBadge } from "@/components/AuditBadge";

import { RealityAudit, AuditRequest } from "@/lib/schemas";
import CollapsibleText from "@/components/CollapsibleText";
import ArticleContentCard from "@/components/ArticleContentCard";
import { useRecentAudits } from "@/hooks/useRecentAudits";
import { useAuth } from "@/contexts/AuthContext";
import { useHybridAuditLimit } from "@/hooks/useHybridAuditLimit";
import { useAuditAccess } from "@/hooks/useAuditAccess";
import { useUnifiedAuditAccess } from "@/hooks/useUnifiedAuditAccess";
import { buildSources, outletFromDomain, getRegistrableDomain } from "@/lib/outlets";
import { getWarningLevel, getDynamicWarnings } from '@/lib/warnings';
import { 
  ClaimResult as AuditClaimResult,
  getVerdictEmoji,
  getVerdictLabel,
  formatCitationDisplay
} from '@/utils/auditScoring';
import { CardHelper } from '@/components/ui/CardHelper';

const demoText = `Breaking: New policy claims to reduce emissions by 50% in two years. Officials did not release methodology. Independent analysts argue baseline year was cherry-picked and offsets account for most reductions. The policy has broad support among environmental groups but faces criticism from industry leaders who claim it will hurt the economy. No peer-reviewed studies have validated the proposed approach.`;

async function postAudit(payload: AuditRequest, authToken?: string, isDemo: boolean = false): Promise<RealityAudit | { error: string; details?: any }> {
  try {
    const headers: any = { "Content-Type": "application/json" };
    if (authToken && !isDemo) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    // Use demo endpoint if in demo mode
    const endpoint = isDemo ? "/api/demo-audit" : "/api/reality-audit";
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    
    const responseData = await res.json();
    
    if (!res.ok) {
      // Return error data for handling in component
      return { error: res.status === 402 ? 'LIMIT_EXCEEDED' : 'API_ERROR', details: responseData };
    }
    
    return responseData;
  } catch (error) {
    console.error("API call failed, using mock data:", error);
    
    // Enhanced mock result for demo
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            truth_score: 5.4,
            bias_patterns: [
              "loaded language", 
              "cherry-picked baseline", 
              "appeal to authority",
              "selective evidence presentation",
              "missing quantitative analysis"
            ],
            missing_angles: [
              "independent replication of methodology", 
              "lifecycle emissions of offsets", 
              "historical trend context",
              "economic impact assessment",
              "implementation timeline feasibility",
              "comparison with alternative policies"
            ],
            citations: [
              "https://www.reuters.com/world/europe/sample-article",
              "https://www.nytimes.com/2025/08/30/world/sample.html",
              "https://www.bbc.co.uk/news/world-sample",
              "https://www.axios.com/2025/08/30/sample",
              "https://www.politico.com/news/2025/08/30/sample-article-001",
              "https://apnews.com/article/sample-test"
            ],
            sources: buildSources([
              "https://www.reuters.com/world/europe/sample-article",
              "https://www.nytimes.com/2025/08/30/world/sample.html",
              "https://www.bbc.co.uk/news/world-sample",
              "https://www.axios.com/2025/08/30/sample",
              "https://www.politico.com/news/2025/08/30/sample-article-001",
              "https://apnews.com/article/sample-test"
            ], payload?.url),
            summary: "This content shows moderate truth value but exhibits clear bias patterns through selective presentation of evidence and loaded language. Key missing elements include comprehensive cost-benefit analysis and diverse stakeholder perspectives. While some claims are factually supported, the overall framing lacks objectivity and omits important counterarguments that would provide readers with a more complete picture.",
            confidence_level: 0.82,
            warnings: [
              "Demo content contains simulated bias patterns for testing.",
              "Full article fetch was not attempted in demo mode."
            ],
            manipulation_tactics: [
              "urgency creation without deadline justification",
              "false choice between environment and economy",
              "appeal to popular opinion"
            ],
            fact_check_results: [
              {
                claim: "50% emissions reduction target",
                verdict: "misleading",
                evidence: "Target lacks clear baseline definition and methodology"
              },
              {
                claim: "Broad environmental group support",
                verdict: "true",
                evidence: "Multiple environmental organizations have endorsed the policy"
              },
              {
                claim: "Industry criticism of economic impact",
                verdict: "true",
                evidence: "Several industry associations have published concerns"
              }
            ]
          }),
        1200 + Math.random() * 800
      )
    );
  }
}

function getTruthScoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

function getTruthScoreGradient(score: number): string {
  if (score >= 8) return "from-green-500 to-emerald-600";
  if (score >= 6) return "from-yellow-500 to-amber-600";
  if (score >= 4) return "from-orange-500 to-red-500";
  return "from-red-500 to-red-700";
}

export default function RealityAuditorApp({ initialData, demoMode }: { initialData?: any; demoMode?: boolean }) {
  const { user } = useAuth();
  const { audits_used, isProUser, loading: subscriptionLoading } = useUnifiedAuditAccess();
  
  // Derive the missing properties for backward compatibility
  const used = audits_used;
  const canAudit = isProUser || used < 5;
  const showPaywall = !isProUser && used >= 5;
  const { increment: incrementUsage } = useHybridAuditLimit(5);
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [metadata, setMetadata] = useState({
    author: "",
    outlet: "",
    date: "",
    title: ""
  });
  const [loading, setLoading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RealityAudit | null>(initialData || null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Ensure client-side only rendering for user-dependent content
  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadArticle() {
    if (!url.trim()) {
      setError("Please enter a URL to load article content.");
      return;
    }

    setLoadingArticle(true);
    setError(null);

    try {
      const response = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch article');
      }

      setContent(data.content);
      if (data.metadata) {
        setMetadata({
          title: data.metadata.title || '',
          author: data.metadata.author || '',
          outlet: data.metadata.outlet || '',
          date: data.metadata.date || ''
        });
        setShowMetadata(true);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading article:', err);
      setError(err.message || 'Failed to load article. Please try again.');
    } finally {
      setLoadingArticle(false);
    }
  }

  function openUrl() {
    if (url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function loadFromCitation(citationUrl: string) {
    const oldUrl = url;
    setUrl(citationUrl);
    
    setLoadingArticle(true);
    setError(null);

    try {
      const response = await fetch(`/api/fetch-article?url=${encodeURIComponent(citationUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch article');
      }

      setContent(data.content);
      if (data.metadata) {
        setMetadata({
          title: data.metadata.title || '',
          author: data.metadata.author || '',
          outlet: data.metadata.outlet || '',
          date: data.metadata.date || ''
        });
        setShowMetadata(true);
      }
      setData(null); // Clear previous results
      setError(null);
    } catch (err: any) {
      console.error('Error loading citation:', err);
      setError(err.message || 'Failed to load citation. Please try again.');
      setUrl(oldUrl); // Restore previous URL on error
    } finally {
      setLoadingArticle(false);
    }
  }

  // Local cache of recent audits
  const { addAudit: addRecentAudit } = useRecentAudits();

  // Listen for restore events (from RecentAuditsCard)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'realityauditor:restore' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (payload?.result) {
            setData(payload.result);
            setUrl(payload.url || '');
          }
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function onAudit() {
    // Skip limit checks for demo mode and Pro users
    if (!demoMode && !isProUser) {
      // Check hard limit only for free users
      if (showPaywall) {
        console.log(`🚫 Audit limit reached - upgrade to Pro for unlimited audits`);
        setShowUpgradePrompt(true);
        return;
      }
    }
    
    setError(null);
    setData(null);
    setProgress(0);
    
    // Clean inputs
    const textInput = content?.trim();
    const urlInput = url?.trim();
    
    // Always prioritize pasted text if available
    const contentToAudit = textInput || "";
    
    if (!contentToAudit && !urlInput) {
      setError("No article content or URL provided. Please paste text or enter a URL.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate progress steps
      const steps = [
        "Extracting content...",
        "Running truth analysis...",
        "Detecting bias patterns...",
        "Checking for manipulation...",
        "Identifying omissions...",
        "Verifying citations...",
        "Synthesizing results..."
      ];
      
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setProgress((i / (steps.length - 1)) * 100);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const auditRequest: AuditRequest = {
        // Always send text if present
        content: contentToAudit || undefined,
        // Send URL only if no text provided
        url: !contentToAudit ? urlInput : undefined,
        metadata: Object.values(metadata).some(v => v.trim()) ? metadata : undefined
      };
      
      // Get auth token from Firebase if available
      let authToken = null;
      if (user) {
        try {
          authToken = await user.getIdToken();
        } catch (err) {
          console.error('Failed to get auth token:', err);
        }
      }
      const result = await postAudit(auditRequest, authToken || undefined, demoMode);
      
      // Check if this is an error response
      if ('error' in result) {
        if (result.error === 'LIMIT_EXCEEDED' || result.details?.upgradeRequired) {
          // Show upgrade prompt instead of error
          setShowUpgradePrompt(true);
          setLoading(false);
          return;
        } else {
          // Some other API error
          setError(result.details?.error || result.error || "Audit failed. Please try again.");
          setLoading(false);
          return;
        }
      }
      
      console.log("🎯 Frontend received result:", result);
      console.log("📊 Bias patterns:", result.bias_patterns);
      console.log("❓ Missing angles:", result.missing_angles);
      console.log("🏷️ Manipulation tactics:", result.manipulation_tactics);
      console.log("⚠️ Warnings:", result.warnings);
      console.log("✅ Fact checks:", result.fact_check_results);
      console.log("📝 Summary:", result.summary?.substring(0, 100) + "...");
      setData(result);
      setProgress(100);
      setCurrentStep("Complete!");

      // Backend now handles the audit count increment automatically
      console.log(`✅ Audit complete. Backend will update count automatically.`);
      console.log(`📊 Current count: ${used}/5 (will update via Firestore listener)`);
      
      // If result shows successful non-cached audit, increment local counter for hybrid hook
      if (result.cache_status === 'miss' && user && !demoMode) {
        incrementUsage();
        console.log('📈 Incremented local usage counter');
      }

      // Save to localStorage recent audits (skip in demo mode)
      if (!demoMode && result) {
        try {
          await addRecentAudit({
            // Use Firestore ID if available, otherwise generate one
            id: result.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: auditRequest.url || url || undefined,
            content: auditRequest.content,
            result: {
              truth_score: result.truth_score,
              summary: result.summary,
              trust_badge: result.trust_badge,
              bias_patterns: result.bias_patterns,
              missing_angles: result.missing_angles,
              warnings: result.warnings,
              citations: result.citations,
              sources: result.sources,
            },
            metadata: metadata
          });
          console.log('✅ Audit saved to recent audits with ID:', result.id || 'generated');
        } catch (err) {
          console.warn('Failed to save to recent audits:', err);
        }
      }
      
      // Trigger subscription data refresh
      try {
        localStorage.setItem('audit-completed', Date.now().toString());
        // Trigger storage event for cross-component communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'audit-completed',
          newValue: Date.now().toString()
        }));
        // Also dispatch custom event for same-window updates
        window.dispatchEvent(new CustomEvent('audit-completed', {
          detail: { timestamp: Date.now() }
        }));
        console.log('🚀 Dispatched audit-completed events');
      } catch (error) {
        console.log('Could not trigger subscription refresh:', error);
      }
    } catch (e: any) {
      setError("Audit failed. Please try again.");
      console.error("Audit error:", e);
    } finally {
      setLoading(false);
    }
  }

  function tryDemo() {
    setUrl("");
    setContent(demoText);
    setMetadata({
      author: "Environmental News Team",
      outlet: "Climate Policy Daily",
      date: "2024-08-29",
      title: "New Emissions Reduction Policy Announced"
    });
    setShowMetadata(true);
    setTimeout(() => onAudit(), 100);
  }

  function clearAll() {
    setUrl("");
    setContent("");
    setMetadata({ author: "", outlet: "", date: "", title: "" });
    setData(null);
    setError(null);
    setProgress(0);
    setCurrentStep("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white p-4 md:p-8">
      {/* Demo Mode Banner */}
      {demoMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-xl border-b border-yellow-500/30"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-2xl"
              >
                🎭
              </motion.span>
              <span className="text-yellow-200 font-semibold">
                Demo Mode Active — Results are simulated for demonstration purposes
              </span>
              <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-500/30 ml-2">
                No login required
              </Badge>
            </div>
          </div>
        </motion.div>
      )}
      
      <div className="mx-auto max-w-7xl" style={{ paddingTop: demoMode ? '4rem' : '0' }}>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8"
        >
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div 
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 border border-white/20 backdrop-blur-xl shadow-2xl"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Reality Auditor Logo - will show when logo.png is added to public folder */}
              <Image
                src="/logo.png"
                alt="Reality Auditor Logo"
                width={80}
                height={80}
                className="object-cover"
                onError={(e) => {
                  // Hide image on error and show fallback
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Eye className="w-8 h-8 md:w-10 md:h-10 absolute inset-0 m-auto text-white hidden" />
            </motion.div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                Reality Auditor
              </h1>
              <p className="text-white/80 dark:text-gray-300 text-lg md:text-xl mt-2 max-w-3xl transition-colors duration-300">
                X-ray vision for media bias • See through the noise • Audit reality
              </p>
            </div>
          </div>
        </motion.div>

        {/* Audit Count / Pro Banner */}
        <div className="flex justify-center mb-6" suppressHydrationWarning>
          <AuditBadge />
        </div>

        {/* Input Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2, duration: 0.8 }}
          className="grid lg:grid-cols-5 gap-6 mb-8"
        >
          {/* URL Input */}
          <Card className="lg:col-span-2 bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Link2 className="w-5 h-5" /> 
                URL Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://example.com/article" 
                className="bg-white/5 border-white/20 focus:border-white/40 transition-all h-12 text-base" 
              />
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/20" 
                  onClick={() => setUrl("")}
                >
                  Clear
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  disabled={!url.trim()}
                  className="bg-gradient-to-r from-purple-500/20 to-indigo-600/20 hover:from-purple-500/30 hover:to-indigo-600/30 border-purple-500/30 text-purple-200 hover:scale-105 transition-all disabled:opacity-40" 
                  onClick={openUrl}
                >
                  <Link2 className="w-4 h-4 mr-1" />
                  Open Link
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  disabled={!url.trim() || loadingArticle}
                  className="bg-gradient-to-r from-green-500/20 to-teal-600/20 hover:from-green-500/30 hover:to-teal-600/30 border-green-500/30 text-green-200 hover:scale-105 transition-all disabled:opacity-40" 
                  onClick={loadArticle}
                >
                  {loadingArticle ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-1" />
                      Load Article
                    </>
                  )}
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/20" 
                  onClick={() => setShowMetadata(!showMetadata)}
                >
                  {showMetadata ? "Hide" : "Show"} Metadata
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content Input - Enhanced Article Content Card */}
          <ArticleContentCard
            content={content}
            setContent={setContent}
            onAudit={onAudit}
            onTryDemo={tryDemo}
            onClearAll={clearAll}
            loading={loading}
            error={error}
          />
        </motion.div>

        {/* Metadata Panel */}
        <AnimatePresence>
          {showMetadata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="w-5 h-5" />
                    Metadata (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-base text-white/70 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Author
                      </label>
                      <Input
                        value={metadata.author}
                        onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                        placeholder="Jane Doe"
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-base text-white/70 flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        Outlet
                      </label>
                      <Input
                        value={metadata.outlet}
                        onChange={(e) => setMetadata(prev => ({ ...prev, outlet: e.target.value }))}
                        placeholder="News Outlet"
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-base text-white/70 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Date
                      </label>
                      <Input
                        value={metadata.date}
                        onChange={(e) => setMetadata(prev => ({ ...prev, date: e.target.value }))}
                        placeholder="2024-08-29"
                        type="date"
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-base text-white/70 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Title
                      </label>
                      <Input
                        value={metadata.title}
                        onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Article Title"
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <Zap className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">Running Reality Audit</p>
                      <p className="text-white/70">{currentStep}</p>
                    </div>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-3 bg-white/10"
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {data && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="space-y-6"
            >
              {/* Cache Status Badge */}
              {(data.cache_status || data.processing_time || demoMode) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex justify-between mb-4"
                >
                  {/* Demo Mode Indicator */}
                  {demoMode && (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="flex items-center gap-2"
                    >
                      <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-200 border-yellow-500/30 shadow-yellow-500/20 shadow-sm">
                        🎭 Demo Result — Simulated for demonstration
                      </Badge>
                    </motion.div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {data.cache_status === "hit" && (
                      <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-200 border-green-500/30 shadow-green-500/20 shadow-sm">
                        ⚡ Cache Hit ({data.cache_source})
                      </Badge>
                    )}
                    {data.cache_status === "miss" && (
                      <Badge className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-200 border-blue-500/30 shadow-blue-500/20 shadow-sm">
                        🤖 Fresh Analysis
                      </Badge>
                    )}
                    {data.processing_time && (
                      <Badge className="bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-200 border-slate-500/30">
                        ⏱️ {data.processing_time}ms
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Truth Score & Key Metrics */}
              <div className={`grid gap-6 ${data.warnings && data.warnings.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {/* Warnings Card - Dynamic based on confidence */}
                {(() => {
                  const confidence = (data.confidence_level || 0) * 100;
                  const warningLevel = getWarningLevel(confidence);
                  const dynamicWarnings = getDynamicWarnings({
                    confidence,
                    factCheckResults: data.fact_check_results,
                    citations: data.citations,
                    missingAngles: data.missing_angles
                  });
                  
                  // Always show warnings card with dynamic content
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 150 }}
                    >
                      <Card className={`bg-gradient-to-br ${warningLevel.color} ${warningLevel.borderColor} backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 group/warning hover:${warningLevel.bgGlow}`}>
                        <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, -10, 10, 0] 
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 2, 
                              ease: "easeInOut" 
                            }}
                            className={`p-2 rounded-xl bg-gradient-to-br ${warningLevel.color} border ${warningLevel.borderColor}`}
                          >
                            <span className="text-2xl">{warningLevel.icon}</span>
                          </motion.div>
                          <span className={`bg-gradient-to-r ${warningLevel.color} bg-clip-text text-transparent font-bold`}>
                            {confidence >= 90 ? 'Verification' : 'Warnings'}
                          </span>
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-32 overflow-y-auto custom-scrollbar">
                            {dynamicWarnings.map((warning, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r ${warningLevel.color} border ${warningLevel.borderColor} backdrop-blur-sm hover:shadow-lg hover:${warningLevel.bgGlow} transition-all duration-200 group`}
                              >
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className={`w-2 h-2 rounded-full ${warningLevel.iconColor} flex-shrink-0 mt-1`}
                                />
                                <span className={`${warningLevel.textColor} text-base font-medium group-hover:opacity-90 transition-colors leading-relaxed`}>
                                  {warning}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })()}

                {/* Truth Score - Enhanced with Stunning Animation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 150 }}
                >
                  <Card className={`
                    backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 group/truth
                    ${data.truth_score >= 8 ? 'bg-gradient-to-br from-emerald-500/15 via-green-600/10 to-emerald-700/15 border-emerald-500/30 truth-glow' : 
                      data.truth_score >= 6 ? 'bg-gradient-to-br from-amber-500/15 via-yellow-600/10 to-amber-700/15 border-amber-500/30' :
                      data.truth_score >= 4 ? 'bg-gradient-to-br from-orange-500/15 via-red-600/10 to-orange-700/15 border-orange-500/30' :
                      'bg-gradient-to-br from-red-500/15 via-red-600/10 to-red-700/15 border-red-500/30 danger-glow'}
                  `}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between gap-3 text-xl">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 10, -10, 0] 
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: data.truth_score >= 8 ? 3 : 4, 
                              ease: "easeInOut" 
                            }}
                            className="p-2 rounded-xl bg-white/10 border border-white/20"
                          >
                            <ShieldCheck className="w-5 h-5" /> 
                          </motion.div>
                          <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Truth Score</span>
                        </div>
                        <CardHelper 
                          message="Score reflects verified facts vs. unverified/biased claims. Neutral (5/10) when evidence is missing."
                          tone="neutral"
                        />
                        
                        {/* Trust Badge */}
                        {(data as any).trust_badge && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                            className="ml-auto"
                          >
                            <Badge className={`bg-gradient-to-r ${(data as any).trust_badge.color} text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg`}>
                              <span className="mr-1">{(data as any).trust_badge.icon}</span>
                              {(data as any).trust_badge.label}
                            </Badge>
                          </motion.div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      {/* Floating background particles */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div
                          animate={{ x: [-10, 10, -10], y: [-5, 5, -5] }}
                          transition={{ repeat: Infinity, duration: 8 }}
                          className="absolute top-2 right-4 w-2 h-2 bg-blue-400/30 rounded-full blur-sm"
                        />
                        <motion.div
                          animate={{ x: [10, -5, 10], y: [5, -10, 5] }}
                          transition={{ repeat: Infinity, duration: 6 }}
                          className="absolute bottom-4 left-3 w-1 h-1 bg-purple-400/40 rounded-full blur-sm"
                        />
                      </div>
                      
                      {/* Animated Score Display */}
                      <div className="relative z-10">
                        <motion.div 
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                          className={`text-5xl font-black mb-3 ${getTruthScoreColor(data.truth_score)} relative`}
                        >
                          <motion.span
                            animate={{ 
                              textShadow: data.truth_score >= 8 ? [
                                '0 0 10px rgba(34, 197, 94, 0.5)',
                                '0 0 20px rgba(34, 197, 94, 0.8)', 
                                '0 0 10px rgba(34, 197, 94, 0.5)'
                              ] : [
                                '0 0 5px currentColor',
                                '0 0 10px currentColor',
                                '0 0 5px currentColor'
                              ]
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            {data.truth_score.toFixed(1)}
                          </motion.span>
                          <span className="text-white/60 text-2xl font-normal ml-1">/10</span>
                        </motion.div>
                        
                        {/* Animated Progress Bar */}
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                          className="relative mb-4"
                        >
                          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(data.truth_score / 10) * 100}%` }}
                              transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
                              className={`h-full rounded-full bg-gradient-to-r ${getTruthScoreGradient(data.truth_score)} relative overflow-hidden`}
                            >
                              <motion.div
                                animate={{ x: [-100, 300] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-20 skew-x-12"
                              />
                            </motion.div>
                          </div>
                        </motion.div>
                        
                        <motion.p 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1, duration: 0.5 }}
                          className="text-sm text-white/70 group-hover/truth:text-white/90 transition-colors"
                        >
                          Multi-lens AI verification
                        </motion.p>
                        
                        {data.confidence_level !== undefined && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.2, duration: 0.4 }}
                            className="mt-3 flex items-center gap-2"
                          >
                            <div className="flex items-center gap-1">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 3 }}
                                className="w-2 h-2 rounded-full bg-blue-400"
                              />
                              <span className="text-xs text-white/60 group-hover/truth:text-white/80 transition-colors">
                                Confidence: 
                                <motion.span 
                                  className={`font-semibold ${
                                    (data.confidence_level * 100) >= 90 ? 'text-green-300' :
                                    (data.confidence_level * 100) >= 60 ? 'text-yellow-300' :
                                    'text-orange-300'
                                  }`}
                                  animate={{ opacity: [0.7, 1, 0.7] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                >
                                  {(data.confidence_level * 100).toFixed(0)}%
                                </motion.span>
                                <span className="ml-1 text-white/50">
                                  {(data.confidence_level * 100) >= 90 ? ' ✅ High' :
                                   (data.confidence_level * 100) >= 60 ? ' ⚠️ Medium' :
                                   ' ❓ Low'}
                                </span>
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bias Patterns */}
                <Card className="bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-2 text-2xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-7 h-7" /> 
                        Bias Patterns
                      </div>
                      <CardHelper 
                        message="Bias patterns show how framing may shape perception. More patterns = higher bias risk."
                        tone={data.bias_patterns.length > 3 ? "warning" : "neutral"}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                      {data.bias_patterns.length === 0 ? (
                        <p className="text-white/70 text-base">No significant bias patterns detected.</p>
                      ) : (
                        data.bias_patterns.map((pattern, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/5 border border-orange-500/20 backdrop-blur-sm hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 group"
                          >
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                            <span className="text-white text-base font-medium group-hover:text-orange-100 transition-colors leading-relaxed">
                              {pattern}
                            </span>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Missing Angles */}
                <Card className="bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-2 text-2xl">
                      <div className="flex items-center gap-2">
                        <Search className="w-7 h-7" /> 
                        Missing Angles
                      </div>
                      <CardHelper 
                        message="Missing context or counterpoints. If these angles aren't covered, the piece may be one-sided."
                        tone={data.missing_angles.length > 2 ? "warning" : "neutral"}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                      {data.missing_angles.length === 0 ? (
                        <p className="text-white/70 text-base">No obvious gaps identified.</p>
                      ) : (
                        data.missing_angles.map((angle, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 group"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                            <span className="text-white text-base font-medium group-hover:text-blue-100 transition-colors leading-relaxed">
                              {angle}
                            </span>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Analysis - Enhanced with Stunning Animations */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="space-y-6"
              >
                {/* Manipulation Tactics & Fact Checks Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Manipulation Tactics - Danger Zone */}
                  {data.manipulation_tactics && data.manipulation_tactics.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -30, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: 0.5, duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                      <GlassCard variant="danger" intensity="medium" className="hover:shadow-red-500/10 transition-all duration-300 group">
                        <GlassCardHeader className="pb-3">
                          <GlassCardTitle className="flex items-center justify-between gap-3 text-xl">
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={{ rotate: [0, -5, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="p-2 rounded-xl bg-red-500/20 border border-red-500/30"
                              >
                                <AlertTriangle className="w-5 h-5 text-red-400" /> 
                              </motion.div>
                              Manipulation Tactics
                            </div>
                            <CardHelper 
                              message="Rhetorical tactics (like exaggeration or appeals to fear) may sway readers emotionally."
                              tone="danger"
                            />
                          </GlassCardTitle>
                        </GlassCardHeader>
                        <GlassCardContent>
                          <div className="space-y-3 max-h-44 overflow-y-auto custom-scrollbar">
                            {data.manipulation_tactics.map((tactic, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ 
                                  delay: 0.6 + i * 0.1, 
                                  duration: 0.5,
                                  type: "spring",
                                  stiffness: 200
                                }}
                                whileHover={{ scale: 1.02, x: 4 }}
                                className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20 backdrop-blur-sm group/item hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                  <p className="text-white text-base font-medium group-hover/item:text-red-100 transition-colors">{tactic}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </GlassCardContent>
                      </GlassCard>
                    </motion.div>
                  )}

                  {/* Fact Check Results - Truth Verification with Citations */}
                  {data.fact_check_results && data.fact_check_results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 30, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: 0.6, duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                      <GlassCard variant="info" intensity="medium" className="hover:shadow-blue-500/10 transition-all duration-300">
                        <GlassCardHeader className="pb-3">
                          <GlassCardTitle className="flex items-center justify-between gap-3 text-xl">
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30"
                              >
                                <ListChecks className="w-5 h-5 text-blue-400" /> 
                              </motion.div>
                              Fact Verification
                            </div>
                            <CardHelper 
                              message='"Unverified" ≠ false — it means no clear evidence found in available sources.'
                              tone="warning"
                            />
                          </GlassCardTitle>
                        </GlassCardHeader>
                        <GlassCardContent>
                          <div className="space-y-4 max-h-44 overflow-y-auto custom-scrollbar">
                            {(() => {
                              // Process fact checks with citations
                              const processedChecks = data.fact_check_results.map((check, index) => {
                                const citation = data.citations?.[index];
                                return {
                                  ...check,
                                  citation,
                                  footnote: citation ? index + 1 : undefined
                                };
                              });
                              
                              return processedChecks.map((check, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ 
                                    delay: 0.7 + i * 0.15, 
                                    duration: 0.5,
                                    type: "spring",
                                    stiffness: 150
                                  }}
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 backdrop-blur-sm hover:shadow-lg transition-all duration-200 group/fact"
                                >
                                  <div className="flex items-center gap-3 mb-3">
                                    <motion.div
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ delay: 0.8 + i * 0.1, type: "spring", stiffness: 200 }}
                                    >
                                      <Badge 
                                        className={
                                          check.verdict === 'true' 
                                            ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-200 border-emerald-500/40 shadow-emerald-500/20 shadow-sm' :
                                          check.verdict === 'false' 
                                            ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-200 border-red-500/40 shadow-red-500/20 shadow-sm' :
                                          check.verdict === 'misleading' 
                                            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/40 shadow-amber-500/20 shadow-sm' :
                                          'bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-200 border-slate-500/40'
                                        }
                                      >
                                        <motion.span
                                          animate={{ opacity: [0.7, 1, 0.7] }}
                                          transition={{ repeat: Infinity, duration: 2 }}
                                        >
                                          {getVerdictEmoji(check.verdict as any)} {getVerdictLabel(check.verdict as any)}
                                        </motion.span>
                                      </Badge>
                                    </motion.div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm text-white leading-relaxed group-hover/fact:text-white transition-colors">
                                      <span className="text-white/60 text-xs uppercase tracking-wider">CLAIM:</span><br />
                                      <span className="font-medium">
                                        {check.claim}
                                        {check.citation && (
                                          <a
                                            href={check.citation}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-1 text-blue-400 hover:text-blue-300 text-xs align-super"
                                            title={formatCitationDisplay(check.citation)}
                                          >
                                            [{check.footnote}]
                                          </a>
                                        )}
                                      </span>
                                    </p>
                                    <p className="text-xs text-white/80 leading-relaxed group-hover/fact:text-white transition-colors">
                                      <span className="text-white/60 uppercase tracking-wider">EVIDENCE:</span><br />
                                      {check.evidence}
                                    </p>
                                  </div>
                                </motion.div>
                              ));
                            })()}
                          </div>
                        </GlassCardContent>
                      </GlassCard>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Summary & Citations */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Summary */}
                <GlassCard variant="info" intensity="medium" className="md:col-span-2 hover:shadow-indigo-500/10 transition-all duration-300">
                  <GlassCardHeader className="pb-3">
                    <GlassCardTitle className="flex items-center justify-between gap-2 text-xl">
                      <div className="flex items-center gap-2">
                        <Globe className="w-6 h-6" /> 
                        Audit Summary
                      </div>
                      <CardHelper 
                        message="The summary condenses the article's main claims while highlighting manipulation, bias, and missing angles detected in the audit."
                        tone="neutral"
                      />
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <CollapsibleText 
                        text={(data as any).refined_summary || data.summary} 
                        title="Audit Summary" 
                        className=""
                      />
                    </motion.div>
                  </GlassCardContent>
                </GlassCard>

                {/* Sources */}
                <Card className="bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
                  <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-xl">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-6 h-6" /> 
                      Sources
                    </div>
                    <CardHelper 
                      message="Citations link directly to original reporting or external verification for transparency."
                      tone="neutral"
                    />
                  </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                      {(() => {
                        const rawSources = (data as any)?.sources as Array<{ url: string; outlet: string }> | undefined;
                        let sources: Array<{ url: string; outlet: string }> = [];
                        if (Array.isArray(rawSources) && rawSources.length > 0) {
                          sources = rawSources;
                        } else {
                          const seen = new Set<string>();
                          const out: Array<{ url: string; outlet: string }> = [];
                          // Include the user-submitted URL as "Original Source" when present
                          if (url && typeof url === 'string' && url.trim()) {
                            try {
                              const oHost = new URL(url).hostname;
                              const oDomain = getRegistrableDomain(oHost);
                              if (!seen.has(oDomain)) {
                                seen.add(oDomain);
                                out.push({ url, outlet: 'Original Source' });
                              }
                            } catch {}
                          }
                          // Add citations, deduped by registrable domain
                          for (const u of (data?.citations || [])) {
                            try {
                              const host = new URL(u).hostname;
                              const domain = getRegistrableDomain(host);
                              if (seen.has(domain)) continue;
                              seen.add(domain);
                              out.push({ url: u, outlet: outletFromDomain(host) });
                            } catch {}
                          }
                          sources = out;
                        }
                        if (!sources || sources.length === 0) {
                          return <p className="text-white/70 text-sm">No verified citations available.</p>;
                        }
                        const visible = showAllSources ? sources : sources.slice(0, 5);
                        return (
                          <>
                            {visible.map((s, i) => {
                              const domain = (() => {
                                try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return s.url; }
                              })();
                              const isOriginal = s.outlet === 'Original Source';
                              return (
                                <motion.div
                                  key={`${s.url}-${i}`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="group"
                                >
                                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white/5 to-white/2 border border-white/10 hover:bg-white/10 transition-all">
                                    <Globe className="w-4 h-4 text-indigo-300 group-hover:text-indigo-200 flex-shrink-0" />
                                    <a href={s.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 hover:underline decoration-indigo-300/50">
                                      <div className="text-sm font-semibold text-white truncate">
                                        {s.outlet}{isOriginal ? ' (user submitted)' : ''}
                                      </div>
                                      <div className="text-xs text-indigo-300 truncate">{domain}</div>
                                    </a>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(s.url, '_blank', 'noopener,noreferrer');
                                        }}
                                        className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-600/20 hover:from-purple-500/30 hover:to-indigo-600/30 border border-purple-500/30 text-purple-200 transition-all"
                                        title="Open in new tab"
                                      >
                                        <Link2 className="w-3 h-3" />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          loadFromCitation(s.url);
                                        }}
                                        disabled={loadingArticle}
                                        className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-teal-600/20 hover:from-green-500/30 hover:to-teal-600/30 border border-green-500/30 text-green-200 transition-all disabled:opacity-40"
                                        title="Load into article pane"
                                      >
                                        {loadingArticle ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <FileText className="w-3 h-3" />
                                        )}
                                      </motion.button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                            {sources.length > 5 && (
                              <div className="pt-1">
                                <button
                                  onClick={() => setShowAllSources((v) => !v)}
                                  className="text-xs text-indigo-300 hover:text-indigo-200 underline"
                                >
                                  {showAllSources ? 'Show Less' : `+ Show More (${sources.length - 5})`}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upgrade Prompt Modal */}
        <AnimatePresence>
          {showUpgradePrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowUpgradePrompt(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 border border-white/20 rounded-3xl shadow-2xl max-w-md w-full p-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Icon and Title */}
                <div className="text-center mb-6">
                  <motion.div
                    animate={{ 
                      rotate: [0, -10, 10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 3,
                      ease: "easeInOut" 
                    }}
                    className="inline-flex p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 mb-4"
                  >
                    <Zap className="w-12 h-12 text-amber-300" />
                  </motion.div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent mb-2">
                    Audit Limit Reached
                  </h2>
                  <p className="text-white/80 text-lg">
                    You've used all your free audits this month!
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="p-1 rounded-lg bg-green-500/20">
                      <Clock className="w-5 h-5 text-green-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Unlimited Audits</p>
                      <p className="text-white/60 text-sm">Audit as many articles as you need</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="p-1 rounded-lg bg-blue-500/20">
                      <TrendingUp className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Priority Processing</p>
                      <p className="text-white/60 text-sm">Get faster results with dedicated resources</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="p-1 rounded-lg bg-purple-500/20">
                      <Sparkles className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Advanced Features</p>
                      <p className="text-white/60 text-sm">Access deeper analysis and insights</p>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="text-center mb-6">
                  <p className="text-white/60 mb-2">Starting at just</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">$19</span>
                    <span className="text-white/60">/month</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/create-checkout-session", {
                          method: "POST",
                        });
                        const { url } = await res.json();
                        if (url) {
                          window.location.href = url; // Direct to Stripe checkout
                        }
                      } catch (err) {
                        console.error("Upgrade redirect failed:", err);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
                    size="lg"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Upgrade Now
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    onClick={() => setShowUpgradePrompt(false)}
                    variant="outline"
                    className="border-white/20 hover:bg-white/10"
                    size="lg"
                  >
                    Maybe Later
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span className="text-sm text-white/70">
              Powered by MetalMindTech • AgentForge Kernel • {new Date().getFullYear()}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
