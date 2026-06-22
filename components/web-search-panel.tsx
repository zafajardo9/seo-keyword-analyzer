"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleNotch,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react";
import { getStoredModel, hydrateModel, ModelSelector } from "@/components/model-selector";
import { ApiKeyManager, getStoredGeminiKey, hydrateApiKeys } from "@/components/api-key-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WebSearchPanel() {
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState("");
  const [searchQueries, setSearchQueries] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;

    await Promise.all([hydrateModel(), hydrateApiKeys()]);
    const currentModel = getStoredModel();
    if (!currentModel) {
      setError("No AI model selected. Please select one from the dropdown above.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult("");
    setSearchQueries([]);

    try {
      const res = await fetch("/api/analyze/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, model: currentModel, apiKey: getStoredGeminiKey() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Search failed.");
        return;
      }

      setResult(data.result ?? "");
      setSearchQueries(data.searchQueries ?? []);
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
          <Link href="/" className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={12} /> Home
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <MagnifyingGlass size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">Web Search</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ApiKeyManager />
          <ModelSelector />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl space-y-6">
          {/* Search input */}
          <div className="border border-border p-5">
            <div className="mb-4 space-y-1">
              <h1 className="font-mono text-lg font-bold tracking-tight">AI Web Search</h1>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                Ask any question. The AI searches Google in real-time and synthesizes an answer with citations.
              </p>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What are the latest SEO trends for 2026?"
                  className="font-mono text-xs"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="gap-1.5 font-mono text-xs uppercase tracking-widest"
              >
                {loading ? (
                  <><CircleNotch size={13} className="animate-spin" /> Searching…</>
                ) : (
                  <><MagnifyingGlass size={13} /> Search</>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-3 border border-destructive/40 bg-destructive/5 p-3">
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16">
              <CircleNotch size={16} className="animate-spin text-primary" />
              <span className="font-mono text-sm text-muted-foreground">Searching the web…</span>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="space-y-4">
              <div className="border border-border p-5">
                <div className="mb-3 flex items-center gap-1.5">
                  <Sparkle size={13} className="text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Answer</span>
                </div>
                <div className="prose prose-sm max-w-none font-mono text-xs leading-relaxed text-foreground prose-headings:font-semibold prose-headings:text-foreground prose-p:mb-2 prose-ul:ml-4 prose-li:mb-1 prose-strong:text-foreground">
                  <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, "<br/>") }} />
                </div>
              </div>

              {/* Search queries */}
              {searchQueries.length > 0 && (
                <details className="border border-border">
                  <summary className="cursor-pointer px-4 py-3 font-mono text-xs font-semibold text-foreground hover:bg-muted/20">
                    Search queries ({searchQueries.length})
                  </summary>
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {searchQueries.map((sq, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 font-mono text-[10px] text-primary">{i + 1}.</span>
                          <span className="font-mono text-[10px] italic text-muted-foreground">&ldquo;{sq}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
