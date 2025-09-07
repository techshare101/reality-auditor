"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldCheck, AlertTriangle, Info, CheckCircle, XCircle, 
  Brain, Globe, Search, Shield, TrendingUp, Link2,
  BarChart, Activity, AlertCircle, Zap
} from "lucide-react";
import CollapsibleText from "./CollapsibleText";

interface AuditResultProps {
  data: any;
  url?: string;
}

// Helper functions
const getTruthScoreColor = (score: number) => {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
};

const getWarningLevel = (confidence: number) => {
  if (confidence >= 90) {
    return {
      color: 'from-emerald-500/20 to-green-600/20',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-200',
      iconColor: 'bg-emerald-400',
      bgGlow: 'shadow-emerald-500/20',
      icon: '✅'
    };
  } else if (confidence >= 75) {
    return {
      color: 'from-blue-500/20 to-indigo-600/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-200',
      iconColor: 'bg-blue-400',
      bgGlow: 'shadow-blue-500/20',
      icon: 'ℹ️'
    };
  } else if (confidence >= 50) {
    return {
      color: 'from-amber-500/20 to-yellow-600/20',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-200',
      iconColor: 'bg-amber-400',
      bgGlow: 'shadow-amber-500/20',
      icon: '⚠️'
    };
  } else {
    return {
      color: 'from-red-500/20 to-rose-600/20',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-200',
      iconColor: 'bg-red-400',
      bgGlow: 'shadow-red-500/20',
      icon: '⚡'
    };
  }
};

const getDynamicWarnings = (data: any) => {
  const warnings: string[] = [];
  const confidence = data.confidence || 0;

  if (confidence >= 90) {
    warnings.push("High confidence in verification");
    if (data.factCheckResults?.verifiedFacts > 5) {
      warnings.push(`${data.factCheckResults.verifiedFacts} facts cross-verified`);
    }
  } else if (confidence >= 75) {
    warnings.push("Article appears mostly reliable");
    warnings.push("Minor claims need verification");
  } else if (confidence >= 50) {
    warnings.push("Several unverified claims detected");
    if (data.missingAngles?.length > 0) {
      warnings.push(`${data.missingAngles.length} perspectives missing`);
    }
  } else {
    warnings.push("Multiple red flags detected");
    warnings.push("Critical facts unverified");
    if (data.citations?.total < 3) {
      warnings.push("Insufficient source citations");
    }
  }

  return warnings.slice(0, 3);
};

export default function AuditResult({ data, url }: AuditResultProps) {
  if (!data) return null;

  const confidence = (data.confidence_level || 0) * 100;
  const warningLevel = getWarningLevel(confidence);
  const dynamicWarnings = getDynamicWarnings({
    confidence,
    factCheckResults: data.fact_check_results,
    citations: data.citations,
    missingAngles: data.missing_angles
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.1, duration: 0.6 }}
      className="space-y-6"
    >
      {/* Cache Status Badge */}
      {(data.cache_status || data.processing_time) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex justify-end mb-4"
        >
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
      <div className="grid gap-6 md:grid-cols-3">
        {/* Warnings Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 150 }}
        >
          <Card className={`bg-gradient-to-br ${warningLevel.color} ${warningLevel.borderColor} backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-300`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="text-2xl">{warningLevel.icon}</span>
                <span className={`bg-gradient-to-r ${warningLevel.color} bg-clip-text text-transparent font-bold`}>
                  {confidence >= 90 ? 'Verification' : 'Warnings'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dynamicWarnings.map((warning, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r ${warningLevel.color} border ${warningLevel.borderColor}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${warningLevel.iconColor} flex-shrink-0 mt-1`} />
                    <span className={`${warningLevel.textColor} text-base font-medium`}>
                      {warning}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Truth Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 150 }}
        >
          <Card className={`
            backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-300
            ${data.truth_score >= 8 ? 'bg-gradient-to-br from-emerald-500/15 via-green-600/10 to-emerald-700/15 border-emerald-500/30' : 
              data.truth_score >= 6 ? 'bg-gradient-to-br from-amber-500/15 via-yellow-600/10 to-amber-700/15 border-amber-500/30' :
              data.truth_score >= 4 ? 'bg-gradient-to-br from-orange-500/15 via-red-600/10 to-orange-700/15 border-orange-500/30' :
              'bg-gradient-to-br from-red-500/15 via-red-600/10 to-red-700/15 border-red-500/30'}
          `}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <ShieldCheck className="w-5 h-5" />
                <span>Truth Score</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-5xl font-black mb-3 ${getTruthScoreColor(data.truth_score)}`}>
                {data.truth_score.toFixed(1)}
                <span className="text-white/60 text-2xl font-normal ml-1">/10</span>
              </div>
              <Progress 
                value={data.truth_score * 10} 
                className="h-3 bg-white/10"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Confidence Level */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 150 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/15 via-indigo-600/10 to-purple-700/15 border-purple-500/30 backdrop-blur-xl rounded-3xl shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Brain className="w-5 h-5" />
                <span>Confidence</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black mb-3 text-purple-400">
                {Math.round(confidence)}%
              </div>
              <Progress 
                value={confidence} 
                className="h-3 bg-white/10"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Analysis */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Activity className="w-6 h-6" />
            Main Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CollapsibleText text={data.main_analysis || 'No analysis available'} title="Main Analysis" />
        </CardContent>
      </Card>

      {/* Fact Check Results */}
      {data.fact_check_results && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Search className="w-6 h-6" />
              Fact Check Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.fact_check_results.map((fact: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  {fact.verified ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium mb-1">{fact.claim}</p>
                    <p className="text-sm text-white/70">{fact.source || fact.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bias Analysis */}
      {data.bias_analysis && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <BarChart className="w-6 h-6" />
              Bias Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Detected Biases:</h4>
                <div className="flex flex-wrap gap-2">
                  {data.bias_analysis.types?.map((bias: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-white/10 border-white/20">
                      {bias}
                    </Badge>
                  ))}
                </div>
              </div>
              {data.bias_analysis.explanation && (
                <div>
                  <h4 className="font-semibold mb-2">Explanation:</h4>
                  <CollapsibleText text={data.bias_analysis.explanation || 'No explanation available'} title="Bias Analysis" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Angles */}
      {data.missing_angles && data.missing_angles.length > 0 && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Globe className="w-6 h-6" />
              Missing Perspectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.missing_angles.map((angle: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                  <span className="text-white/80">{angle}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {data.action_items && data.action_items.length > 0 && (
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border-indigo-500/30 backdrop-blur-xl rounded-3xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <TrendingUp className="w-6 h-6" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.action_items.map((item: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-indigo-400 font-semibold">{index + 1}.</span>
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Original Link */}
      {url && (
        <div className="flex justify-center pt-4">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
          >
            <Link2 className="w-4 h-4" />
            View Original Article
          </a>
        </div>
      )}
    </motion.div>
  );
}
