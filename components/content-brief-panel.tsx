"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleNotch, FileText } from "@phosphor-icons/react";
import { ContentBriefResult } from "@/lib/types";
import {
  getStoredModel,
  hydrateModel,
  ModelSelector,
} from "@/components/model-selector";
import {
  ApiKeyManager,
  getStoredGeminiKey,
  hydrateApiKeys,
} from "@/components/api-key-manager";

interface ContentBriefPanelProps {
  initialKeyword?: string;
  initialUrl?: string;
  initialDraft?: string;
}

export function ContentBriefPanel({
  initialKeyword = "",
  initialUrl = "",
  initialDraft = "",
}: ContentBriefPanelProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [result, setResult] = React.useState<ContentBriefResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Context loaded from the server-side session
  const [context, setContext] = React.useState<{
    keyword: string;
    url: string;
    draft: string;
    audit?: unknown;
  } | null>(null);

  // Load context from server-side session
  React.useEffect(() => {
    if (!sessionId) {
      setError("No session data found. Please run a relevance check first.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const r = await fetch(
          `/api/session?id=${encodeURIComponent(sessionId)}`,
        );
        const data = await r.json();
        if (data.payload) {
          setContext({
            keyword: data.payload.keyword || initialKeyword,
            url: data.payload.url || initialUrl,
            draft: data.payload.draft || initialDraft,
            audit: data.payload.audit,
          });
        } else {
          setError(data.error || "Session not found or expired.");
          setLoading(false);
        }
      } catch {
        setError("Failed to load session data.");
        setLoading(false);
      }
    })();
  }, [sessionId, initialKeyword, initialUrl, initialDraft]);

  // Run the brief analysis when context loads
  React.useEffect(() => {
    if (!context) return;

    const doFetch = async () => {
      await Promise.all([hydrateModel(), hydrateApiKeys()]);

      const currentModel = getStoredModel();
      if (!currentModel) {
        setError(
          "No AI model selected. Please select one from the model dropdown above.",
        );
        setLoading(false);
        return;
      }

      // Get content — if URL was used, scrape it first
      let contentForApi = context.draft;
      if (!contentForApi && context.url) {
        try {
          const scrapeRes = await fetch("/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: context.url }),
          });
          const scrapeData = await scrapeRes.json();
          contentForApi = scrapeData.bodyText?.trim() || "";
        } catch {
          setError(
            "Failed to scrape the URL. Try pasting the content directly as draft.",
          );
          setLoading(false);
          return;
        }
      }

      if (!contentForApi || contentForApi.length < 120) {
        setError(
          "Content is too short to generate a brief. Try pasting more content directly.",
        );
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/analyze/content-relevance/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: context.keyword,
            originalContent: contentForApi.slice(0, 9000),
            audit: context.audit,
            model: currentModel,
            apiKey: getStoredGeminiKey(),
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? "Failed to generate content brief.");
          return;
        }

        setResult(data.result ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    doFetch();
  }, [context]);

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/relevance"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Back
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <FileText size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Content Brief
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ApiKeyManager />
          <ModelSelector />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl">
          {context?.keyword && (
            <div className="mb-4 border border-border bg-muted/20 p-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Generating brief for keyword
              </span>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {context?.keyword}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-24">
              <CircleNotch size={16} className="animate-spin text-primary" />
              <span className="font-mono text-sm text-muted-foreground">
                Generating content brief…
              </span>
            </div>
          )}

          {error && (
            <div className="border border-destructive/40 bg-destructive/5 p-4">
              <p className="font-mono text-xs text-destructive">{error}</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              <div className="flex items-center gap-1.5">
                <FileText size={13} className="text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Content Brief Results
                </span>
              </div>

              {/* Working Title */}
              <div className="border border-border bg-muted/20 p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Working Title
                </span>
                <p className="mt-2 font-mono text-base font-bold text-foreground">
                  {result.workingTitle}
                </p>
              </div>

              {/* Keywords */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-border p-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Primary
                  </span>
                  <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {result.targetKeywords.primary}
                  </p>
                </div>
                <div className="border border-border p-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Secondary
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.targetKeywords.secondary.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border border-border p-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Related
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.targetKeywords.related.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Intent */}
              <div className="border border-border p-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Search Intent
                </span>
                <p className="mt-1 font-mono text-xs leading-relaxed text-foreground">
                  {result.searchIntent}
                </p>
              </div>

              {/* Outline */}
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Content Outline
                  <span className="ml-2 text-muted-foreground">
                    ({result.estimatedReadingTime} read)
                  </span>
                </span>
                <div className="mt-3 flex flex-col gap-3">
                  {result.outline.map((section, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-1.5 font-mono text-[10px] uppercase text-primary">
                          {section.hLevel}
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {section.heading}
                        </span>
                        {section.estimatedWordCount && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ~{section.estimatedWordCount}w
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        {section.keyPoints.map((point, j) => (
                          <p
                            key={j}
                            className="font-mono text-[10px] leading-relaxed text-muted-foreground"
                          >
                            • {point}
                          </p>
                        ))}
                      </div>
                      {section.targetKeywords &&
                        section.targetKeywords.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {section.targetKeywords.map((kw, j) => (
                              <span
                                key={j}
                                className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Writing Guidelines */}
              {result.writingGuidelines.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Writing Guidelines
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.writingGuidelines.map((g, i) => (
                      <span
                        key={i}
                        className="rounded border border-border bg-muted/20 px-2 py-1 font-mono text-[10px] text-foreground"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Media */}
              {result.suggestedMedia.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Suggested Media
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.suggestedMedia.map((m, i) => (
                      <span
                        key={i}
                        className="rounded border border-border px-2 py-1 font-mono text-[10px] text-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO Recommendations */}
              {result.seoRecommendations.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    SEO Recommendations
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {result.seoRecommendations.map((rec, i) => (
                      <p key={i} className="font-mono text-xs text-foreground">
                        → {rec}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions to Answer */}
              {result.questionsToAnswer &&
                result.questionsToAnswer.length > 0 && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Questions to Answer
                    </span>
                    <div className="mt-2 flex flex-col gap-1">
                      {result.questionsToAnswer.map((q, i) => (
                        <p
                          key={i}
                          className="font-mono text-xs text-foreground"
                        >
                          ❓ {q}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
