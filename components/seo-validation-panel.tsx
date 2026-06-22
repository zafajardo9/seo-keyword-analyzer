"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CaretDown,
  CaretUp,
  ChartLineUp,
  CircleNotch,
  Globe,
  Link as LinkIcon,
  ListChecks,
  Sparkle,
  Tag,
  Warning,
  X,
} from "@phosphor-icons/react";
import { SeoValidationResult, SeoCheckItem, SeoCategory } from "@/lib/types";
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

interface SeoSnapshot {
  url: string;
  draft: string;
  result: SeoValidationResult | null;
}

interface SeoValidationPanelProps {
  initialUrl?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "title-meta": <Tag size={12} />,
  "heading-hierarchy": <ListChecks size={12} />,
  "link-audit": <LinkIcon size={12} />,
  "og-schema": <Sparkle size={12} />,
};

export function SeoValidationPanel({
  initialUrl = "",
}: SeoValidationPanelProps) {
  const [model, setModel] = React.useState("");
  const [url, setUrl] = React.useState(initialUrl);
  const [draft, setDraft] = React.useState("");
  const [result, setResult] = React.useState<SeoValidationResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);
  }, []);

  React.useEffect(() => {
    const next = initialUrl.trim();
    if (next) {
      setUrl(next);
      setDraft("");
    }
  }, [initialUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!draft.trim() && !url.trim()) {
      setError("Paste content or provide a public URL.");
      return;
    }

    const currentModel = model || getStoredModel();
    if (!currentModel) {
      setError("No AI model selected.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/analyze/seo-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          draft: draft.trim(),
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to validate page.");
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
            href="/"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Home
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <ListChecks size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              SEO Validation
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HistoryPanel<SeoSnapshot>
            tool="seo-validation"
            refreshToken={historyRefresh}
            onRestore={(payload) => {
              setUrl(payload.url ?? "");
              setDraft(payload.draft ?? "");
              setResult(payload.result ?? null);
              setError(null);
            }}
          />
          <ApiKeyManager />
          <ModelSelector onModelChange={setModel} />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="border border-border p-5">
              <div className="mb-5 space-y-2">
                <h1 className="font-mono text-xl font-bold tracking-tight">
                  SEO Validation
                </h1>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  Paste a blog URL or full page content. We run a structured
                  pass/fail checklist across titles, headings, links, OG tags,
                  and schema — no guessing, every check is objective.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="seo-url"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Blog Post URL
                  </Label>
                  <Input
                    id="seo-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/blog/post"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
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
                    htmlFor="seo-draft"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Full Page Content
                  </Label>
                  <Textarea
                    id="seo-draft"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Paste the full page content including title, headings, links, and body..."
                    className="min-h-[260px] font-mono text-xs leading-relaxed"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="border border-destructive/40 bg-destructive/5 p-3">
                    <p className="font-mono text-xs text-destructive">
                      {error}
                    </p>
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
                      Validating…
                    </>
                  ) : (
                    <>
                      <ListChecks size={13} />
                      Run Validation
                    </>
                  )}
                </Button>
              </form>
            </section>

            <section className="flex flex-col gap-3 border border-border p-5">
              {result && !loading && (
                <div className="flex justify-end">
                  <SaveToHistoryButton<SeoSnapshot>
                    tool="seo-validation"
                    buildPayload={() => ({
                      label: `${url.trim() || "pasted content"}`,
                      payload: {
                        url: url.trim(),
                        draft: draft.trim(),
                        result,
                      },
                    })}
                    onSaved={() => setHistoryRefresh((n) => n + 1)}
                  />
                </div>
              )}
              {loading ? (
                <LoadingState />
              ) : result ? (
                <ValidationResults result={result} />
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
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-border p-4">
            <div className="h-3 w-20 animate-pulse bg-muted/70" />
            <div className="mt-3 h-8 w-16 animate-pulse bg-muted/50" />
          </div>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-border p-4">
          <div className="h-3 w-28 animate-pulse bg-muted/70" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse bg-muted/40" />
            <div className="h-3 w-5/6 animate-pulse bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/5">
        <ListChecks size={20} className="text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="font-mono text-sm font-semibold">Ready to validate</h2>
        <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
          Submit a URL or paste content to run the full checklist — title tag,
          meta description, heading hierarchy, links, OG tags, and schema.
        </p>
      </div>
    </div>
  );
}

function ValidationResults({ result }: { result: SeoValidationResult }) {
  const [showRecs, setShowRecs] = React.useState(false);
  const passPct =
    result.totalCount > 0
      ? Math.round((result.passCount / result.totalCount) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Score bar */}
      <div className="flex items-center gap-4 border border-border p-4">
        <div className="flex items-end gap-1">
          <span className="font-mono text-4xl font-bold text-foreground">
            {result.overallScore}
          </span>
          <span className="pb-1 font-mono text-[10px] text-muted-foreground">
            /100
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {result.passCount} of {result.totalCount} checks passed
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {passPct}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted">
            <div
              className={`h-full transition-all ${
                passPct >= 80
                  ? "bg-green-500"
                  : passPct >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${passPct}%` }}
            />
          </div>
        </div>
      </div>

      {result.url && (
        <div className="flex items-center gap-2 border border-border p-3">
          <Globe size={12} className="text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground">
            {result.url}
          </span>
        </div>
      )}

      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
        {result.summary}
      </p>

      {/* Critical Issues */}
      {result.criticalIssues.length > 0 && (
        <div className="border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-1.5">
            <Warning size={12} className="text-red-500" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-red-500">
              Critical Issues
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {result.criticalIssues.map((issue, i) => (
              <p key={i} className="font-mono text-xs text-red-600">
                ✗ {issue}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* View All Recommendations button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowRecs(true)}
          className="gap-1.5 font-mono text-[10px] uppercase tracking-widest"
        >
          <Warning size={12} />
          View Recommendations
        </Button>
      </div>

      {/* Categories */}
      {result.categories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}

      {/* Recommendations Modal */}
      {showRecs && (
        <RecommendationsModal
          result={result}
          onClose={() => setShowRecs(false)}
        />
      )}
    </div>
  );
}

function CategorySection({ category }: { category: SeoCategory }) {
  const [expanded, setExpanded] = React.useState(true);
  const passCount = category.checks.filter((c) => c.status === "pass").length;
  const failCount = category.checks.filter((c) => c.status === "fail").length;
  const warnCount = category.checks.filter(
    (c) => c.status === "warning",
  ).length;

  return (
    <div className="border border-border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-b border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          {CATEGORY_ICONS[category.id] || <ListChecks size={12} />}
          <span className="font-mono text-xs font-semibold text-foreground">
            {category.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {failCount > 0 && (
            <span className="font-mono text-[10px] text-red-500">
              {failCount} fail
            </span>
          )}
          {warnCount > 0 && (
            <span className="font-mono text-[10px] text-yellow-600">
              {warnCount} warn
            </span>
          )}
          {passCount > 0 && (
            <span className="font-mono text-[10px] text-green-600">
              {passCount} pass
            </span>
          )}
          <span className="text-muted-foreground">
            {expanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="flex flex-col divide-y divide-border">
          {category.checks.map((check, i) => (
            <CheckRow key={i} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: SeoCheckItem }) {
  const [open, setOpen] = React.useState(check.status === "fail");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/10"
      >
        <span className="shrink-0">
          {check.status === "pass" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
              <span className="text-[10px] text-green-600">✓</span>
            </span>
          ) : check.status === "fail" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-[10px] text-red-500">✗</span>
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20">
              <span className="text-[10px] text-yellow-600">!</span>
            </span>
          )}
        </span>
        <span className="flex-1 font-mono text-xs text-foreground">
          {check.label}
        </span>
        {check.value && (
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">
            {check.value}
          </span>
        )}
      </button>
      {open && check.recommendation && (
        <div className="border-t border-border bg-muted/10 px-4 py-2">
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Fix: </span>
            {check.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

const PLATFORMS = [
  { id: null, label: "Default" },
  { id: "WordPress", label: "WordPress" },
  { id: "Framer", label: "Framer" },
  { id: "Custom Code", label: "Custom Code" },
] as const;

function RecommendationsModal({
  result,
  onClose,
}: {
  result: SeoValidationResult;
  onClose: () => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = React.useState<string | null>(
    null,
  );

  const actionItems = result.categories.flatMap((cat) =>
    cat.checks
      .filter((c) => c.status === "fail" || c.status === "warning")
      .map((c) => ({
        ...c,
        categoryLabel: cat.label.replace(/\d+ · /, ""),
      })),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Warning size={14} className="text-primary" />
            <span className="font-mono text-sm font-semibold">
              Recommendations
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              ({actionItems.length} item{actionItems.length !== 1 ? "s" : ""})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Platform filter bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-6 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            View fixes for:
          </span>
          {PLATFORMS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setSelectedPlatform(p.id)}
              className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                selectedPlatform === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {actionItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <span className="text-xl text-green-500">✓</span>
              </span>
              <p className="font-mono text-sm font-semibold text-foreground">
                All checks passed!
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                No recommendations needed.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {actionItems.map((item, i) => (
                <RecommendationCard
                  key={i}
                  item={item}
                  selectedPlatform={selectedPlatform}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  item,
  selectedPlatform,
}: {
  item: SeoCheckItem & { categoryLabel: string };
  selectedPlatform: string | null;
}) {
  const platforms = item.platformFixes ?? [];

  // Find the matching platform fix if one is selected
  const activePlatformFix = selectedPlatform
    ? platforms.find(
        (p) => p.platform.toLowerCase() === selectedPlatform.toLowerCase(),
      )
    : null;

  const showPlatformFix =
    activePlatformFix !== null && activePlatformFix !== undefined;

  return (
    <div className="border border-border p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {item.status === "fail" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-[10px] text-red-500">✗</span>
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20">
              <span className="text-[10px] text-yellow-600">!</span>
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {item.categoryLabel}
            </span>
            <span
              className={`rounded px-1 font-mono text-[9px] uppercase tracking-wider ${
                item.status === "fail"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-yellow-500/10 text-yellow-600"
              }`}
            >
              {item.status}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-foreground">
            {item.label}
          </p>
          {item.value && (
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              Current: {item.value}
            </p>
          )}

          {/* Show platform-specific fix or general fix */}
          {showPlatformFix ? (
            <div className="mt-2 rounded border border-primary/30 bg-primary/5 p-3">
              <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                {selectedPlatform} Guide
              </p>
              <ol className="flex flex-col gap-1.5">
                {activePlatformFix!.steps.map((step, si) => (
                  <li
                    key={si}
                    className="flex items-start gap-2 font-mono text-[10px] leading-relaxed text-foreground"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[8px] text-primary">
                      {si + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : item.recommendation && selectedPlatform ? (
            <div className="mt-2 rounded border border-border bg-muted/20 p-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                Fix
              </p>
              <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-foreground">
                {item.recommendation}
              </p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                No {selectedPlatform}-specific guide available. Use the general
                fix above.
              </p>
            </div>
          ) : item.recommendation ? (
            <div className="mt-2 rounded border border-border bg-muted/20 p-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                Fix
              </p>
              <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-foreground">
                {item.recommendation}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
