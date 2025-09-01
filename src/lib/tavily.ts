import { TavilyClient } from "tavily";

// Initialize Tavily client
const tavily = new TavilyClient({
  apiKey: process.env.TAVILY_API_KEY!,
});

/**
 * Get citations from Tavily search based on content
 * @param query - The content or search query to find citations for
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of citation URLs
 */
export async function getCitations(query: string, maxResults: number = 5): Promise<string[]> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.warn("Tavily API key not found, returning empty citations");
      return [];
    }

    // Extract key phrases from content for better search
    const searchQuery = extractSearchQuery(query);
    
    console.log(`🔍 Searching Tavily for citations with query: "${searchQuery.substring(0, 100)}..."`);
    
    const response = await tavily.search({
      query: searchQuery,
      max_results: maxResults,
      search_depth: "advanced",
      include_images: false,
      include_answer: false,
      include_raw_content: false,
    });
    
    const citations = response.results.map((result: any) => result.url).filter(Boolean);
    
    console.log(`✅ Found ${citations.length} citations from Tavily`);
    
    return citations;
  } catch (error) {
    console.error("❌ Tavily citation fetch failed:", error);
    // Return empty array on error to not break the audit
    return [];
  }
}

/**
 * Extract key search terms from content for better Tavily results
 * @param content - The full content to analyze
 * @returns Optimized search query string
 */
function extractSearchQuery(content: string): string {
  // Take first 500 characters and clean up for search
  let query = content.substring(0, 500).trim();
  
  // Remove common filler words and focus on key terms
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those'];
  
  // Extract meaningful phrases and keywords
  const sentences = query.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const firstSentence = sentences[0] || query;
  
  // Extract potential entity names (capitalized words)
  const entities = firstSentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  // Combine first sentence with key entities
  const keyTerms = [firstSentence.trim(), ...entities.slice(0, 3)].join(' ');
  
  return keyTerms.substring(0, 300); // Limit query length
}

/**
 * Search for fact-checking sources related to specific claims
 * @param claim - The specific claim to fact-check
 * @returns Array of fact-checking URLs
 */
export async function getFactCheckSources(claim: string): Promise<string[]> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      return [];
    }

    const factCheckQuery = `fact check "${claim}" site:snopes.com OR site:factcheck.org OR site:politifact.com OR site:reuters.com/fact-check`;
    
    console.log(`🔍 Searching for fact-check sources: "${claim.substring(0, 50)}..."`);
    
    const response = await tavily.search({
      query: factCheckQuery,
      max_results: 3,
      search_depth: "basic"
    });
    
    return response.results.map((result: any) => result.url).filter(Boolean);
  } catch (error) {
    console.error("❌ Fact-check source fetch failed:", error);
    return [];
  }
}
