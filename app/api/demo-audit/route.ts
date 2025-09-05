import { NextRequest, NextResponse } from "next/server";
import { AuditRequestSchema } from "@/lib/schemas";
import demoPayload from "@/lib/demoPayload";
import crypto from "crypto";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Demo variations for different content
const demoVariations = [
  {
    // Default demo response
    ...demoPayload,
    truth_score: 7.2,
    summary: "This demo audit shows a balanced article with moderate truth value. While factual claims are mostly accurate, the presentation includes subtle bias through loaded language and selective framing. Cross-referencing with multiple international sources reveals missing regional perspectives and expert counter-opinions that would provide fuller context.",
    refined_summary: "DEMO AUDIT: The analyzed content demonstrates factual accuracy in its core claims but exhibits journalistic bias through selective presentation. Key findings: accurate statistics but cherry-picked timeframes, verified expert quotes but missing dissenting voices, truthful event reporting but emotional language choices. Readers should seek additional perspectives for complete understanding.",
    trust_badge: {
      level: "moderate",
      label: "Mostly Accurate",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    confidence_level: 0.85,
    warnings: ["This is a DEMO audit - results are simulated for demonstration purposes"]
  },
  {
    // High bias demo
    ...demoPayload,
    truth_score: 4.5,
    bias_patterns: [
      "heavy emotional manipulation",
      "cherry-picked statistics", 
      "false dichotomy",
      "appeal to fear",
      "omission of contrary evidence"
    ],
    missing_angles: [
      "scientific consensus not represented",
      "economic impact analysis absent",
      "historical context completely omitted",
      "expert dissenting opinions ignored",
      "regional variations not discussed"
    ],
    manipulation_tactics: [
      "urgency creation without justification",
      "appeal to unnamed authorities",
      "selective quotation",
      "misleading visual metaphors"
    ],
    summary: "This demo audit reveals significant bias and manipulation tactics. The content relies heavily on emotional appeals while omitting crucial context and expert perspectives. Multiple fact-checking sources contradict key claims, and the selective use of statistics misrepresents the broader situation.",
    refined_summary: "DEMO AUDIT: High bias detected. The content employs multiple manipulation tactics including fear appeals and cherry-picked data. Critical context is systematically omitted, creating a misleading narrative. Independent fact-checking reveals significant inaccuracies in central claims.",
    trust_badge: {
      level: "low",
      label: "Significant Bias",
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    confidence_level: 0.91,
    fact_check_results: [
      { claim: "Statistics show 90% support", verdict: "false", evidence: "Actual polls show 45-55% range" },
      { claim: "No viable alternatives exist", verdict: "misleading", evidence: "Multiple peer-reviewed alternatives documented" },
      { claim: "Immediate action required", verdict: "unverified", evidence: "No deadline or urgency factors identified" }
    ],
    warnings: ["This is a DEMO audit - results are simulated for demonstration purposes"]
  },
  {
    // High quality demo
    ...demoPayload,
    truth_score: 8.7,
    bias_patterns: ["minor framing bias", "slight tone variance"],
    missing_angles: ["additional international perspectives could enhance completeness"],
    manipulation_tactics: [],
    summary: "This demo audit shows high-quality journalism with strong factual accuracy and minimal bias. The reporting includes diverse sources, acknowledges uncertainties, and presents multiple viewpoints. Minor improvements could include more international perspectives.",
    refined_summary: "DEMO AUDIT: Exemplary journalism detected. The content demonstrates balanced reporting with verified facts, diverse expert opinions, and transparent sourcing. Minor framing preferences noted but do not compromise overall integrity. Readers can trust this as reliable information.",
    trust_badge: {
      level: "high",
      label: "Highly Reliable",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    confidence_level: 0.93,
    fact_check_results: [
      { claim: "Policy reduces emissions by 40%", verdict: "true", evidence: "Peer-reviewed studies confirm projections" },
      { claim: "Implementation costs $2.3 billion", verdict: "true", evidence: "Budget documents verify figure" },
      { claim: "Timeline spans 5 years", verdict: "true", evidence: "Official documentation confirms schedule" }
    ],
    warnings: ["This is a DEMO audit - results are simulated for demonstration purposes"]
  }
];

// Helper to generate a hash for consistent demo variations
function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    const { content, metadata, url } = body;
    
    // Validate request
    const textInput = content?.trim();
    const urlInput = url?.trim();
    
    if (!textInput && !urlInput) {
      return NextResponse.json({ 
        error: "No content provided. Please paste text or provide a URL." 
      }, { status: 400 });
    }

    // Simulate processing delay (1-2 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Select a demo variation based on content hash
    const contentHash = hashContent(textInput || urlInput || "default");
    const hashNum = parseInt(contentHash.substring(0, 8), 16);
    const variationIndex = hashNum % demoVariations.length;
    const selectedVariation = demoVariations[variationIndex];
    
    // Add demo-specific modifications
    const demoResult = {
      ...selectedVariation,
      // Add cache-related fields to match real API
      cache_status: "demo",
      cache_source: "demo",
      processing_time: Date.now() - startTime,
      // Add transparency report
      transparency_report: {
        methodology: "DEMO MODE: This is a simulated audit for demonstration purposes",
        limitations: ["Results are pre-generated", "No actual AI analysis performed", "Citations are example URLs"],
        data_sources: ["Demo data", "Simulated patterns", "Example citations"]
      },
      // Ensure sources are included
      sources: selectedVariation.sources || [],
      // Add usage info showing it doesn't count
      usage: {
        auditsUsed: 0,
        auditsRemaining: "unlimited (demo)",
        isDemo: true
      }
    };
    
    console.log("🎭 Demo audit completed");
    console.log("📊 Selected variation:", variationIndex);
    console.log("🎯 Demo truth score:", demoResult.truth_score);
    console.log("⏱️ Demo processing time:", demoResult.processing_time, "ms");
    
    return NextResponse.json(demoResult);

  } catch (error) {
    console.error("❌ Demo audit failed:", error);
    
    return NextResponse.json(
      { error: "Demo analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "reality-auditor-demo",
    version: "1.0.0",
    mode: "demo",
    timestamp: new Date().toISOString(),
    message: "Demo endpoint for Reality Auditor - no authentication or usage tracking"
  });
}
