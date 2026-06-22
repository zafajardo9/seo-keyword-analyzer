# Feature: Web Search — AI-Powered Search with Real-Time Results

**Status:** Planned → Implemented  
**Priority:** Medium  
**Target Release:** Next  

---

## Overview

A standalone web search tool that lets users type any question and get an AI-powered answer grounded in real-time Google Search results. Unlike traditional search, the AI synthesizes information from multiple sources into a coherent, cited answer.

---

## How It Works

1. User enters a query (e.g. *"What are the latest SEO trends for 2026?"*)
2. The API calls Gemini with Google Search grounding enabled (`google_search` tool)
3. Gemini runs real Google searches, reads the results, and synthesizes an answer
4. The response includes:
   - The AI-generated answer with inline citations
   - The actual search queries Gemini ran against Google
   - Source metadata (when available)

---

## Technical Implementation

**Function:** `generateGeminiTextWithSearch()` in `lib/gemini.ts` — already exists and is used by Content Outline, Content Generator, and Prompt Analyzer.

**API:** `POST /api/analyze/web-search`

**Panel:** `components/web-search-panel.tsx`

**Route:** `app/web-search/page.tsx`

---

## UI Flow

```
[Input: Ask any question...]
          │
          ▼
[Search button] → "Searching the web…"
          │
          ▼
[Answer with citations]
[Search queries that were run]
```

The panel shows:
- A clean chat-like input at the top
- The AI's answer with citations highlighted
- An expandable "Search queries" section showing what Gemini actually searched
- A loading state during search

---

## Registration

- Sidebar: "Web Search" with `MagnifyingGlass` icon
- Hero section: button in the tools grid
- Tool nav dropdown: description "AI-powered search with real-time web results"

---

## Acceptance Criteria

- [ ] User can type any question and get a web-grounded answer
- [ ] Search queries are displayed below the answer
- [ ] Loading state shows "Searching the web…"
- [ ] Errors show clear, actionable messages
- [ ] Tool is accessible from sidebar, homepage, and nav dropdown
