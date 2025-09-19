/**
 * Centralized Audit Scoring System
 * Provides balanced truth scoring and confidence calculations
 */

export type Verdict = "true" | "false" | "unverified" | "misleading";

export interface ClaimResult {
  verdict: Verdict;
  claim: string;
  evidence?: string;
  citation?: string; // URL to external source
  footnote?: number; // for summary footnote refs (1-based)
  status?: "verified" | "unverified" | "partial"; // Track verification status
}

export interface AuditResult {
  truthScore: number;
  confidence: number;
  claimResults: ClaimResult[];
  biasPatterns: string[];
  manipulationTactics: string[];
  missingAngles: string[];
  summary: string;
  citations: string[]; // All unique citations
}

/**
 * Balanced Truth Score Formula:
 * - TRUE       = 1.0
 * - UNVERIFIED = 0.5
 * - MISLEADING = 0.25
 * - FALSE      = 0
 * 
 * Result is scaled to 0-10
 */
export function calculateTruthScore(verdicts: Verdict[]): number {
  if (!verdicts || verdicts.length === 0) return 5.0; // Default to neutral if no claims

  const score = verdicts.reduce((acc, v) => {
    switch (v) {
      case "true": 
        return acc + 1.0;
      case "unverified": 
        return acc + 0.5;
      case "misleading": 
        return acc + 0.25;
      case "false":
      default: 
        return acc + 0;
    }
  }, 0);

  // Calculate average and scale to 0-10
  const average = score / verdicts.length;
  const scaled = average * 10;
  
  // Round to 1 decimal place
  return Math.round(scaled * 10) / 10;
}

/**
 * Dynamic Confidence Formula:
 * Calculates confidence based on claim verification status
 * 
 * - verified claims: full weight (1.0)
 * - partial claims: half weight (0.5)
 * - unverified claims: no weight (0.0)
 * 
 * Scale between 40% and 95%
 */
export function calculateConfidence(
  totalClaims: number, 
  verifiedClaims: number, 
  citedClaims: number
): number {
  if (totalClaims === 0) return 50; // Default to 50% if no claims

  const coverage = verifiedClaims / totalClaims;
  const citationStrength = citedClaims / totalClaims;

  const confidence = (coverage * 0.7 + citationStrength * 0.3) * 100;
  
  // Ensure confidence is between 0-100
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

/**
 * Enhanced confidence calculation based on claim status
 * Uses verification status for more nuanced confidence scoring
 */
export function calculateDynamicConfidence(claims: ClaimResult[]): number {
  if (!claims || claims.length === 0) {
    return 50; // no evidence = low confidence baseline
  }

  // Count claims by status
  const verified = claims.filter(c => 
    c.status === "verified" || 
    (c.verdict === "true" && c.citation) // fallback for backward compatibility
  ).length;
  
  const partial = claims.filter(c => 
    c.status === "partial" || 
    (c.verdict === "misleading") // fallback for backward compatibility
  ).length;
  
  const unverified = claims.filter(c => 
    c.status === "unverified" || 
    (!c.status && c.verdict === "unverified") // fallback for backward compatibility
  ).length;

  const total = claims.length;
  const ratio = (verified + 0.5 * partial) / total;

  // Scale confidence between 40% and 95%
  return Math.round(40 + ratio * 55);
}

/**
 * Process fact check results into balanced scoring
 */
export function processFactCheckResults(
  factCheckResults: Array<{
    claim: string;
    verdict: string;
    evidence: string;
  }>,
  citations: string[] = []
): { 
  claimResults: ClaimResult[];
  truthScore: number;
  confidence: number;
} {
  // Map fact check results to claim results with citations
  const claimResults: ClaimResult[] = factCheckResults.map((result, index) => {
    // Normalize verdict to our standard format
    let normalizedVerdict: Verdict = "unverified";
    if (result.verdict.toLowerCase() === "true") normalizedVerdict = "true";
    else if (result.verdict.toLowerCase() === "false") normalizedVerdict = "false";
    else if (result.verdict.toLowerCase() === "misleading") normalizedVerdict = "misleading";
    
    // Try to find a citation for this claim
    const citation = citations[index] || undefined;
    
    // Determine verification status based on verdict and citation
    let status: "verified" | "unverified" | "partial" | undefined;
    if (citation && (normalizedVerdict === "true" || normalizedVerdict === "false")) {
      status = "verified";
    } else if (normalizedVerdict === "misleading" || (citation && normalizedVerdict === "unverified")) {
      status = "partial";
    } else {
      status = "unverified";
    }
    
    return {
      verdict: normalizedVerdict,
      claim: result.claim,
      evidence: result.evidence,
      citation,
      footnote: citation ? index + 1 : undefined,
      status
    };
  });

  // Calculate metrics
  const verdicts = claimResults.map(c => c.verdict);
  const truthScore = calculateTruthScore(verdicts);
  
  const totalClaims = claimResults.length;
  const verifiedClaims = claimResults.filter(c => c.verdict !== "unverified").length;
  const citedClaims = claimResults.filter(c => c.citation).length;
  
  // Use dynamic confidence calculation
  const confidence = calculateDynamicConfidence(claimResults);

  return {
    claimResults,
    truthScore,
    confidence
  };
}

/**
 * Get verdict emoji for display
 */
export function getVerdictEmoji(verdict: Verdict): string {
  switch (verdict) {
    case "true": 
      return "✅";
    case "false": 
      return "❌";
    case "misleading": 
      return "⚠️";
    case "unverified":
    default: 
      return "❓";
  }
}

/**
 * Get verdict label for display
 */
export function getVerdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "true": 
      return "TRUE";
    case "false": 
      return "FALSE";
    case "misleading": 
      return "MISLEADING";
    case "unverified":
    default: 
      return "UNVERIFIED";
  }
}

/**
 * Extract unique citations from claim results
 */
export function extractUniqueCitations(claimResults: ClaimResult[]): string[] {
  const citations = claimResults
    .filter(c => c.citation)
    .map(c => c.citation!);
  
  return [...new Set(citations)];
}

/**
 * Format citation for display (extract domain or title)
 */
export function formatCitationDisplay(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Special handling for known sources
    const knownSources: Record<string, string> = {
      'nytimes.com': 'New York Times',
      'washingtonpost.com': 'Washington Post',
      'wsj.com': 'Wall Street Journal',
      'reuters.com': 'Reuters',
      'apnews.com': 'Associated Press',
      'bbc.com': 'BBC',
      'cnn.com': 'CNN',
      'foxnews.com': 'Fox News',
      'npr.org': 'NPR',
      'nature.com': 'Nature',
      'science.org': 'Science',
      'arxiv.org': 'arXiv',
      'pubmed.ncbi.nlm.nih.gov': 'PubMed',
      'github.com': 'GitHub',
      'twitter.com': 'Twitter',
      'x.com': 'X (Twitter)',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'youtube.com': 'YouTube',
      'wikipedia.org': 'Wikipedia',
      'bloomberg.com': 'Bloomberg',
      'ft.com': 'Financial Times',
      'economist.com': 'The Economist',
      'theguardian.com': 'The Guardian',
      'axios.com': 'Axios',
      'politico.com': 'Politico',
      'vox.com': 'Vox',
      'theatlantic.com': 'The Atlantic',
      'newyorker.com': 'The New Yorker',
      'wired.com': 'WIRED',
      'techcrunch.com': 'TechCrunch',
      'theverge.com': 'The Verge',
      'arstechnica.com': 'Ars Technica',
      'technologyreview.com': 'MIT Technology Review',
      'scientificamerican.com': 'Scientific American',
      'pnas.org': 'PNAS',
      'nejm.org': 'NEJM',
      'thelancet.com': 'The Lancet',
      'bmj.com': 'BMJ',
      'jama.jamanetwork.com': 'JAMA',
    };
    
    return knownSources[domain] || domain;
  } catch {
    // If URL parsing fails, return a shortened version
    return url.length > 30 ? url.substring(0, 30) + '...' : url;
  }
}

/**
 * Get confidence level color and styling based on percentage
 * Returns Tailwind CSS classes and emoji for confidence display
 */
export function getConfidenceStyle(confidence: number): {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  label: string;
} {
  if (confidence >= 80) {
    return {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-500',
      icon: '🟢',
      label: 'High Confidence'
    };
  } else if (confidence >= 60) {
    return {
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-500',
      icon: '🟡',
      label: 'Medium Confidence'
    };
  } else {
    return {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-500',
      icon: '🔴',
      label: 'Low Confidence'
    };
  }
}

/**
 * Get a simple confidence badge for inline display
 */
export function getConfidenceBadge(confidence: number): string {
  if (confidence >= 80) return '🟢 High';
  else if (confidence >= 60) return '🟡 Medium';
  else return '🔴 Low';
}
