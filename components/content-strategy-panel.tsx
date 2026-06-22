"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleNotch, Strategy } from "@phosphor-icons/react";
import { ContentStrategyResult } from "@/lib/types";
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

interface ContentStrategyPanelProps {
  initialKeyword?: string;
  initialUrl?: string;
  initialDraft?: string;
}

export function ContentStrategyPanel({
  initialKeyword = "",
  initialUrl = "",
  initialDraft = "",
}: ContentStrategyPanelProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [result, setResult] = React.useState<ContentStrategyResult | null>(
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

  // Run the strategy analysis when context loads
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
          "Content is too short to analyze. Try pasting more content directly.",
        );
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/analyze/content-relevance/strategy", {
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
          setError(data.error ?? "Failed to generate content strategy.");
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
            <Strategy size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Content Strategy
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
                Building content strategy…
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
                <Strategy size={13} className="text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Content Strategy Results
                </span>
              </div>

              {/* Topic Cluster */}
              <div className="border border-border p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Topic Cluster Architecture
                </span>
                <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                  {result.topicCluster.pillarTopic}
                </p>
                {result.topicCluster.clusterTopics.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {result.topicCluster.clusterTopics.map((ct, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-primary/30 pl-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {ct.topic}
                          </span>
                          <span className="rounded border border-primary/20 bg-primary/5 px-1.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                            {ct.type}
                          </span>
                        </div>
                        {ct.targetKeywords && ct.targetKeywords.length > 0 && (
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            Keywords: {ct.targetKeywords.join(", ")}
                          </p>
                        )}
                        {ct.rationale && (
                          <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
                            {ct.rationale}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {result.topicCluster.internalLinkingStrategy && (
                  <div className="mt-3 rounded border border-border bg-muted/20 p-3">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Internal Linking Strategy
                    </p>
                    <p className="mt-1 font-mono text-xs leading-relaxed text-foreground">
                      {result.topicCluster.internalLinkingStrategy}
                    </p>
                  </div>
                )}
              </div>

              {/* Audience Mapping */}
              <div className="border border-border p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Audience Mapping
                </span>
                <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                  {result.audienceMapping.primaryAudience}
                </p>
                <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
                  {result.audienceMapping.personaDetails}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {result.audienceMapping.contentPreferences.length > 0 && (
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Content Preferences
                      </span>
                      {result.audienceMapping.contentPreferences.map((p, i) => (
                        <p
                          key={i}
                          className="font-mono text-[10px] text-foreground"
                        >
                          • {p}
                        </p>
                      ))}
                    </div>
                  )}
                  {result.audienceMapping.painPoints.length > 0 && (
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Pain Points
                      </span>
                      {result.audienceMapping.painPoints.map((p, i) => (
                        <p
                          key={i}
                          className="font-mono text-[10px] text-foreground"
                        >
                          • {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Search Behavior
                  </span>
                  <p className="mt-1 font-mono text-xs leading-relaxed text-foreground">
                    {result.audienceMapping.searchBehavior}
                  </p>
                </div>
              </div>

              {/* Competitive Landscape */}
              <div className="border border-border p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Competitive Landscape
                </span>
                {result.competitiveLandscape.topCompetitors.length > 0 && (
                  <div className="mt-3 flex flex-col gap-3">
                    {result.competitiveLandscape.topCompetitors.map(
                      (comp, i) => (
                        <div key={i} className="border border-border p-3">
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {comp.name}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {comp.angle}
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {comp.strengths.length > 0 && (
                              <div>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                  Strengths
                                </span>
                                {comp.strengths.map((s, j) => (
                                  <p
                                    key={j}
                                    className="font-mono text-[10px] text-foreground"
                                  >
                                    + {s}
                                  </p>
                                ))}
                              </div>
                            )}
                            {comp.weaknesses.length > 0 && (
                              <div>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                  Weaknesses
                                </span>
                                {comp.weaknesses.map((w, j) => (
                                  <p
                                    key={j}
                                    className="font-mono text-[10px] text-destructive"
                                  >
                                    − {w}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          {comp.gapToExploit && (
                            <div className="mt-2 rounded border border-primary/20 bg-primary/5 p-2">
                              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                                Gap to Exploit
                              </p>
                              <p className="font-mono text-[10px] leading-relaxed text-foreground">
                                {comp.gapToExploit}
                              </p>
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
                <div className="mt-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Market Positioning
                  </span>
                  <p className="mt-1 font-mono text-xs leading-relaxed text-foreground">
                    {result.competitiveLandscape.marketPositioning}
                  </p>
                </div>
                {result.competitiveLandscape.contentDifferentiation.length >
                  0 && (
                  <div className="mt-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Content Differentiation
                    </span>
                    {result.competitiveLandscape.contentDifferentiation.map(
                      (d, i) => (
                        <p
                          key={i}
                          className="font-mono text-xs text-foreground"
                        >
                          → {d}
                        </p>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
