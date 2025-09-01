# Reality Auditor – Product Requirements Doc (PRD)

## 🎯 Product Vision
A real-time fact auditing app that gives users X-ray vision into media bias and manipulation. Users paste articles, transcripts, or URLs and receive comprehensive audits with truth scores, bias patterns, missing perspectives, and verified citations.

## 🔥 Core Value Proposition
**"Audit reality like you're wearing truth-glasses"** – Transform how people consume media by making bias detection and fact-checking as simple as copy-paste.

## 🎪 Target Users

### Primary Users
- **Journalists** → Quick pre-publish fact-checking and bias detection
- **Lawyers/Policy Researchers** → Sanity check arguments in briefs, rulings, lobby docs
- **Activists/NGOs** → Expose manipulative media to the public
- **Everyday Readers** → Scan news with truth-glasses for daily consumption

### Use Cases
1. **Pre-publication Review**: Journalist pastes draft article → gets bias audit before publishing
2. **Source Verification**: Researcher inputs policy document → identifies missing perspectives
3. **Media Literacy**: Citizen reads news article → understands manipulation tactics used
4. **Academic Research**: Scholar analyzes multiple sources → compares bias patterns

## ⚡ Core Features

### Input Pipeline
- **Text Input**: Paste box for articles, transcripts, or any text content
- **URL Import**: Automatic content extraction from web pages
- **Metadata Enhancement**: Optional author, outlet, date, title fields
- **Batch Processing**: Multiple articles in queue (future)

### Analysis Engine
- **Multi-Lens Analysis**: Truth lens, Bias lens, Manipulation lens, Omissions lens
- **K-Draft System**: Generate 2-3 analysis drafts, select best via verification scoring
- **Verifier Component**: Removes speculation, ensures faithfulness to source material
- **Critic Loop**: Polishes language, adds missing angles, verifies citations

### Reality Audit Output
```json
{
  "truth_score": 0-10,
  "bias_patterns": ["loaded language", "cherry-picking"],
  "missing_angles": ["counter-evidence not included"],
  "citations": ["https://verified-source.com"],
  "summary": "Plain English audit explanation",
  "confidence_level": 0.0-1.0,
  "manipulation_tactics": ["appeal to fear", "false urgency"],
  "fact_check_results": [
    {
      "claim": "specific claim text",
      "verdict": "true|false|misleading|unverified", 
      "evidence": "supporting evidence"
    }
  ]
}
```

### User Interface
- **Glassmorphic Dashboard**: Futuristic UI with backdrop blur and transparency
- **Truth Score Dial**: Animated scoring visualization (0-10 scale)
- **Bias Patterns**: Tagged display of identified bias types
- **Missing Angles**: Bullet-point list of absent perspectives
- **Citations Panel**: Verified source links with status indicators
- **Audit Summary**: Plain English explanation of findings

### Infrastructure
- **Caching Layer**: Redis/Upstash for repeated article audits (24hr TTL)
- **Citation Verification**: Tavily API integration for fact-grounding
- **Content Extraction**: URL-to-text services (Jina Reader, Mercury Parser)
- **Rate Limiting**: Prevent API abuse, fair usage policies

## 📊 Success Metrics

### Technical Performance
- API uptime > 99%
- Average response time < 3 seconds
- Cache hit rate > 40%
- Error rate < 1%

### User Engagement
- Daily active audits > 100
- User retention > 60% week-over-week
- Average session audits > 2.5
- Share rate of audit results > 15%

### Quality Assurance
- Truth Score consistency vs. ground truth references > 85%
- Citation verification accuracy > 95%
- False positive bias detection < 10%
- User satisfaction score > 4.2/5

## 🚀 Competitive Advantage

1. **Speed**: 3-second audit vs. manual fact-checking (hours)
2. **Comprehensiveness**: Multi-lens analysis vs. single-perspective checks
3. **User Experience**: Glassmorphic UI vs. boring fact-check websites
4. **Real-time**: Instant results vs. delayed professional fact-checks
5. **Accessibility**: Free tier vs. expensive professional services

## 🎨 Design Philosophy
- **Sci-Fi Aesthetic**: Make fact-checking feel futuristic and exciting
- **Transparency**: Show confidence levels and analysis methodology
- **Actionability**: Not just "this is biased" but "here's what's missing"
- **Educational**: Help users understand bias patterns and manipulation tactics

## 🔒 Risk Mitigation
- **AI Reliability**: Multiple draft verification + confidence scoring
- **Citation Accuracy**: Real-time link verification via Tavily
- **Bias in Analysis**: Diverse training data and bias pattern recognition
- **Scalability**: Cloud-native architecture with auto-scaling
- **Legal Compliance**: Fact vs. opinion disclaimers, fair use citations
