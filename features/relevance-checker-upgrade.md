# Feature: Relevance Checker Upgrade — Content Intelligence Suite

**Status:** Planned  
**Priority:** High  
**Target Release:** Next  

---

## Overview

The Content Relevance Checker currently performs a single relevance audit and shows scores. This upgrade transforms it into a **multi-step Content Intelligence Suite** — after the initial relevance check, users can expand into three deeper analysis tools:

1. **Content Optimizer** — Generate an optimized version of the content addressing the gaps identified by the relevance audit.
2. **Content Strategy** — Topic Cluster architecture, audience mapping, and competitive landscape analysis.
3. **Content Briefs** — Detailed content briefs with target keywords, outline, and analysis.

---

## User Flow

```
[Input: Keyword + URL/Draft]
          │
          ▼
[Step 1: Relevance Scoring] ─── shows scores, verdict, gaps
          │
          ▼
[Step 2: Action Bar] ─── 3 buttons appear below results
          │
          ├── [Content Optimizer]    → AI generates optimized content
          ├── [Content Strategy]     → Topic Cluster / Audience / Competitive
          └── [Content Briefs]       → Detailed brief with outline + keywords
```

Each action fetches fresh AI analysis via a dedicated API endpoint and displays results inline below the relevance audit.

---

## Detailed Specifications

### 1. Content Optimizer

**API:** `POST /api/analyze/content-relevance/optimize`  
**Request Body:**
```json
{
  "keyword": "seo content strategy",
  "originalContent": "scraped or pasted content (truncated to 9000 chars)",
  "sourceType": "draft | url",
  "sourceUrl": "https://...",
  "audit": { /* the full ContentRelevanceAudit */ },
  "model": "gemini-2.0-flash-001",
  "apiKey": "..."
}
```

**Response:**
```json
{
  "optimizedContent": "Full rewritten content with improvements",
  "optimizedTitle": "SEO-optimized title",
  "optimizedMetaDescription": "Optimized meta description",
  "keyChanges": ["Added subtopic X", "Restructured section Y", ...],
  "improvedScores": {
    "estimatedRelevanceScore": 85,
    "estimatedIntentMatchScore": 90
  }
}
```

**Types:** `ContentOptimizerResult`

### 2. Content Strategy

**API:** `POST /api/analyze/content-relevance/strategy`  
**Request Body:** Same as Optimizer (keyword + content + audit)

**Response:**
```json
{
  "topicCluster": {
    "pillarTopic": "SEO Content Strategy",
    "clusterTopics": [
      { "topic": "Keyword Research for Content Strategy", "type": "supporting" },
      { "topic": "Content Gap Analysis Techniques", "type": "supporting" }
    ],
    "internalLinkingStrategy": "How to link these together..."
  },
  "audienceMapping": {
    "primaryAudience": "Content marketers at B2B SaaS companies",
    "personaDetails": "Alicia, 34, Head of Content...",
    "contentPreferences": ["Data-driven posts", "Case studies"],
    "searchBehavior": "Searches for 'content strategy framework'"
  },
  "competitiveLandscape": {
    "topCompetitors": [
      {
        "name": "Competitor X",
        "angle": "Focus on templates",
        "gapToExploit": "Lacks data on X"
      }
    ],
    "marketPositioning": "Recommendation on positioning this content"
  }
}
```

**Types:** `ContentStrategyResult`

### 3. Content Briefs

**API:** `POST /api/analyze/content-relevance/brief`  
**Request Body:** Same as above

**Response:**
```json
{
  "workingTitle": "The Ultimate Guide to SEO Content Strategy",
  "targetKeywords": {
    "primary": "seo content strategy",
    "secondary": ["content strategy framework", "seo content planning"],
    "related": ["editorial calendar seo", "content optimization"]
  },
  "searchIntent": "Informational — readers want a framework",
  "outline": [
    {
      "heading": "What is SEO Content Strategy?",
      "hLevel": "h2",
      "keyPoints": ["Definition", "Why it matters"],
      "targetKeywords": ["seo content strategy definition"],
      "estimatedWordCount": 400
    }
  ],
  "writingGuidelines": ["Use data", "Include examples"],
  "suggestedMedia": ["Comparison table", "Flowchart"],
  "estimatedReadingTime": "12 min",
  "seoRecommendations": ["Use keyword in H1", "Add FAQ schema"]
}
```

**Types:** `ContentBriefResult`

---

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `app/api/analyze/content-relevance/optimize/route.ts` | Content Optimizer API |
| `app/api/analyze/content-relevance/strategy/route.ts` | Content Strategy API |
| `app/api/analyze/content-relevance/brief/route.ts` | Content Brief API |

### Modified Files
| File | Change |
|------|--------|
| `lib/types.ts` | Add `ContentOptimizerResult`, `ContentStrategyResult`, `ContentBriefResult` |
| `components/content-relevance-checker.tsx` | Add action buttons, inline results, new sub-components |
| `app/api/history/route.ts` | Add `content-optimizer`, `content-strategy`, `content-brief` to `ALLOWED_TOOLS` |
| `components/history-panel.tsx` | Add new tool names to `ToolName` union |
| `components/shared-report-view.tsx` | Add rendering for relevance sub-tools |
| `app/share/[shareKey]/page.tsx` | Pass relevance payloads to SharedReportView |

---

## Save & Share Integration

Each sub-tool (optimizer, strategy, brief) gets:
- A `SaveToHistoryButton` with its own tool key
- A `HistoryPanel` integration
- A "Share" button that creates a public link
- Its own share rendering in `SharedReportView`

---

## Implementation Phases

### Phase 1: Types & API Endpoints
- Add new types
- Create 3 API routes

### Phase 2: UI Upgrade
- Add action bar with 3 buttons after relevance results
- Add inline loading/result states for each sub-tool
- Wire API calls to buttons

### Phase 3: History & Share
- Register all 3 tools in history
- Add share support
- Extend SharedReportView

### Phase 4: Polish
- Error states, loading animations, responsive layout
- Edge case handling (no content, short content, API failures)
