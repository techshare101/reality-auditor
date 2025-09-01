/**
 * Get warning level and styling based on confidence percentage
 */
export function getWarningLevel(confidence: number) {
  if (confidence >= 90) {
    return {
      text: "High external verification. Analysis supported by multiple sources.",
      level: "high",
      icon: "✅",
      color: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-500/30",
      textColor: "text-green-200",
      iconColor: "text-green-400",
      bgGlow: "shadow-green-500/20"
    };
  }
  
  if (confidence >= 60) {
    return {
      text: "Partial external verification. Some claims remain unverified.",
      level: "medium",
      icon: "⚠️",
      color: "from-yellow-500/20 to-amber-500/20",
      borderColor: "border-yellow-500/30",
      textColor: "text-yellow-200",
      iconColor: "text-yellow-400",
      bgGlow: "shadow-yellow-500/20"
    };
  }
  
  if (confidence >= 30) {
    return {
      text: "Low verification. Many claims unverified or weakly supported.",
      level: "low",
      icon: "❓",
      color: "from-orange-500/20 to-red-500/20",
      borderColor: "border-orange-500/30",
      textColor: "text-orange-200",
      iconColor: "text-orange-400",
      bgGlow: "shadow-orange-500/20"
    };
  }
  
  return {
    text: "Very low confidence. No verifiable sources found — treat with extreme caution.",
    level: "critical",
    icon: "🚨",
    color: "from-red-500/20 to-red-600/20",
    borderColor: "border-red-500/30",
    textColor: "text-red-200",
    iconColor: "text-red-400",
    bgGlow: "shadow-red-500/20"
  };
}

/**
 * Get dynamic warning messages based on specific issues
 */
export function getDynamicWarnings(data: {
  confidence: number;
  factCheckResults?: Array<{ verdict: string }>;
  citations?: string[];
  missingAngles?: string[];
}): string[] {
  const warnings: string[] = [];
  const { text } = getWarningLevel(data.confidence);
  
  // Add main confidence warning
  warnings.push(text);
  
  // Add specific warnings based on data
  if (!data.citations || data.citations.length === 0) {
    warnings.push("No external sources available for verification.");
  } else if (data.citations.length < 3) {
    warnings.push(`Limited to ${data.citations.length} source${data.citations.length > 1 ? 's' : ''} for verification.`);
  }
  
  // Check fact check results
  const falseCount = data.factCheckResults?.filter(fc => fc.verdict.toLowerCase() === 'false').length || 0;
  const misleadingCount = data.factCheckResults?.filter(fc => fc.verdict.toLowerCase() === 'misleading').length || 0;
  
  if (falseCount > 0) {
    warnings.push(`${falseCount} claim${falseCount > 1 ? 's' : ''} verified as false.`);
  }
  
  if (misleadingCount > 0) {
    warnings.push(`${misleadingCount} claim${misleadingCount > 1 ? 's' : ''} identified as misleading.`);
  }
  
  // Check missing angles
  if (data.missingAngles && data.missingAngles.length > 3) {
    warnings.push("Multiple critical perspectives missing from analysis.");
  }
  
  return warnings;
}
