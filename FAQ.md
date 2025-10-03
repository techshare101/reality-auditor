# Frequently Asked Questions

## What is Reality Auditor?
Reality Auditor is an AI-powered tool that helps users analyze and fact-check content using GPT-5 with Tavily grounding for real citations and multi-lens analysis.

## What features are available?
- Article analysis with real citations
- Multi-lens content analysis
- Pro user features with unlimited audits
- Audit history tracking
- Dashboard with detailed audit results

## What's included in the Pro plan?
Pro users get:
- Unlimited audits (indicated by green banner)
- Access to advanced analysis features
- Audit history persistence
- Pro banner displaying renewal date

## How does the technology work?
Reality Auditor uses:
- GPT-5 model for sophisticated analysis
- Tavily grounding for accurate citations
- Redis (Upstash) for efficient caching
- MongoDB for persistent audit history storage

## How is my audit data stored?
- Audit results are cached in Redis for performance
- Long-term storage is handled by MongoDB
- Clean data handling with proper cleanup on session end
- Secure user data management

## How do I get started?
1. Set up your environment with required API keys
2. Configure your .env.local file
3. Start analyzing content through the dashboard
4. View results with real citations and detailed analysis

## Technical Requirements
- OpenAI API key (for GPT-5)
- Tavily API key
- Upstash Redis configuration
- MongoDB connection