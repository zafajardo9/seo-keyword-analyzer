# Implementation Plan: Relevance Checker Upgrade

## File Structure

| File | Status | Purpose |
|------|--------|---------|
| `lib/types.ts` | Modify | Add 3 new types |
| `app/api/analyze/content-relevance/optimize/route.ts` | **New** | Content Optimizer API |
| `app/api/analyze/content-relevance/strategy/route.ts` | **New** | Content Strategy API |
| `app/api/analyze/content-relevance/brief/route.ts` | **New** | Content Brief API |
| `components/content-relevance-checker.tsx` | Modify | Add action bar + inline results |
| `app/api/history/route.ts` | Modify | Add 3 new tools to `ALLOWED_TOOLS` |
| `components/history-panel.tsx` | Modify | Add 3 new names to `ToolName` union |
| `components/shared-report-view.tsx` | Modify | Add relevance sub-tool rendering |
| `app/share/[shareKey]/page.tsx` | Modify | Pass relevance payloads |

---

## Phase 1: Types & API Endpoints

### Task 1.1: Add new types to `lib/types.ts`
- Add `ContentOptimizerResult`
- Add `ContentStrategyResult` (with nested `TopicCluster`, `AudienceMapping`, `CompetitiveLandscape`)
- Add `ContentBriefResult` (with nested `BriefSection`)
- Add `ContentBriefOutlineItem`

**Acceptance:** All 3 types compile and are importable.

### Task 1.2: Create Content Optimizer API
- `POST /api/analyze/content-relevance/optimize`
- Accepts: keyword, originalContent, sourceType, sourceUrl, audit, model, apiKey
- Prompts Gemini to rewrite content addressing the gaps from the relevance audit
- Returns `ContentOptimizerResult`

### Task 1.3: Create Content Strategy API
- `POST /api/analyze/content-relevance/strategy`
- Same request shape
- Prompts Gemini for topic cluster architecture, audience mapping, competitive landscape
- Returns `ContentStrategyResult`

### Task 1.4: Create Content Brief API
- `POST /api/analyze/content-relevance/brief`
- Same request shape
- Prompts Gemini for detailed content brief with outline
- Returns `ContentBriefResult`

---

## Phase 2: UI Upgrade

### Task 2.1: Add action bar to `AuditResults`
- After the existing results section, add a new "Content Intelligence" section
- 3 buttons: Content Optimizer, Content Strategy, Content Briefs
- Each button triggers a separate API call and shows loading state

### Task 2.2: Add inline result components
- `OptimizerResults` — shows optimized content, title, meta, key changes
- `StrategyResults` — shows topic cluster, audience mapping, competitive landscape
- `BriefResults` — shows content brief with outline

### Task 2.3: State management
- Add `activeTool` state (null | "optimizer" | "strategy" | "brief")
- Add result states for each tool
- Show/hide results based on active tool

---

## Phase 3: History & Share

### Task 3.1: Register in history system
- Add `content-optimizer`, `content-strategy`, `content-brief` to `ALLOWED_TOOLS`
- Add to `ToolName` union
- Wire `SaveToHistoryButton` and `HistoryPanel` for each

### Task 3.2: Share support
- Add "Share" button to each sub-tool result area
- Extend `SharedReportView` to render relevance payloads
- Update share page to pass relevance payload

---

## Dependencies

```
Task 1.1 ──> Task 1.2, Task 1.3, Task 1.4 ──> Task 2.1 ──> Task 2.2 ──> Task 2.3 ──> Task 3.1 ──> Task 3.2
```

## Effort Estimate
- Phase 1: ~30 min
- Phase 2: ~45 min
- Phase 3: ~20 min
- **Total: ~95 min**

## Critical Path
Types → API endpoints → UI → History/Share
