import { NextRequest, NextResponse } from "next/server";
import { AuditRequestSchema, RealityAuditSchema } from "@/lib/schemas";
import { getCitations, getFactCheckSources } from "@/lib/tavily";
import { checkSubscriptionStatus, incrementUsage } from "@/lib/subscription-checker-v2";
import { auth, db } from "@/lib/firebase-admin";
import { adjustTruthScore, buildRefinedSummary, getTrustBadge, buildTransparencyReport, calculateConfidenceLevel } from "@/lib/scoring";
import OpenAI from "openai";
import { TavilyClient } from "tavily";
import { Redis } from "@upstash/redis";
import crypto from "crypto";
import { buildSources } from "@/lib/outlets";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Initialize clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize Redis client (with fallback to in-memory for development)
let redis: Redis | null = null;
let useRedis = false;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
    useRedis = true;
    console.log("✅ Redis client initialized successfully");
  } else {
    console.log("⚠️ Redis credentials not found, using in-memory cache");
  }
} catch (error) {
  console.error("❌ Failed to initialize Redis:", error);
  useRedis = false;
}

// Fallback in-memory cache
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Helper: hash content for caching
function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    let userId = null;
    let userEmail = null;
    
    // Check authentication (optional for demo mode, but required for usage tracking)
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || null;
        console.log(`🔐 Authenticated user: ${userId} (${userEmail})`);
      } catch (authError) {
        console.warn('⚠️ Authentication failed, proceeding with anonymous access:', authError);
        // Don't fail the request - allow anonymous access with default limits
      }
    }
    
    // Check usage limits using subscription system if user is authenticated
    let usageInfo = null;
    if (userId) {
      console.log(`📊 Checking usage for ${userId}...`);
      
      try {
        // Check subscription status first (with email for webhook compatibility)
        const subscriptionStatus = await checkSubscriptionStatus(userId, userEmail || undefined);
        console.log(`📊 Subscription status:`, {
          isActive: subscriptionStatus.isActive,
          auditsUsed: subscriptionStatus.auditsUsed,
          auditsRemaining: subscriptionStatus.auditsRemaining,
          planType: subscriptionStatus.planType
        });
        
        if (!subscriptionStatus.isActive || subscriptionStatus.auditsRemaining <= 0) {
          const limitError = subscriptionStatus.planType === 'free'
            ? "Free plan limit reached. Upgrade to continue."
            : "Usage limit exceeded";
            
          return NextResponse.json({
            error: limitError,
            details: {
              plan: subscriptionStatus.planType,
              auditsUsed: subscriptionStatus.auditsUsed,
              auditsLimit: subscriptionStatus.auditsLimit,
              remaining: subscriptionStatus.auditsRemaining,
              upgradeRequired: true
            }
          }, { status: 402 }); // 402 Payment Required
        }
        
        // Increment usage after successful audit (will be called at the end)
        // Store usage info for response
        usageInfo = {
          auditsUsed: subscriptionStatus.auditsUsed,
          auditsRemaining: subscriptionStatus.auditsRemaining
        };
        
        console.log(`✅ Usage check passed: ${subscriptionStatus.auditsUsed} used, ${subscriptionStatus.auditsRemaining} remaining`);
      } catch (usageError) {
        console.error(`❌ Usage check failed:`, usageError);
        // Allow audit to proceed but log the error
        // In production, you might want to fail the request instead
      }
    } else {
      console.log(`⚠️ No user ID provided, proceeding with anonymous audit`);
    }

    // Parse and validate the request body
    const body = await request.json();
    const { content, metadata, url } = body;
    
    // Clean inputs
    const textInput = content?.trim();
    const urlInput = url?.trim();
    
    if (!textInput && !urlInput) {
      return NextResponse.json({ error: "No content provided. Please paste text or provide a URL." }, { status: 400 });
    }

    const warnings: string[] = [];

    // ✅ Always prioritize pasted text if available
    let articleText = textInput || "";
    
    // Only fetch from URL if no text was provided
    if (!articleText && urlInput) {
      try {
        console.log(`🔗 No text provided, fetching article from URL: ${urlInput}`);
        const fetchRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fetch-article?url=${encodeURIComponent(urlInput)}`);
        const data = await fetchRes.json();
        
        if (!fetchRes.ok) {
          throw new Error(data.error || 'Failed to fetch article');
        }
        
        if (data?.content) {
          articleText = data.content;
          console.log(`✅ Successfully fetched article (${articleText.length} chars)`);
        } else {
          throw new Error('No content extracted from URL');
        }
      } catch (err: any) {
        console.error("❌ Failed to fetch article:", err);
        return NextResponse.json({ 
          error: "Could not extract content from URL. Please paste the article text directly." 
        }, { status: 400 });
      }
    }

    if (!articleText) {
      return NextResponse.json({ error: "No article text available" }, { status: 400 });
    }

    // ⚠️ Snippet Warning
    if (articleText.length < 500) {
      warnings.push("Partial content detected. Truth Score may be distorted. Provide full article or URL for best accuracy.");
      console.log(`⚠️ Short content warning: Only ${articleText.length} characters`);
    }

    // Generate cache key
    const contentHash = hashContent(articleText);
    const cacheKey = `audit:${contentHash}`;
    
    console.log(`🔑 Generated cache key: ${cacheKey.substring(0, 20)}...`);

    // Try Redis cache first, then fallback to memory cache
    let cachedResult = null;
    let cacheSource = "none";
    
    if (useRedis && redis) {
      try {
        cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          console.log(`✅ REDIS CACHE HIT for key: ${cacheKey}`);
          cacheSource = "redis";
        } else {
          console.log(`⚠️ REDIS CACHE MISS for key: ${cacheKey}`);
        }
      } catch (redisError) {
        console.error("❌ Redis get failed, falling back to memory cache:", redisError);
      }
    }
    
    // Fallback to memory cache if Redis failed or not available
    if (!cachedResult) {
      const memoryCached = memoryCache.get(cacheKey);
      if (memoryCached && (Date.now() - memoryCached.timestamp) < CACHE_TTL) {
        cachedResult = memoryCached.data;
        cacheSource = "memory";
        console.log(`✅ MEMORY CACHE HIT for key: ${cacheKey}`);
      } else {
        console.log(`⚠️ MEMORY CACHE MISS for key: ${cacheKey}`);
      }
    }
    
    if (cachedResult) {
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Cache served in ${processingTime}ms`);
      console.log(`🔔 IMPORTANT: Cache hit - usage will NOT be incremented for user ${userId || 'anonymous'}`);

      // Ensure sources exist in cached payload as well
      let ensuredSources = (cachedResult as any).sources as { url: string; outlet: string }[] | undefined;
      if (!ensuredSources || !Array.isArray(ensuredSources)) {
        ensuredSources = buildSources((cachedResult as any).citations || [], (typeof body === 'object' ? (body as any)?.url : undefined));
      }

      const responseBody: any = {
        ...cachedResult,
        sources: ensuredSources,
        warnings: [...(cachedResult.warnings || []), ...warnings],
        cache_status: "hit",
        cache_source: cacheSource,
        processing_time: processingTime
      };

      // Add current usage info to cached response
      if (userId) {
        try {
          const subscriptionStatus = await checkSubscriptionStatus(userId);
          responseBody.usage = {
            auditsUsed: subscriptionStatus.auditsUsed,
            auditsRemaining: subscriptionStatus.auditsRemaining,
          };
          console.log(`📊 Current usage for cached response: ${subscriptionStatus.auditsUsed}/${subscriptionStatus.auditsLimit}`);
        } catch (usageError) {
          console.error('❌ Error getting usage for cache hit:', usageError);
        }
      }

      return NextResponse.json(responseBody);
    }

    console.log("🚀 Starting new reality audit analysis...");
    console.log("📝 Content length:", articleText.length, "characters");
    console.log("📊 Metadata:", metadata);
    
    // 🔹 Multi-query Tavily search for better citations
    console.log("🔍 Running multi-query Tavily search...");
    let citations: string[] = [];
    
    try {
      const tavily = new TavilyClient({ apiKey: process.env.TAVILY_API_KEY! });
      
      const queries = [
        metadata?.title,
        articleText.slice(0, 500),
        articleText.slice(-500),
      ].filter(Boolean);

      console.log(`🔍 Running ${queries.length} Tavily queries...`);
      const results = await Promise.all(
        queries.map((q) => tavily.search({
          query: q,
          max_results: 5,
          search_depth: "basic"
        }))
      );

      const merged = results.flatMap((r: any) => r.results?.map((res: any) => res.url) || []);
      citations = Array.from(new Set(merged)).slice(0, 10); // dedupe & cap
      
      console.log(`✅ Found ${citations.length} unique citations from multi-query search`);
    } catch (tavilyError) {
      console.warn("⚠️ Tavily search failed, falling back to no citations:", tavilyError);
      warnings.push("Citation search unavailable. Analysis may have limited external verification.");
    }
    
    // Enhanced GPT analysis with Tavily citations
    const auditResult = await runEnhancedGPTAnalysis(articleText, metadata, citations);
    
    // Build normalized sources from citations and submitted url
    const sources = buildSources(citations, url);

    // Add warnings to the result
    const resultWithWarnings = {
      ...auditResult,
      warnings
    };
    
    // Validate the core result against our schema (citations etc.)
    // If validation fails due to citations, try again with empty citations
    let validatedResult;
    try {
      validatedResult = RealityAuditSchema.parse(resultWithWarnings);
    } catch (validationError) {
      console.warn("⚠️ Initial validation failed, attempting with empty citations:", validationError);
      // Try again with empty citations array
      const resultWithEmptyCitations = {
        ...resultWithWarnings,
        citations: []
      };
      validatedResult = RealityAuditSchema.parse(resultWithEmptyCitations);
    }
    
    // Apply scoring adjustments based on detected issues
    const adjustedScore = adjustTruthScore(validatedResult);
    const refinedSummary = buildRefinedSummary(validatedResult);
    const trustBadge = getTrustBadge(validatedResult);
    const transparencyReport = buildTransparencyReport(validatedResult);
    const confidence = calculateConfidenceLevel(validatedResult);
    
    console.log(`🎯 Score adjustment: ${validatedResult.truth_score} → ${adjustedScore}`);
    console.log(`🛡️ Trust badge: ${trustBadge.label} (${trustBadge.level})`);
    console.log(`📊 Confidence level: ${confidence}%`);
    
    // Add cache metadata and enriched sources (kept outside schema to avoid strict coupling)
    const resultForCache: any = {
      ...validatedResult,
      truth_score_raw: validatedResult.truth_score,  // Keep original score
      truth_score: adjustedScore,                     // Use adjusted score
      refined_summary: refinedSummary,                // Add refined summary
      trust_badge: trustBadge,                        // Add trust badge
      transparency_report: transparencyReport,        // Add transparency
      confidence_level: confidence / 100,             // Add confidence (as decimal for compatibility)
      sources,
    };

    const resultWithCache: any = {
      ...resultForCache,
      cache_status: "miss",
      cache_source: "none",
      processing_time: Date.now() - startTime
    };
    
    // Store in cache (try Redis first, fallback to memory)
    if (useRedis && redis) {
      try {
        await redis.set(cacheKey, resultForCache, { ex: 60 * 60 }); // 1 hour TTL
        console.log(`💾 Stored new audit in REDIS cache with key: ${cacheKey}`);
      } catch (redisError) {
        console.error("❌ Redis set failed, storing in memory cache:", redisError);
        memoryCache.set(cacheKey, {
          data: resultForCache,
          timestamp: Date.now()
        });
        console.log(`💾 Stored new audit in MEMORY cache with key: ${cacheKey}`);
      }
    } else {
      memoryCache.set(cacheKey, {
        data: resultForCache,
        timestamp: Date.now()
      });
      console.log(`💾 Stored new audit in MEMORY cache with key: ${cacheKey}`);
    }
    
    // Save audit to Firestore
    let auditId = null;
    if (userId) {
      try {
        console.log(`💾 Saving audit to Firestore for user ${userId}...`);
        const auditDoc = {
          userId,
          result: resultForCache,
          url: url || null,
          content: articleText.substring(0, 1000), // Store first 1000 chars for preview
          metadata: metadata || {},
          createdAt: new Date(),
          cacheKey,
          processing_time: Date.now() - startTime
        };
        
        const docRef = await db.collection('audits').add(auditDoc);
        auditId = docRef.id;
        console.log(`✅ Audit saved to Firestore with ID: ${auditId}`);
        
        // Add the Firestore ID to the response
        resultWithCache.id = auditId;
      } catch (firestoreError) {
        console.error(`❌ Failed to save audit to Firestore:`, firestoreError);
        // Don't fail the request, just log the error
      }
    }
    
    // Increment usage count after successful audit
    if (userId) {
      try {
        console.log(`📈 INCREMENTING USAGE for user ${userId} after successful NEW audit (not cached)`);
        const incrementResult = await incrementUsage(userId);
        console.log(`✅ Usage increment result:`, {
          success: incrementResult.success,
          previousUsage: incrementResult.newUsageCount - 1,
          newUsage: incrementResult.newUsageCount,
          remaining: incrementResult.auditsRemaining,
          error: incrementResult.error
        });
        
        // Update usage info in response with new counts
        if (incrementResult.success) {
          resultWithCache.usage = {
            auditsUsed: incrementResult.newUsageCount,
            auditsRemaining: incrementResult.auditsRemaining
          };
          console.log(`🎯 Final usage in response: ${incrementResult.newUsageCount} used, ${incrementResult.auditsRemaining} remaining`);
        } else {
          console.error(`❌ Usage increment failed:`, incrementResult.error);
        }
      } catch (incrementError) {
        console.error(`❌ Failed to increment usage:`, incrementError);
        // Don't fail the audit, just log the error
      }
    } else if (usageInfo) {
      // For non-authenticated users, keep the original usage info
      resultWithCache.usage = usageInfo;
      console.log(`👤 Anonymous user - no usage tracking`);
    }
    
    console.log("✅ Audit completed successfully");
    console.log("🎯 Truth Score:", adjustedScore, `(raw: ${validatedResult.truth_score})`);
    console.log("🔍 Bias Patterns:", validatedResult.bias_patterns?.length || 0);
    console.log("❓ Missing Angles:", validatedResult.missing_angles?.length || 0);
    console.log("⚠️ Warnings:", validatedResult.warnings?.length || 0);
    console.log("🔗 Citations:", validatedResult.citations?.length || 0);
    console.log(`⏱️ Total processing time: ${resultWithCache.processing_time}ms`);
    
    return NextResponse.json(resultWithCache);

  } catch (error) {
    console.error("❌ Reality audit failed:", error);
    
    // Return specific error messages for different failure types
    if (error instanceof Error) {
      if (error.message.includes("validation") || error.message.includes("parse")) {
        return NextResponse.json(
          { error: "Invalid input format. Please check your content." },
          { status: 400 }
        );
      }
      
      if (error.message.includes("timeout") || error.message.includes("network")) {
        return NextResponse.json(
          { error: "Analysis timed out. Please try with shorter content or try again later." },
          { status: 408 }
        );
      }
      
      if (error.message.includes("API") || error.message.includes("key")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Analysis failed. Please try again or contact support if the issue persists." },
      { status: 500 }
    );
  }
}

/**
 * Enhanced GPT analysis with Tavily citations integration
 */
async function runEnhancedGPTAnalysis(content: string, metadata: any, citations: string[]) {
  const systemPrompt = `You are Reality Auditor, an advanced AI system for analyzing media content. Your task is to provide comprehensive, objective analysis of text for truth, bias, omissions, manipulation tactics, and fact verification.

Analyze the provided content and return a JSON response that matches this exact schema:
{
  "truth_score": number (0-10),
  "bias_patterns": string[],
  "missing_angles": string[],
  "citations": string[],
  "summary": string,
  "confidence_level": number (0-1),
  "manipulation_tactics": string[],
  "fact_check_results": [{
    "claim": string,
    "verdict": "true" | "false" | "misleading" | "unverified",
    "evidence": string
  }]
}

Guidelines:
- Truth score: Rate 0-10 based on factual accuracy, evidence quality, source credibility
- Bias patterns: Identify specific types of bias (confirmation bias, loaded language, cherry-picking, etc.)
- Missing angles: Note important perspectives, counterarguments, or context that's absent
- Manipulation tactics: Detect emotional appeals, logical fallacies, misleading statistics, etc.
- Fact checks: Verify key claims with specific evidence
- Citations: MUST be an array of valid URLs only. If no external sources are provided or found, return an empty array []. Do NOT include placeholder text or descriptions.
- Be objective and evidence-based in your analysis
- Return ONLY valid JSON, no additional text`;

  const userPrompt = `Please analyze this article content:

**Metadata:**
- Title: ${metadata.title || "Unknown"}
- Author: ${metadata.author || "Unknown"}
- Outlet: ${metadata.outlet || "Unknown"}
- Date: ${metadata.date || "Unknown"}

**Content:**
${content}

**Available Reference Sources:**
${citations.length > 0 ? citations.map((url, i) => `${i + 1}. ${url}`).join('\n') : 'No external sources found'}

Provide your comprehensive analysis as valid JSON only.`;

  try {
    if (!openai) {
      throw new Error("OpenAI client not initialized - missing API key");
    }
    
    console.log("🤖 Calling OpenAI GPT for analysis...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Use GPT-4 Turbo for better analysis
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 4000,
    });

    const rawResponse = response.choices[0]?.message?.content;
    if (!rawResponse) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("📋 Raw GPT response length:", rawResponse.length);
    
    // Parse and enhance the response
    let parsedResult;
    try {
      // Clean the response to ensure it's valid JSON
      const cleanedResponse = rawResponse.replace(/```json|```/g, '').trim();
      parsedResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response:", rawResponse);
      throw new Error("Invalid JSON response from AI analysis");
    }

    // Ensure we always include the real citations from Tavily
    // Filter out any non-URL citations that GPT might have generated
    const gptCitations = (parsedResult.citations || []).filter((citation: string) => {
      try {
        new URL(citation);
        return true;
      } catch {
        return false;
      }
    });
    
    return {
      ...parsedResult,
      citations: citations.length > 0 ? citations : gptCitations,
      confidence_level: parsedResult.confidence_level || 0.75,
      truth_score: Math.max(0, Math.min(10, parsedResult.truth_score || 5)),
      bias_patterns: parsedResult.bias_patterns || [],
      missing_angles: parsedResult.missing_angles || [],
      manipulation_tactics: parsedResult.manipulation_tactics || [],
      fact_check_results: parsedResult.fact_check_results || []
    };

  } catch (error) {
    console.error("🚨 GPT analysis failed:", error);
    
    // Fallback: return a basic analysis structure
    return {
      truth_score: 5.0,
      bias_patterns: ["Analysis unavailable - service error"],
      missing_angles: ["Full analysis could not be completed"],
      citations: citations,
      summary: "Unable to complete comprehensive analysis due to service limitations. The content requires manual review.",
      confidence_level: 0.1,
      manipulation_tactics: [],
      fact_check_results: []
    };
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "reality-auditor",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    capabilities: [
      "multi-lens analysis",
      "bias detection",
      "manipulation identification", 
      "fact verification",
      "citation validation",
      "content caching"
    ]
  });
}
