"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleNotch,
  Copy,
  FileText,
  Globe,
  ListBullets,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react";
import { ContentOutlineResult } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ContentOutlinePanelProps {
  initialKeyword?: string;
  sessionId?: string;
}

export function ContentOutlinePanel({
  initialKeyword = "",
  sessionId: propSessionId = "",
}: ContentOutlinePanelProps) {
  const [keyword, setKeyword] = React.useState(initialKeyword);
  const [result, setResult] = React.useState<ContentOutlineResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGenerate() {
    const kw = keyword.trim();
    if (!kw) {
      setError("Enter a keyword first.");
      return;
    }

    await Promise.all([hydrateModel(), hydrateApiKeys()]);

    const currentModel = getStoredModel();
    if (!currentModel) {
      setError("No AI model selected. Please select one from the dropdown above.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze/content-relevance/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kw,
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(
          data.detail
            ? { message: data.error, detail: data.detail } as unknown as string
            : data.error ?? "Failed to generate outline.",
        );
        return;
      }

      setResult(data.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

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
            <ListBullets size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Content Outline
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ApiKeyManager />
          <ModelSelector />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl space-y-6">
          {/* Input section */}
          <div className="border border-border p-5">
            <div className="mb-4 space-y-1">
              <h1 className="font-mono text-lg font-bold tracking-tight">
                SERP-Informed Content Outline
              </h1>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                Enter a keyword and the AI will search Google, analyze top-ranking pages, and generate a
                data-driven outline with H2/H3 hierarchy and word counts.
              </p>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label
                  htmlFor="outline-keyword"
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Target Keyword
                </label>
                <Input
                  id="outline-keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="seo content strategy"
                  className="font-mono text-xs"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
              </div>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !keyword.trim()}
                className="gap-1.5 font-mono text-xs uppercase tracking-widest"
              >
                {loading ? (
                  <>
                    <CircleNotch size={13} className="animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <MagnifyingGlass size={13} />
                    Generate Outline
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-3 border border-destructive/40 bg-destructive/5 p-3">
                <p className="font-mono text-xs text-destructive">
                  {typeof error === "string" ? error : ""}
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16">
              <CircleNotch size={16} className="animate-spin text-primary" />
              <span className="font-mono text-sm text-muted-foreground">
                Searching SERP and building outline…
              </span>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-1.5">
                  <Sparkle size={12} className="text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    SERP-Informed Outline for
                  </span>
                </div>
                <p className="mt-2 font-mono text-lg font-bold text-foreground">
                  {result.targetKeyword}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Estimated total: ~{result.totalEstimatedWords} words
                </p>
              </div>

              {/* SERP Analysis */}
              <div className="border border-border p-4">
                <div className="flex items-center gap-1.5">
                  <Globe size={12} className="text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    SERP Analysis — Top Results
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {result.serpAnalysis.topResults.map((sr, i) => (
                    <details key={i} className="border border-border">
                      <summary className="cursor-pointer px-3 py-2 font-mono text-xs font-semibold text-foreground hover:bg-muted/20">
                        {i + 1}. {sr.title}
                      </summary>
                      <div className="border-t border-border px-3 py-2">
                        <a
                          href={sr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-2 block font-mono text-[10px] text-primary hover:underline"
                        >
                          {sr.url}
                        </a>
                        {sr.headings.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {sr.headings.map((h, j) => (
                              <span
                                key={j}
                                className="font-mono text-[10px] text-muted-foreground"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            No headings found
                          </span>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>

              {/* Common Patterns & Gaps */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-border p-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Common Heading Patterns
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {result.serpAnalysis.commonHeadingPatterns.map((p, i) => (
                      <p key={i} className="font-mono text-xs text-foreground">
                        • {p}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="border border-primary/30 bg-primary/5 p-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Content Gaps to Exploit
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {result.serpAnalysis.contentGaps.map((g, i) => (
                      <p key={i} className="font-mono text-xs text-foreground">
                        → {g}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Outline */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListBullets size={12} className="text-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Recommended Outline
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      (~{result.totalEstimatedWords} words total)
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {result.recommendedOutline.map((section, i) => (
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
                      <div className="mt-1 flex flex-col gap-0.5">
                        {section.keyPoints.map((point, j) => (
                          <p
                            key={j}
                            className="font-mono text-[10px] leading-relaxed text-muted-foreground"
                          >
                            • {point}
                          </p>
                        ))}
                      </div>
                      {section.targetKeywords && section.targetKeywords.length > 0 && (
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

              {/* SEO Tips */}
              {result.seoTips.length > 0 && (
                <div className="border border-border p-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    SEO Tips
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {result.seoTips.map((tip, i) => (
                      <p key={i} className="font-mono text-xs text-foreground">
                        → {tip}
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
