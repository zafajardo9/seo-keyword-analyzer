"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChartLineUp,
  CircleNotch,
  CursorClick,
  FileText,
  Globe,
  ListBullets,
  NotePencil,
  Sparkle,
  Target,
} from "@phosphor-icons/react";
import { ContentRelevanceAudit } from "@/lib/types";
import { getStoredModel, ModelSelector } from "@/components/model-selector";
import {
  ApiKeyManager,
  getStoredGeminiKey,
} from "@/components/api-key-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HistoryPanel, SaveToHistoryButton } from "@/components/history-panel";
import { InfoButton, ToolInfoDrawer } from "@/components/tool-info-drawer";

const RELEVANCE_INFO = {
  toolName: "Content Relevance Checker",
  tagline:
    "Check whether a piece of content — a draft or a live page — actually matches what someone searching for your target keyword is looking for.",
  sections: [
    {
      title: "Does your content match the intent?",
      body: "When someone searches a keyword, they have a specific expectation. This tool checks whether your content meets that expectation or drifts off-topic, so you stop guessing and know for sure.",
    },
    {
      title: "What's missing from your content",
      body: "Topics and questions that searchers expect to find on a page like yours but are absent from what you've written. Filling these gaps directly improves how relevant your page feels.",
    },
    {
      title: "Specific fixes and rewrites",
      body: "Suggested headings, sections, and rewrites that would make your content a stronger match — not generic advice, but changes tied to your exact keyword and content.",
    },
    {
      title: "A better title and description",
      body: "An improved version of your page title and meta description, written to match what searchers expect and to increase the chance they click through from search results.",
    },
  ],
};

interface RelevanceSnapshot {
  keyword: string;
  draft: string;
  url: string;
  audit: ContentRelevanceAudit | null;
}

interface ContentRelevanceCheckerProps {
  initialUrl?: string;
}

export function ContentRelevanceChecker({
  initialUrl = "",
}: ContentRelevanceCheckerProps) {
  const [model, setModel] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [url, setUrl] = React.useState(initialUrl);
  const [audit, setAudit] = React.useState<ContentRelevanceAudit | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<
    string | { message: string; detail?: string } | null
  >(null);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [infoOpen, setInfoOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);
  }, []);

  React.useEffect(() => {
    const nextUrl = initialUrl.trim();
    if (nextUrl) {
      setUrl(nextUrl);
      setDraft("");
    }
  }, [initialUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAudit(null);

    if (!draft.trim() && !url.trim()) {
      setError("Paste draft content or provide a public URL.");
      return;
    }

    const currentModel = model || getStoredModel();
    if (!currentModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/analyze/content-relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          draft: draft.trim(),
          url: url.trim(),
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(
          data.detail
            ? {
                message: data.error ?? "Failed to analyze content relevance.",
                detail: data.detail,
              }
            : (data.error ?? "Failed to analyze content relevance."),
        );
        return;
      }

      setAudit(data.audit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function openSubTool(toolPath: string) {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            keyword: keyword.trim() || audit?.targetKeyword || "",
            url: url.trim(),
            draft: draft.trim(),
            audit,
          },
        }),
      });
      const data = await res.json();
      if (data.id) {
        window.open(
          `${toolPath}?session=${data.id}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
    } catch {
      // If save fails, open tab without context — user will see an error
      window.open(toolPath, "_blank", "noopener,noreferrer");
    }
  }

  function handleOptimize() {
    openSubTool("/content-optimizer");
  }

  function handleStrategy() {
    openSubTool("/content-strategy");
  }

  function handleBrief() {
    openSubTool("/content-brief");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Home
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Sparkle size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Content Relevance Checker
            </span>
            <InfoButton onClick={() => setInfoOpen(true)} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HistoryPanel<RelevanceSnapshot>
            tool="relevance"
            refreshToken={historyRefresh}
            onRestore={(payload) => {
              setKeyword(payload.keyword ?? "");
              setDraft(payload.draft ?? "");
              setUrl(payload.url ?? "");
              setAudit(payload.audit ?? null);
              setError(null);
            }}
          />
          <ApiKeyManager />
          <ModelSelector onModelChange={setModel} />
        </div>
      </nav>

      <ToolInfoDrawer
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        {...RELEVANCE_INFO}
      />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="border border-border p-5">
              <div className="mb-5 space-y-2">
                <h1 className="font-mono text-xl font-bold tracking-tight">
                  Check Content Relevance
                </h1>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  Paste a keyword and either your draft or a blog post URL. For
                  URLs, the AI will judge relevance using only the scraped body
                  text and H1 headings.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="target-keyword"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Target Keyword
                    <span className="ml-1 text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="target-keyword"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="seo content strategy"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    Leave empty and the AI will detect the best target keyword
                    from your content.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="page-url"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Blog Post URL
                  </Label>
                  <Input
                    id="page-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/blog/post"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    Optional. If you add a URL, we scrape only the H1 text and
                    page body before sending it to AI.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="draft-content"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Draft Content or Outline
                  </Label>
                  <Textarea
                    id="draft-content"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Paste a draft paragraph, article section, or working outline..."
                    className="min-h-[320px] font-mono text-xs leading-relaxed"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="border border-destructive/40 bg-destructive/5 p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">
                        Error
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-destructive">
                          {typeof error === "string" ? error : error.message}
                        </p>
                        {typeof error === "object" &&
                          (error as { detail?: string }).detail && (
                            <details className="mt-2">
                              <summary className="cursor-pointer font-mono text-[10px] text-destructive/60 hover:text-destructive">
                                Technical details
                              </summary>
                              <p className="mt-1 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-destructive/50">
                                {(error as { detail: string }).detail}
                              </p>
                            </details>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full font-mono text-xs uppercase tracking-widest"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <CircleNotch size={13} className="animate-spin" />
                      Analyzing Relevance…
                    </>
                  ) : (
                    <>
                      <ChartLineUp size={13} />
                      Analyze Relevance
                    </>
                  )}
                </Button>
              </form>
            </section>

            <section className="flex flex-col gap-3 border border-border p-5">
              {audit && !loading && (
                <div className="flex justify-end">
                  <SaveToHistoryButton<RelevanceSnapshot>
                    tool="relevance"
                    buildPayload={() => ({
                      label: `${keyword.trim() || "(no keyword)"} \u2014 ${url.trim() || "draft"}`,
                      payload: {
                        keyword: keyword.trim(),
                        draft: draft.trim(),
                        url: url.trim(),
                        audit,
                      },
                    })}
                    onSaved={() => setHistoryRefresh((n) => n + 1)}
                  />
                </div>
              )}
              {loading ? (
                <LoadingState />
              ) : audit ? (
                <>
                  <AuditResults audit={audit} />

                  {/* Content Intelligence Action Bar */}
                  <div className="mt-6 border-t border-border pt-6">
                    <div className="mb-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkle size={12} className="text-primary" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Content Intelligence Suite
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        Go deeper with your relevance audit.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOptimize}
                        className="gap-1.5 font-mono text-[10px] uppercase tracking-widest"
                      >
                        <NotePencil size={12} />
                        Content Optimizer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleStrategy}
                        className="gap-1.5 font-mono text-[10px] uppercase tracking-widest"
                      >
                        <FileText size={12} />
                        Content Strategy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBrief}
                        className="gap-1.5 font-mono text-[10px] uppercase tracking-widest"
                      >
                        <FileText size={12} />
                        Content Brief
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openSubTool("/content-outline")}
                        className="gap-1.5 font-mono text-[10px] uppercase tracking-widest"
                      >
                        <ListBullets size={12} />
                        Content Outline
                      </Button>
                    </div>

                    <div className="mt-3 rounded border border-border bg-muted/20 p-3">
                      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                        Each tool opens in a new tab with your current context
                        pre-loaded.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-32 animate-pulse bg-muted" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="border border-border p-4">
            <div className="h-3 w-20 animate-pulse bg-muted/70" />
            <div className="mt-3 h-8 w-16 animate-pulse bg-muted/50" />
          </div>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border border-border p-4">
          <div className="h-3 w-28 animate-pulse bg-muted/70" />
          <div className="mt-3 h-3 w-full animate-pulse bg-muted/40" />
          <div className="mt-2 h-3 w-5/6 animate-pulse bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/5">
        <Target size={20} className="text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="font-mono text-sm font-semibold">
          Ready for a relevance audit
        </h2>
        <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
          The result will show intent fit, relevance scores, missing subtopics,
          off-topic areas, and stronger title or meta ideas, whether the source
          is pasted content or a live page URL.
        </p>
      </div>
    </div>
  );
}

function AuditResults({ audit }: { audit: ContentRelevanceAudit }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target size={13} className="text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Target Keyword
          </span>
          {audit.wasAutoDetected && (
            <span className="rounded border border-primary/20 bg-primary/5 px-1.5 font-mono text-[9px] uppercase tracking-wider text-primary">
              AI Detected
            </span>
          )}
        </div>
        <p className="font-mono text-sm font-semibold">{audit.targetKeyword}</p>
        {audit.sourceType === "url" && audit.sourceUrl ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe size={12} />
            <a
              href={audit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] hover:text-foreground hover:underline"
            >
              {audit.sourceUrl}
            </a>
          </div>
        ) : null}
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          {audit.verdict}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ScoreCard
          label="Intent Match"
          value={audit.intentMatchScore}
          icon={CursorClick}
        />
        <ScoreCard
          label="Relevance Score"
          value={audit.relevanceScore}
          icon={ChartLineUp}
        />
        <div className="border border-border p-4">
          <div className="flex items-center gap-1.5">
            <Sparkle size={11} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Detected Intent
            </span>
          </div>
          <p className="mt-3 font-mono text-sm leading-relaxed text-foreground">
            {audit.detectedIntent}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ListSection title="Missing Subtopics" items={audit.missingSubtopics} />
        <ListSection
          title="Off-topic or Weak Areas"
          items={audit.offTopicSections}
        />
        <ListSection
          title="Heading Suggestions"
          items={audit.headingSuggestions}
        />
        <ListSection
          title="Rewrite Suggestions"
          items={audit.rewriteSuggestions}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="border border-border p-4">
          <div className="flex items-center gap-1.5">
            <NotePencil size={11} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Improved Title
            </span>
          </div>
          <p className="mt-3 font-mono text-sm leading-relaxed text-foreground">
            {audit.improvedTitle || "No title suggestion returned."}
          </p>
        </div>

        <div className="border border-border p-4">
          <div className="flex items-center gap-1.5">
            <NotePencil size={11} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Improved Meta Description
            </span>
          </div>
          <p className="mt-3 font-mono text-sm leading-relaxed text-foreground">
            {audit.improvedMetaDescription ||
              "No meta description suggestion returned."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-3xl font-bold">{value}</span>
        <span className="pb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          /100
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-border p-4">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="mt-3 flex flex-col gap-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <p
              key={`${title}-${index}`}
              className="font-mono text-xs leading-relaxed text-foreground"
            >
              {item}
            </p>
          ))
        ) : (
          <p className="font-mono text-xs text-muted-foreground">
            No items returned.
          </p>
        )}
      </div>
    </div>
  );
}
