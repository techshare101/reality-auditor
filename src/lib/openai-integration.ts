import OpenAI from "openai";
import { 
  RealityAudit, 
  LensAnalysis, 
  AnalysisLens, 
  LENS_PROMPTS,
  RealityAuditSchema 
} from "./schemas";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompts for different analysis types
const SYSTEM_PROMPTS = {
  reality_auditor: `You are Reality Auditor, an expert fact-checker and bias analyst. Your job is to analyze content objectively and return structured JSON analysis.

Key principles:
- Be objective and evidence-based
- Identify specific patterns, not general claims
- Provide actionable insights
- Include confidence levels for your assessments
- Ground findings in observable evidence

Return valid JSON matching the required schema.`,

  lens_analyzer: `You are an expert content analyst. Analyze the given content through a specific analytical lens and return structured findings.

Focus on:
- Specific, observable patterns
- Evidence-based conclusions
- Clear explanations of findings
- Confidence in your analysis

Return valid JSON matching the LensAnalysis schema.`
};

// Real OpenAI-powered lens analysis
export async function runOpenAILensAnalysis(
  content: string, 
  lens: AnalysisLens,
  metadata?: any
): Promise<LensAnalysis> {
  const prompt = `${LENS_PROMPTS[lens]}

Content to analyze:
${content}

${metadata ? `Metadata: ${JSON.stringify(metadata, null, 2)}` : ''}

Return your analysis as JSON matching this schema:
{
  "lens_type": "${lens}",
  "score": number (0-10),
  "findings": string[],
  "evidence": string[],
  "confidence": number (0-1)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better performance and cost efficiency
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.lens_analyzer
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 1000
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error(`No response from OpenAI for ${lens} lens`);
    }

    const analysis = JSON.parse(analysisText);
    
    // Validate and ensure proper structure
    return {
      lens_type: lens,
      score: Math.max(0, Math.min(10, analysis.score || 5)),
      findings: Array.isArray(analysis.findings) ? analysis.findings : [],
      evidence: Array.isArray(analysis.evidence) ? analysis.evidence : [],
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5))
    };

  } catch (error) {
    console.error(`Error in OpenAI ${lens} lens analysis:`, error);
    
    // Return fallback analysis
    return {
      lens_type: lens,
      score: 5,
      findings: [`Analysis failed for ${lens} lens - using fallback`],
      evidence: ["Error occurred during analysis"],
      confidence: 0.1
    };
  }
}

// Comprehensive OpenAI reality audit
export async function runOpenAIRealityAudit(
  content: string,
  metadata?: any
): Promise<RealityAudit> {
  const auditPrompt = `You are Reality Auditor - analyze this content with extreme thoroughness.

Content:
${content}

${metadata ? `Metadata:\n${JSON.stringify(metadata, null, 2)}\n` : ''}

PROVIDE COMPREHENSIVE ANALYSIS:

🎯 TRUTH SCORE (0-10): Rate factual accuracy, evidence quality, source reliability
- 8-10: Well-supported claims, credible sources, minimal speculation
- 5-7: Mixed accuracy, some unsupported claims, questionable sources
- 0-4: Misleading claims, unreliable sources, heavy speculation

🔍 BIAS PATTERNS: Identify ALL bias techniques present:
- "loaded language" (emotionally charged words)
- "cherry-picking" (selective evidence)
- "false dichotomy" (only two options presented)
- "appeal to authority" (unqualified experts)
- "bandwagon effect" (popularity-based arguments)
- "confirmation bias" (ignoring contradicting evidence)
- "strawman argument" (misrepresenting opposing views)
- "ad hominem" (attacking person not argument)
- "hasty generalization" (broad conclusions from limited data)

❓ MISSING ANGLES: What perspectives/evidence are absent:
- Opposing viewpoints not represented
- Missing statistical context or comparisons
- Unaddressed counterarguments
- Stakeholder voices not included
- Historical context omitted
- Cost-benefit analysis missing

🔗 CITATIONS: Provide relevant URLs for fact-checking (even if not in original)

📝 SUMMARY: Detailed explanation of findings in plain English

🎭 MANIPULATION TACTICS: Identify rhetorical manipulation:
- "appeal to fear" (scare tactics)
- "false urgency" (artificial time pressure)
- "oversimplification" (complex issues made too simple)
- "emotional manipulation" (using emotions over logic)

✅ FACT CHECK RESULTS: Verify specific claims with evidence

IMPORTANT: Even neutral content should have 2-3 bias patterns and missing angles. Be thorough!

Return JSON:
{
  "truth_score": number,
  "bias_patterns": string[],
  "missing_angles": string[],
  "citations": string[],
  "summary": string,
  "confidence_level": number,
  "manipulation_tactics": string[],
  "fact_check_results": [
    {
      "claim": string,
      "verdict": "true" | "false" | "misleading" | "unverified",
      "evidence": string
    }
  ]
}`;

  try {
    console.log("🤖 Starting OpenAI reality audit...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for comprehensive analysis
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.reality_auditor
        },
        {
          role: "user",
          content: auditPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for consistent, factual analysis
      max_tokens: 2000
    });

    const auditText = response.choices[0]?.message?.content;
    if (!auditText) {
      throw new Error("No response from OpenAI");
    }

    console.log("🔍 Parsing OpenAI response...");
    console.log("📄 Raw OpenAI response:", auditText.substring(0, 500) + "...");
    
    const auditData = JSON.parse(auditText);
    console.log("📊 Parsed audit data:", JSON.stringify(auditData, null, 2));
    
    // Validate against schema
    const validatedAudit = RealityAuditSchema.parse(auditData);
    
    console.log("✅ OpenAI audit completed successfully");
    console.log("🎯 Truth Score:", validatedAudit.truth_score);
    console.log("🔍 Bias Patterns:", validatedAudit.bias_patterns.length, "patterns:", validatedAudit.bias_patterns);
    console.log("❓ Missing Angles:", validatedAudit.missing_angles.length, "angles:", validatedAudit.missing_angles);
    console.log("🏷️ Manipulation Tactics:", validatedAudit.manipulation_tactics?.length || 0);
    console.log("✅ Fact Check Results:", validatedAudit.fact_check_results?.length || 0);
    
    return validatedAudit;

  } catch (error) {
    console.error("❌ OpenAI audit failed:", error);
    
    // Return fallback audit on failure
    return {
      truth_score: 5.0,
      bias_patterns: ["Analysis error - could not complete bias detection"],
      missing_angles: ["Technical error prevented comprehensive analysis"],
      citations: [],
      summary: "An error occurred during analysis. This is a fallback result. Please try again or contact support if the issue persists.",
      confidence_level: 0.1,
      manipulation_tactics: [],
      fact_check_results: []
    };
  }
}

// Multi-draft analysis with OpenAI
export async function runOpenAIMultiDraftAnalysis(
  content: string,
  metadata?: any
): Promise<RealityAudit> {
  const lenses: AnalysisLens[] = ["truth", "bias", "manipulation", "omissions"];
  const numDrafts = 2; // Reduced to 2 for cost efficiency
  
  console.log("🚀 Starting OpenAI multi-lens analysis...");

  try {
    // Generate multiple drafts with lens analysis
    const drafts = [];
    for (let i = 0; i < numDrafts; i++) {
      console.log(`📝 Generating OpenAI draft ${i + 1}/${numDrafts}...`);
      
      const lensAnalyses: LensAnalysis[] = [];
      for (const lens of lenses) {
        console.log(`  🔬 Running OpenAI ${lens} lens...`);
        const analysis = await runOpenAILensAnalysis(content, lens, metadata);
        lensAnalyses.push(analysis);
      }
      
      // Calculate composite score
      const composite_score = lensAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / lenses.length;
      
      drafts.push({
        lens_analyses: lensAnalyses,
        composite_score,
        draft_id: `openai_draft_${i + 1}`,
        confidence: lensAnalyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / lenses.length
      });
    }

    // Select best draft based on confidence and completeness
    console.log("✅ Selecting best OpenAI draft...");
    const bestDraft = drafts.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    // Generate final comprehensive audit
    console.log("🎯 Generating final OpenAI audit...");
    return await runOpenAIRealityAudit(content, metadata);

  } catch (error) {
    console.error("❌ OpenAI multi-draft analysis failed:", error);
    
    // Fallback to single audit
    console.log("🔄 Falling back to single OpenAI audit...");
    return await runOpenAIRealityAudit(content, metadata);
  }
}
