<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:tool-feature-requirements -->
# Every Tool Must Have These Three Features

All analysis/research tools built in this project MUST include the following three features. They are non-negotiable and should be implemented from the start, not added later.

## 1. Save to Database (History)
- Every tool result MUST be saveable to the `tool_history` table via `POST /api/history`
- Add the tool's string key to `ALLOWED_TOOLS` in `app/api/history/route.ts`
- Add the tool's string key to the `ToolName` union in `components/history-panel.tsx`
- Use the existing `SaveToHistoryButton` component from `components/history-panel.tsx`
- The payload saved should be the full result object + the input URL/query so it can be fully restored
- Cap: 50 items per tool (already enforced by the history API)

## 2. Restore from History
- Every tool MUST show a `HistoryPanel` component in its nav bar
- Use `HistoryPanel` from `components/history-panel.tsx` with the correct `tool` key
- The `onRestore` callback must fully repopulate the tool's state (results + input fields) so the user lands exactly where they left off
- Pass a `refreshToken` state integer; bump it after every successful save

## 3. Share Publicly (Generate a Public Link)
- Every tool result MUST be shareable via a permanent public URL
- Use `POST /api/share` with `{ tool, label, payload }` to create a share record in the `shared_reports` DB table
- The share key is returned as `shareKey`; the public URL is `/share/{shareKey}`
- Display the full URL inline with a copy-to-clipboard button after the share is created
- The public page at `app/share/[shareKey]/page.tsx` fetches the report server-side and renders a read-only view
- View count is tracked automatically by `GET /api/share?key=...`
- The `SharedReportView` component in `components/shared-report-view.tsx` is the base — extend it per tool

## Implementation Pattern (follow this for every new tool)

```
app/
  [tool-slug]/
    page.tsx                   ← thin wrapper, async searchParams
  api/
    analyze/[tool-slug]/
      route.ts                 ← POST: scrape → Gemini → normalize → return
  share/
    [shareKey]/
      page.tsx                 ← already exists, handles all tools via SharedReportView

components/
  [tool-slug]-panel.tsx        ← full UI: nav + form + results + Save + Share buttons
  shared-report-view.tsx       ← extend to render new tool's payload in read-only mode
```

### Checklist for every new tool
- [ ] Tool key added to `ALLOWED_TOOLS` in `app/api/history/route.ts`
- [ ] Tool key added to `ToolName` in `components/history-panel.tsx`
- [ ] `SaveToHistoryButton` wired with `buildPayload` returning `{ id, label, payload }` where `id` is a deterministic slug of the tool + input URL (e.g. `geo-aeo-https-example-com-article`). This ensures saving the same URL upserts the existing row instead of inserting a duplicate.
- [ ] `HistoryPanel` in nav with `onRestore` that restores full state
- [ ] `historyRefresh` state integer bumped after save
- [ ] "Share Report" button calling `POST /api/share`
- [ ] Share URL displayed inline with copy button after creation
- [ ] `SharedReportView` extended to render this tool's payload type
- [ ] Tool added to `TOOL_LINKS` in `components/tool-nav-dropdown.tsx`
- [ ] Tool button added to `components/hero-section.tsx`
<!-- END:tool-feature-requirements -->
