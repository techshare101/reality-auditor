import { z } from "zod";

// Core Reality Audit Schema
export const RealityAuditSchema = z.object({
  truth_score: z.number().min(0).max(10).describe("Truth score from 0-10 based on factual accuracy and evidence quality"),
  bias_patterns: z.array(z.string()).describe("Identified bias patterns like loaded language, cherry-picking, etc."),
  missing_angles: z.array(z.string()).describe("Important perspectives, context, or evidence not covered"),
  citations: z.array(z.string().url()).describe("Verified source URLs that support or refute claims"),
  summary: z.string().describe("Plain English audit explaining the analysis"),
  confidence_level: z.number().min(0).max(1).describe("Confidence in the audit analysis (0-1)").optional(),
  manipulation_tactics: z.array(z.string()).describe("Specific manipulation techniques detected").optional(),
  warnings: z.array(z.string()).describe("Analysis warnings about content quality, completeness, or limitations").optional(),
  fact_check_results: z.array(z.object({
    claim: z.string(),
    verdict: z.enum(["true", "false", "misleading", "unverified"]),
    evidence: z.string()
  })).describe("Individual fact-check results for specific claims").optional(),
  cache_status: z.enum(["hit", "miss"]).describe("Whether result came from cache or was freshly generated").optional(),
  cache_source: z.enum(["redis", "memory", "none"]).describe("Which cache layer served the result").optional(),
  processing_time: z.number().describe("Time taken to process the request in milliseconds").optional()
});

// Input schema for the audit request
export const AuditRequestSchema = z.object({
  url: z.string().url().optional(),
  content: z.string().optional(),
  metadata: z.object({
    author: z.string().optional(),
    outlet: z.string().optional(),
    date: z.string().optional(),
    title: z.string().optional()
  }).optional()
}).refine(data => data.url || data.content, {
  message: "Either URL or content must be provided"
});

// Multi-lens analysis schema for internal processing
export const LensAnalysisSchema = z.object({
  lens_type: z.enum(["truth", "bias", "manipulation", "omissions"]),
  score: z.number().min(0).max(10),
  findings: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

export const MultiDraftAnalysisSchema = z.object({
  drafts: z.array(z.object({
    lens_analyses: z.array(LensAnalysisSchema),
    composite_score: z.number().min(0).max(10),
    draft_id: z.string()
  })),
  verification_scores: z.array(z.object({
    draft_id: z.string(),
    faithfulness_score: z.number().min(0).max(1),
    clarity_score: z.number().min(0).max(1),
    speculation_penalty: z.number().min(0).max(1)
  })),
  final_audit: RealityAuditSchema
});

// Type exports
export type RealityAudit = z.infer<typeof RealityAuditSchema>;
export type AuditRequest = z.infer<typeof AuditRequestSchema>;
export type LensAnalysis = z.infer<typeof LensAnalysisSchema>;
export type MultiDraftAnalysis = z.infer<typeof MultiDraftAnalysisSchema>;

// Lens types for analysis
export type AnalysisLens = "truth" | "bias" | "manipulation" | "omissions";

// UI state types
export interface AuditState {
  loading: boolean;
  error: string | null;
  data: RealityAudit | null;
  progress: number;
  currentStep: string;
}

// Analysis prompt templates
export const LENS_PROMPTS = {
  truth: `Analyze this content through a TRUTH LENS. Focus on:
- Factual accuracy of claims
- Quality and reliability of evidence
- Verifiability of statements
- Logical consistency`,
  
  bias: `Analyze this content through a BIAS LENS. Focus on:
- Loaded or emotionally charged language
- Selection bias in examples or data
- Framing effects and presentation choices
- Missing context that could change interpretation`,
  
  manipulation: `Analyze this content through a MANIPULATION LENS. Focus on:
- Rhetorical manipulation techniques
- Appeal to emotions over evidence
- False dichotomies or strawman arguments
- Bandwagon effects or appeals to popularity`,
  
  omissions: `Analyze this content through an OMISSIONS LENS. Focus on:
- Important counterarguments not addressed
- Missing stakeholder perspectives
- Absent data or evidence that should be included
- Context that would change the narrative`
} as const;
