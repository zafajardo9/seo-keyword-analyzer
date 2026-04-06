"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChartLineUp, CircleNotch, CursorClick, Globe, NotePencil, Sparkle, Target } from "@phosphor-icons/react";
import { ContentRelevanceAudit } from "@/lib/types";
import { getStoredModel, ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContentRelevanceCheckerProps {
  initialUrl?: string;
}

export function ContentRelevanceChecker({ initialUrl = "" }: ContentRelevanceCheckerProps) {
  const [model, setModel] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [url, setUrl] = React.useState(initialUrl);
  const [audit, setAudit] = React.useState<ContentRelevanceAudit | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

    if (!keyword.trim()) {
      setError("Enter a target keyword first.");
      return;
    }

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
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to analyze content relevance.");
        return;
      }

      setAudit(data.audit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
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
            <span className="font-mono text-xs font-semibold">Content Relevance Checker</span>
          </div>
        </div>
        <ModelSelector onModelChange={setModel} />
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="border border-border p-5">
              <div className="mb-5 space-y-2">
                <h1 className="font-mono text-xl font-bold tracking-tight">Check Content Relevance</h1>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  Paste a keyword and either your draft or a blog post URL. For URLs, the AI will
                  judge relevance using only the scraped body text and H1 headings.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target-keyword" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Target Keyword
                  </Label>
                  <Input
                    id="target-keyword"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="seo content strategy"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page-url" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
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
                    Optional. If you add a URL, we scrape only the H1 text and page body before sending it to AI.
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
                  <Label htmlFor="draft-content" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
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
                    <p className="font-mono text-xs text-destructive">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full font-mono text-xs uppercase tracking-widest" disabled={loading}>
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

            <section className="border border-border p-5">
              {loading ? (
                <LoadingState />
              ) : audit ? (
                <AuditResults audit={audit} />
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
        <h2 className="font-mono text-sm font-semibold">Ready for a relevance audit</h2>
        <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
          The result will show intent fit, relevance scores, missing subtopics, off-topic areas,
          and stronger title or meta ideas, whether the source is pasted content or a live page URL.
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
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">{audit.verdict}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ScoreCard label="Intent Match" value={audit.intentMatchScore} icon={CursorClick} />
        <ScoreCard label="Relevance Score" value={audit.relevanceScore} icon={ChartLineUp} />
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
        <ListSection title="Off-topic or Weak Areas" items={audit.offTopicSections} />
        <ListSection title="Heading Suggestions" items={audit.headingSuggestions} />
        <ListSection title="Rewrite Suggestions" items={audit.rewriteSuggestions} />
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
            {audit.improvedMetaDescription || "No meta description suggestion returned."}
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
            <p key={`${title}-${index}`} className="font-mono text-xs leading-relaxed text-foreground">
              {item}
            </p>
          ))
        ) : (
          <p className="font-mono text-xs text-muted-foreground">No items returned.</p>
        )}
      </div>
    </div>
  );
}
