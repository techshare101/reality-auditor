import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import OpenAI from "openai";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    console.log(`🌐 Fetching article from: ${url}`);

    // Fetch the webpage with realistic headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log(`📄 HTML fetched, length: ${html.length} characters`);

    // Extract content using Cheerio (faster and more reliable)
    const content = extractContentWithCheerio($);

    if (!content || content.length < 100) {
      return NextResponse.json({ 
        error: "Could not extract meaningful content from the URL" 
      }, { status: 422 });
    }

    // Try extracting metadata with Cheerio first
    console.log(`🔍 Extracting metadata with Cheerio...`);
    const cheerioMetadata = extractMetadataWithCheerio($, url);
    
    // Check if metadata is incomplete
    const isIncomplete = !cheerioMetadata.title || 
                        !cheerioMetadata.author || 
                        cheerioMetadata.author === 'Unknown' ||
                        !cheerioMetadata.date ||
                        cheerioMetadata.date === 'Unknown';

    let finalMetadata = cheerioMetadata;
    let metadataSource = "cheerio";

    // Fallback to OpenAI if metadata is incomplete
    if (isIncomplete && process.env.OPENAI_API_KEY) {
      console.log(`⚠️  Cheerio metadata incomplete → falling back to OpenAI`);
      try {
        const gptMetadata = await extractMetadataWithOpenAI(html, url);
        
        // Merge the results, preferring OpenAI for missing fields
        finalMetadata = {
          title: gptMetadata.title || cheerioMetadata.title,
          author: gptMetadata.author || cheerioMetadata.author,
          outlet: gptMetadata.outlet || cheerioMetadata.outlet, 
          date: gptMetadata.date || cheerioMetadata.date
        };
        
        metadataSource = gptMetadata.title || gptMetadata.author ? "mixed" : "cheerio";
        console.log(`✅ OpenAI metadata extraction completed`);
      } catch (error) {
        console.warn(`❌ OpenAI metadata fallback failed:`, error);
        metadataSource = "cheerio";
      }
    }

    console.log(`📊 Final metadata:`, finalMetadata);
    console.log(`📈 Metadata source: ${metadataSource}`);

    return NextResponse.json({ 
      content,
      url,
      metadata: finalMetadata,
      metadata_source: metadataSource,
      success: true
    });

  } catch (error: any) {
    console.error("Article fetch error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch article content" 
    }, { status: 500 });
  }
}

/**
 * Extract content using Cheerio - faster and more reliable than regex
 */
function extractContentWithCheerio($: cheerio.Root): string {
  // Remove unwanted elements
  $('script, style, nav, footer, aside, .advertisement, .ad, .social-share').remove();
  
  // Try semantic content selectors first
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.article-content',
    '.post-content', 
    '.entry-content',
    '.content',
    '.story-body'
  ];
  
  let content = '';
  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 200) {
      content = element.text();
      break;
    }
  }
  
  // Fallback to paragraph extraction
  if (!content) {
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(text => text.length > 50) // Filter out short snippets
      .join('\n\n');
    content = paragraphs;
  }
  
  // Clean up the content
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Extract metadata using Cheerio selectors
 */
function extractMetadataWithCheerio($: cheerio.Root, url: string) {
  // Helper to clean text
  const cleanText = (text: string) => {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  };

  // Extract title
  let title = '';
  const titleSources = [
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="twitter:title"]').attr('content'),
    $('title').text(),
    $('h1').first().text()
  ];
  
  for (const source of titleSources) {
    if (source && source.trim()) {
      title = cleanText(source);
      break;
    }
  }
  
  // Extract author
  let author = '';
  const authorSources = [
    $('meta[name="author"]').attr('content'),
    $('meta[property="article:author"]').attr('content'),
    $('[rel="author"]').text(),
    $('.author, .byline, .posted-by, .writer, [class*="author"]').first().text(),
    $('[data-author]').attr('data-author')
  ];
  
  for (const source of authorSources) {
    if (source && source.trim() && source.length > 2) {
      author = cleanText(source).replace(/^(by|author:?|written by)\s+/i, '');
      if (author && author !== 'Unknown' && author.length > 2) break;
    }
  }
  
  // Extract outlet/site name
  let outlet = '';
  const outletSources = [
    $('meta[property="og:site_name"]').attr('content'),
    $('meta[name="application-name"]').attr('content'),
    $('meta[name="publisher"]').attr('content'),
    $('.publication, .site-name, [class*="publication"]').first().text()
  ];
  
  for (const source of outletSources) {
    if (source && source.trim()) {
      outlet = cleanText(source);
      break;
    }
  }
  
  // Fallback to hostname for outlet
  if (!outlet) {
    try {
      const hostname = new URL(url).hostname;
      outlet = hostname
        .replace(/^www\./, '')
        .replace(/\.(com|org|net|edu|gov|co\.uk)$/, '')
        .split('.')[0];
      outlet = outlet.charAt(0).toUpperCase() + outlet.slice(1);
    } catch {
      outlet = 'Unknown';
    }
  }
  
  // Extract date
  let date = '';
  const dateSources = [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[property="article:modified_time"]').attr('content'),
    $('time[datetime]').attr('datetime'),
    $('time').text(),
    $('meta[name="date"]').attr('content'),
    $('meta[name="publish_date"]').attr('content'),
    $('.date, .publish-date, [class*="date"]').first().text()
  ];
  
  for (const source of dateSources) {
    if (source && source.trim()) {
      const rawDate = source.trim();
      try {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          break;
        }
      } catch {
        // Try to extract date patterns from text
        const datePattern = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\w+ \d{1,2}, \d{4})\b/;
        const match = rawDate.match(datePattern);
        if (match) {
          try {
            const parsed = new Date(match[0]);
            if (!isNaN(parsed.getTime())) {
              date = parsed.toISOString().split('T')[0];
              break;
            }
          } catch {}
        }
      }
    }
  }
  
  return {
    title: title || 'Unknown',
    author: author || 'Unknown', 
    outlet: outlet || 'Unknown',
    date: date || 'Unknown'
  };
}

/**
 * Fallback metadata extraction using OpenAI when Cheerio fails
 */
async function extractMetadataWithOpenAI(html: string, url: string) {
  try {
    if (!openai) {
      throw new Error('OpenAI client not available');
    }
    
    // Truncate HTML to first 15000 characters to avoid token limits
    const truncatedHtml = html.substring(0, 15000);
    
    const prompt = `Extract metadata from this HTML page. Return JSON only with title, author, outlet, and date fields.

URL: ${url}

HTML:
${truncatedHtml}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use cheaper model for metadata extraction
      messages: [
        {
          role: "system",
          content: "You are a metadata extractor. Extract title, author, outlet, and publication date from HTML. Return valid JSON only with fields: title, author, outlet, date. If a field cannot be found, use 'Unknown'."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500
    });
    
    const rawResponse = response.choices[0]?.message?.content;
    if (!rawResponse) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsed = JSON.parse(rawResponse);
    
    // Clean and validate the response
    return {
      title: parsed.title || 'Unknown',
      author: parsed.author || 'Unknown',
      outlet: parsed.outlet || parsed.publication || 'Unknown', 
      date: parsed.date || parsed.published_date || parsed.publication_date || 'Unknown'
    };
    
  } catch (error) {
    console.error('OpenAI metadata extraction failed:', error);
    return {
      title: 'Unknown',
      author: 'Unknown', 
      outlet: 'Unknown',
      date: 'Unknown'
    };
  }
}

