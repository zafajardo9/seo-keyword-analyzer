"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleNotch,
  Copy,
  NotePencil,
} from "@phosphor-icons/react";
import { ContentOptimizerResult } from "@/lib/types";
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

interface ContentOptimizerPanelProps {
  initialKeyword?: string;
  initialUrl?: string;
  initialDraft?: string;
}

export function ContentOptimizerPanel({
  initialKeyword = "",
  initialUrl = "",
  initialDraft = "",
}: ContentOptimizerPanelProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [result, setResult] = React.useState<ContentOptimizerResult | null>(
    null,
  );
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

  React.useEffect(() => {
    if (!context) return;

    const doFetch = async () => {
      // Hydrate model and API key from server before using cached values
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
          "Content is too short to optimize. Please provide more content or try pasting it directly.",
        );
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/analyze/content-relevance/optimize", {
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
          setError(data.error ?? "Failed to optimize content.");
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
            <NotePencil size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Content Optimizer
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
                Analyzing for keyword
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
                Optimizing content…
              </span>
            </div>
          )}

          {error && (
            <div className="border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">
                  Error
                </span>
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              <div className="flex items-center gap-1.5">
                <NotePencil size={13} className="text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Content Optimizer Results
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-border p-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Improved Relevance
                  </span>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-mono text-3xl font-bold text-foreground">
                      {result.improvedScores.estimatedRelevanceScore}
                    </span>
                    <span className="pb-1 font-mono text-[10px] text-muted-foreground">
                      /100
                    </span>
                  </div>
                </div>
                <div className="border border-border p-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Improved Intent Match
                  </span>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-mono text-3xl font-bold text-foreground">
                      {result.improvedScores.estimatedIntentMatchScore}
                    </span>
                    <span className="pb-1 font-mono text-[10px] text-muted-foreground">
                      /100
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-muted/20 p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Optimized Title
                </span>
                <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                  {result.optimizedTitle}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Optimized Meta Description
                </span>
                <p className="mt-2 font-mono text-xs leading-relaxed text-foreground">
                  {result.optimizedMetaDescription}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Optimized Content
                  </span>
                  <CopyButton text={result.optimizedContent} />
                </div>
                <div className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-muted/20 p-4 font-mono text-xs leading-relaxed text-foreground">
                  {result.optimizedContent}
                </div>
              </div>

              {result.keyChanges.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Key Changes
                  </span>
                  <div className="mt-2 flex flex-col gap-2">
                    {result.keyChanges.map((change, i) => (
                      <p
                        key={i}
                        className="flex items-start gap-2 font-mono text-xs text-foreground"
                      >
                        <span className="mt-0.5 text-primary">→</span>
                        {change}
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={11} className="text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy size={11} />
          Copy
        </>
      )}
    </button>
  );
}
