import { 
  calculateTruthScore, 
  calculateConfidence, 
  calculateDynamicConfidence,
  processFactCheckResults,
  Verdict,
  ClaimResult as AuditClaimResult,
  getConfidenceStyle,
  getConfidenceBadge
} from '@/utils/auditScoring';

export type ClaimVerdict = "true" | "false" | "unverified" | "misleading";

export interface ClaimResult {
  claim: string;
  verdict: string;
  evidence: string;
}

export interface AuditData {
  truth_score: number;
  bias_patterns?: string[];
  manipulation_tactics?: string[];
  missing_angles?: string[];
  citations?: string[];
  summary: string;
  fact_check_results?: ClaimResult[];
  confidence_level?: number;
}

export interface TrustBadge {
  level: 'verified' | 'partial' | 'limited' | 'manipulated';
  icon: string;
  label: string;
  color: string;
  description: string;
}

/**
 * Adjusts truth score based on detected issues
 */
export function adjustTruthScore(data: AuditData): number {
  let score = data.truth_score || 0;
  
  // Track all penalties for transparency
  const penalties: string[] = [];

  // Penalty: Clickbait or misleading tactics
  const clickbaitTactics = ['clickbait', 'misleading headline', 'sensationalism'];
  const hasClickbait = data.manipulation_tactics?.some(tactic => 
    clickbaitTactics.some(ct => tactic.toLowerCase().includes(ct))
  );
  
  if (hasClickbait) {
    score = Math.min(score, 7); // cap at 7
    penalties.push('Clickbait detected (-3 cap)');
  }

  // Penalty: Missing Angles
  if (data.missing_angles && data.missing_angles.length > 0) {
    const penalty = Math.min(2, data.missing_angles.length);
    score -= penalty;
    penalties.push(`Missing ${data.missing_angles.length} key angles (-${penalty})`);
  }

  // Penalty: Bias Patterns
  if (data.bias_patterns && data.bias_patterns.length > 0) {
    const penalty = Math.min(3, data.bias_patterns.length);
    score -= penalty;
    penalties.push(`${data.bias_patterns.length} bias patterns (-${penalty})`);
  }

  // Penalty: No citations
  if (!data.citations || data.citations.length === 0) {
    score -= 2;
    penalties.push('No verifiable sources (-2)');
  } else if (data.citations.length < 3) {
    score -= 1;
    penalties.push('Limited sources (-1)');
  }

  // Fact check based scoring - now using balanced formula!
  if (data.fact_check_results && data.fact_check_results.length > 0) {
    // Use our balanced scoring formula
    const verdicts = data.fact_check_results.map(r => r.verdict.toLowerCase() as Verdict);
    const factBasedScore = calculateTruthScore(verdicts);
    
    // Count verdict types for transparency
    let trueCount = 0;
    let falseCount = 0;
    let misleadingCount = 0;
    let unverifiedCount = 0;
    
    for (const verdict of verdicts) {
      switch (verdict) {
        case 'true': trueCount++; break;
        case 'unverified': unverifiedCount++; break;
        case 'misleading': misleadingCount++; break;
        case 'false': falseCount++; break;
      }
    }
    
    // Average with original score for balanced result
    const weightedScore = (score + factBasedScore) / 2;
    
    // Update score and add transparency
    const adjustment = weightedScore - score;
    score = weightedScore;
    
    penalties.push(
      `Fact checks: ${trueCount} TRUE, ${unverifiedCount} UNVERIFIED, ${misleadingCount} MISLEADING, ${falseCount} FALSE (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)})`
    );
  }

  // Boundaries
  score = Math.max(0, Math.min(10, score));

  // Store penalties for transparency
  (data as any).score_penalties = penalties;

  return score;
}

/**
 * Builds a refined, human-readable summary that includes warnings
 */
export function buildRefinedSummary(data: AuditData): string {
  const parts: string[] = [];

  // Base summary (keep it concise)
  if (data.summary) {
    // Take first 2 sentences of base summary
    const sentences = data.summary.match(/[^.!?]+[.!?]+/g) || [];
    parts.push(sentences.slice(0, 2).join(' ').trim());
  }

  // Critical warnings first
  const warnings: string[] = [];

  // Manipulation tactics
  if (data.manipulation_tactics && data.manipulation_tactics.length > 0) {
    const tactics = data.manipulation_tactics.slice(0, 3).join(', ');
    warnings.push(`⚠️ Manipulation detected: ${tactics}`);
  }

  // Bias patterns
  if (data.bias_patterns && data.bias_patterns.length > 0) {
    const biases = data.bias_patterns.slice(0, 2).join(', ');
    warnings.push(`📊 Shows bias: ${biases}`);
  }

  // Missing critical information
  if (data.missing_angles && data.missing_angles.length > 0) {
    const missing = data.missing_angles.slice(0, 2).join(', ');
    warnings.push(`❓ Missing: ${missing}`);
  }

  // No sources warning
  if (!data.citations || data.citations.length === 0) {
    warnings.push('🚨 No verifiable sources provided');
  }

  // Add warnings to summary
  if (warnings.length > 0) {
    parts.push(warnings.join('. '));
  }

  // Trust recommendation
  const trustScore = adjustTruthScore(data);
  if (trustScore < 4) {
    parts.push('⛔ Exercise extreme caution with this content.');
  } else if (trustScore < 7) {
    parts.push('⚡ Verify key claims independently.');
  }

  return parts.join(' ').substring(0, 500); // Keep under 500 chars
}

/**
 * Determines trust badge based on audit results
 */
export function getTrustBadge(data: AuditData): TrustBadge {
  const adjustedScore = adjustTruthScore(data);
  const sourceCount = data.citations?.length || 0;
  const hasManipulation = data.manipulation_tactics && data.manipulation_tactics.length > 0;
  const failedFactChecks = data.fact_check_results?.filter(fc => 
    fc.verdict === 'false' || fc.verdict === 'misleading'
  ).length || 0;

  // Manipulated content
  if (hasManipulation && (adjustedScore < 4 || failedFactChecks > 2)) {
    return {
      level: 'manipulated',
      icon: '🚨',
      label: 'Manipulated',
      color: 'from-red-600 to-red-700',
      description: 'Contains deliberate manipulation or misinformation'
    };
  }

  // Limited verification
  if (sourceCount === 0 || adjustedScore < 5) {
    return {
      level: 'limited',
      icon: '⚠️',
      label: 'Limited Verification',
      color: 'from-amber-600 to-orange-600',
      description: 'Insufficient sources or evidence for verification'
    };
  }

  // Partial verification
  if (sourceCount < 3 || adjustedScore < 7 || (data.missing_angles?.length || 0) > 2) {
    return {
      level: 'partial',
      icon: '🔍',
      label: 'Partially Verified',
      color: 'from-yellow-600 to-amber-600',
      description: 'Some claims verified but gaps remain'
    };
  }

  // Fully verified
  return {
    level: 'verified',
    icon: '✅',
    label: 'Well Sourced',
    color: 'from-green-600 to-emerald-600',
    description: `Verified with ${sourceCount}+ credible sources`
  };
}

/**
 * Builds a transparency report showing how the score was calculated
 */
export function buildTransparencyReport(data: AuditData): string[] {
  const report: string[] = [];
  const originalScore = data.truth_score;
  const adjustedScore = adjustTruthScore(data);
  
  report.push(`Started with base accuracy: ${originalScore.toFixed(1)}/10`);
  
  // Add all penalties from the adjustment
  const penalties = (data as any).score_penalties || [];
  penalties.forEach((penalty: string) => report.push(`• ${penalty}`));
  
  report.push(`Final truth score: ${adjustedScore.toFixed(1)}/10`);
  
  return report;
}

// calculateTruthScore is now imported from @/utils/auditScoring

// Enhanced confidence calculation using dynamic claim status
export function calculateConfidenceLevel(data: AuditData): number {
  const factCheckResults = data.fact_check_results;
  if (!factCheckResults || factCheckResults.length === 0) return 50;
  
  // Convert fact check results to ClaimResult format for dynamic calculation
  const claimResults: AuditClaimResult[] = factCheckResults.map((fc, index) => {
    // Determine verification status based on verdict and evidence
    let status: "verified" | "unverified" | "partial";
    const hasExternalSource = fc.evidence && 
      (fc.evidence.includes('http') || fc.evidence.includes('www'));
    
    if (hasExternalSource && (fc.verdict === "true" || fc.verdict === "false")) {
      status = "verified";
    } else if (fc.verdict === "misleading" || (hasExternalSource && fc.verdict === "unverified")) {
      status = "partial";
    } else {
      status = "unverified";
    }
    
    return {
      verdict: fc.verdict as Verdict,
      claim: fc.claim,
      evidence: fc.evidence,
      citation: data.citations?.[index],
      status
    };
  });
  
  // Use the dynamic confidence calculation
  return calculateDynamicConfidence(claimResults);
}

/**
 * Get confidence level label based on percentage
 */
export function getConfidenceLabel(confidence: number): { label: string; icon: string; color: string } {
  const style = getConfidenceStyle(confidence);
  return { 
    label: style.label.replace(' Confidence', ''), 
    icon: style.icon, 
    color: style.color 
  };
}

// Re-export the new helper functions for convenience
export { getConfidenceStyle, getConfidenceBadge } from '@/utils/auditScoring';
