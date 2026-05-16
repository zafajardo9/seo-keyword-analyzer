"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Atom,
  Brain,
  Broadcast,
  ChatCircle,
  ChartPolar,
  Check,
  CircleNotch,
  Copy,
  Question,
  ShareNetwork,
  Target,
  Warning,
} from "@phosphor-icons/react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { GeoAeoAudit, GeoAeoDimension, LlmCitationPotential } from "@/lib/types";
import { ModelSelector, getStoredModel } from "@/components/model-selector";
import { ApiKeyManager, getStoredGeminiKey } from "@/components/api-key-manager";
import { HistoryPanel, SaveToHistoryButton } from "@/components/history-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoButton, ToolInfoDrawer } from "@/components/tool-info-drawer";

const GEO_AEO_INFO = {
  toolName: "GEO & AEO Analyzer",
  tagline: "Find out how likely your page is to be cited or recommended by AI assistants like ChatGPT, Gemini, or Perplexity when someone asks a related question.",
  sections: [
    {
      title: "Will AI models recommend your page?",
      body: "AI assistants pull from pages they consider trustworthy, well-written, and authoritative. This score tells you where your page stands on those signals — and what's holding it back.",
    },
    {
      title: "Will your page be the direct answer?",
      body: "Sometimes AI gives one direct answer to a question. This part of the score looks at whether your content is structured in a way that makes it easy for AI to extract and present as that answer.",
    },
    {
      title: "Questions your page already answers",
      body: "The specific questions your content is a strong match for right now, based on how it's written and what it covers.",
    },
    {
      title: "What to add or improve",
      body: "Questions your page should be answering but doesn't — plus practical steps to make your content more likely to be cited in AI-generated responses.",
    },
  ],
};

interface GeoAeoPanelProps {
  initialUrl?: string;
}

export function GeoAeoPanel({ initialUrl = "" }: GeoAeoPanelProps) {
  const [model, setModel] = React.useState("");
  const [url, setUrl] = React.useState(initialUrl);
  const [audit, setAudit] = React.useState<GeoAeoAudit | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [shareKey, setShareKey] = React.useState<string | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);
  }, []);

  React.useEffect(() => {
    if (initialUrl.trim()) {
      setUrl(initialUrl.trim());
      handleAnalyze(initialUrl.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAnalyze(targetUrl?: string) {
    const resolvedUrl = (targetUrl ?? url).trim();
    if (!resolvedUrl) {
      setError("Enter a URL to analyze.");
      return;
    }

    const currentModel = model || getStoredModel();
    if (!currentModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }

    setError(null);
    setAudit(null);
    setLoading(true);

    try {
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: resolvedUrl }),
      });

      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok || scrapeData.error) {
        setError(scrapeData.error ?? "Failed to scrape the page.");
        return;
      }

      const auditRes = await fetch("/api/analyze/geo-aeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrapedContent: scrapeData,
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });

      const auditData = await auditRes.json();
      if (!auditRes.ok || auditData.error) {
        setError(auditData.error ?? "Failed to analyze GEO & AEO.");
        return;
      }

      setAudit(auditData.audit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAnalyze();
  }

  async function handleShare() {
    if (!audit || !url) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "geo-aeo",
          label: url,
          payload: { audit, url },
        }),
      });
      const data = await res.json();
      if (data.shareKey) {
        setShareKey(data.shareKey);
      }
    } catch {
      // ignore
    } finally {
      setSharing(false);
    }
  }

  function handleCopyLink() {
    if (!shareKey) return;
    const shareUrl = `${window.location.origin}/share/${shareKey}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRestoreFromHistory(payload: unknown) {
    const p = payload as { audit: GeoAeoAudit; url: string };
    if (p?.audit) setAudit(p.audit);
    if (p?.url) setUrl(p.url);
    setShareKey(null);
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
            <Brain size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold">GEO &amp; AEO Analyzer</span>
            <InfoButton onClick={() => setInfoOpen(true)} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HistoryPanel
            tool="geo-aeo"
            onRestore={handleRestoreFromHistory}
            refreshToken={historyRefresh}
          />
          <ApiKeyManager />
          <ModelSelector onModelChange={setModel} />
        </div>
      </nav>

      <ToolInfoDrawer open={infoOpen} onClose={() => setInfoOpen(false)} {...GEO_AEO_INFO} />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <h1 className="font-mono text-xl font-bold tracking-tight">
              GEO &amp; AEO Analyzer
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              Score how likely your content is to be cited by AI assistants like Gemini, ChatGPT, and Perplexity.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
            <Input
              type="url"
              placeholder="https://example.com/your-article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 font-mono text-xs"
            />
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest"
            >
              {loading ? (
                <>
                  <CircleNotch size={13} className="animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Brain size={13} />
                  Analyze
                </>
              )}
            </Button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-3"
            >
              <Warning size={14} className="mt-0.5 shrink-0 text-destructive" />
              <p className="font-mono text-xs text-destructive">{error}</p>
            </motion.div>
          )}

          {loading && !audit && <LoadingSkeleton />}

          {audit && (
            <>
              <AuditResults audit={audit} />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex flex-col gap-3 border-t border-border pt-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <SaveToHistoryButton
                    tool="geo-aeo"
                    disabled={!audit}
                    buildPayload={() => ({
                      id: `geo-aeo-${url.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 60)}`,
                      label: url || "GEO & AEO Analysis",
                      payload: { audit, url },
                    })}
                    onSaved={() => setHistoryRefresh((n) => n + 1)}
                  />

                  {!shareKey ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      disabled={sharing}
                      className="gap-1.5 font-mono text-[11px] uppercase tracking-widest"
                    >
                      {sharing ? (
                        <>
                          <CircleNotch size={12} className="animate-spin" />
                          Creating link…
                        </>
                      ) : (
                        <>
                          <ShareNetwork size={12} />
                          Share Report
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 border border-border bg-muted/20 px-3 py-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/share/${shareKey}`
                          : `/share/${shareKey}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="ml-1 text-muted-foreground transition-colors hover:text-primary"
                        title="Copy link"
                      >
                        {copied ? (
                          <Check size={13} className="text-green-500" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AuditResults({ audit }: { audit: GeoAeoAudit }) {
  const geoDims = audit.dimensions.filter((d) => d.group === "geo");
  const aeoDims = audit.dimensions.filter((d) => d.group === "aeo");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Score summary */}
      <div className="flex flex-col gap-4 border border-border p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-primary" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest">
              LLM Visibility Score
            </span>
          </div>
          <div className="flex items-end gap-3">
            <span className="font-mono text-5xl font-bold tracking-tight text-foreground">
              {audit.overallScore}
            </span>
            <span className="pb-1 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              /100
            </span>
          </div>
          <p className="max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
            {audit.verdict}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreMetaCard label="GEO Score" value={`${audit.geoScore}`} subtitle="Generative Engine" />
          <ScoreMetaCard label="AEO Score" value={`${audit.aeoScore}`} subtitle="Answer Engine" />
          <CitationBadge potential={audit.llmCitationPotential} reasoning={audit.llmCitationReasoning} />
        </div>
      </div>

      {/* GEO section */}
      <DimensionSection
        title="GEO — Generative Engine Optimization"
        subtitle="How likely AI models are to trust and cite this page"
        icon={Broadcast}
        dimensions={geoDims}
      />

      {/* AEO section */}
      <DimensionSection
        title="AEO — Answer Engine Optimization"
        subtitle="How well the page surfaces as a direct answer in AI results"
        icon={ChatCircle}
        dimensions={aeoDims}
      />

      {/* Action lists */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard
          title="Top Questions Answered"
          icon={Question}
          items={audit.topQuestionsAnswered}
          tone="positive"
        />
        <ListCard
          title="Questions to Add"
          icon={Question}
          items={audit.missingQuestionsToAdd}
          tone="action"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ListCard
          title="Schema Opportunities"
          icon={Atom}
          items={audit.schemaMarkupOpportunities}
          tone="default"
        />
        <ListCard
          title="GEO Recommendations"
          icon={Broadcast}
          items={audit.geoRecommendations}
          tone="action"
        />
        <ListCard
          title="AEO Recommendations"
          icon={ChatCircle}
          items={audit.aeoRecommendations}
          tone="action"
        />
      </div>
    </motion.div>
  );
}

function DimensionSection({
  title,
  subtitle,
  icon: Icon,
  dimensions,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  dimensions: GeoAeoDimension[];
}) {
  const radarData = dimensions.map((d) => ({
    subject: d.label,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div className="flex flex-col gap-4 border border-border p-5">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-primary" />
        <div>
          <span className="block font-mono text-xs font-semibold uppercase tracking-widest">
            {title}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="min-w-0 border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <ChartPolar size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Dimensions
            </span>
          </div>
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="99%" height={280} minWidth={240}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(120,120,120,0.22)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "currentColor", fontSize: 9, fontFamily: "monospace" }}
                  className="text-muted-foreground"
                />
                <Radar
                  dataKey="score"
                  stroke="rgba(203,99,30,1)"
                  fill="rgba(203,99,30,0.2)"
                  fillOpacity={1}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {dimensions.map((dim) => (
            <div key={dim.key} className="flex flex-col gap-2 border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {dim.label}
                </span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  {dim.score}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${dim.score}%` }}
                />
              </div>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                {dim.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreMetaCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border border-border p-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-2xl font-bold text-foreground">{value}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function CitationBadge({
  potential,
  reasoning,
}: {
  potential: LlmCitationPotential;
  reasoning: string;
}) {
  const colorClass =
    potential === "High"
      ? "border-green-500/40 bg-green-500/5 text-green-600 dark:text-green-400"
      : potential === "Medium"
      ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400"
      : "border-destructive/40 bg-destructive/5 text-destructive";

  return (
    <div className={`flex min-w-0 flex-col gap-1 border p-3 ${colorClass}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
        Citation Potential
      </span>
      <span className="font-mono text-2xl font-bold">{potential}</span>
      <span className="font-mono text-[10px] leading-relaxed opacity-70">{reasoning}</span>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: string[];
  tone: "positive" | "action" | "default";
}) {
  const containerClass =
    tone === "positive"
      ? "border-primary/30 bg-primary/5"
      : tone === "action"
      ? "border-border bg-muted/20"
      : "border-border";

  return (
    <div className={`flex flex-col gap-3 border p-4 ${containerClass}`}>
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <p key={i} className="font-mono text-xs leading-relaxed text-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse bg-muted" />
            <div className="h-12 w-24 animate-pulse bg-muted/80" />
            <div className="h-3 w-72 animate-pulse bg-muted/60" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 w-28 animate-pulse border border-border bg-muted/30" />
            ))}
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 border border-border p-5">
          <div className="h-4 w-48 animate-pulse bg-muted" />
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="h-[280px] animate-pulse border border-border bg-muted/30" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex flex-col gap-2 border border-border p-3">
                  <div className="h-3 w-20 animate-pulse bg-muted/70" />
                  <div className="h-6 w-10 animate-pulse bg-muted/50" />
                  <div className="h-3 w-full animate-pulse bg-muted/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
