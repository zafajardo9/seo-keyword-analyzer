"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  CaretDown,
  CaretUp,
  Check,
  CircleNotch,
  Copy,
  Globe,
  Info,
  MagnifyingGlass,
  ShareNetwork,
  Sparkle,
  Warning,
  X,
} from "@phosphor-icons/react";
import { ContentCheck, PromptAnalysis, PromptGrade, PromptLikelihood, PromptResult } from "@/lib/types";
import { ModelSelector, getStoredModel } from "@/components/model-selector";
import { ApiKeyManager, getStoredGeminiKey } from "@/components/api-key-manager";
import { HistoryPanel, SaveToHistoryButton } from "@/components/history-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STEPS = [
  { id: 1, label: "Fetching website data" },
  { id: 2, label: "Searching the web with Google" },
  { id: 3, label: "Asking AI models" },
  { id: 4, label: "Grounding analysis in real search results" },
] as const;

type AnalysisStep = 0 | 1 | 2 | 3 | 4 | 5;

interface PromptAnalyzerPanelProps {
  initialUrl?: string;
}

export function PromptAnalyzerPanel({ initialUrl = "" }: PromptAnalyzerPanelProps) {
  const [model, setModel] = React.useState("");
  const [url, setUrl] = React.useState(initialUrl);
  const [analysis, setAnalysis] = React.useState<PromptAnalysis | null>(null);
  const [step, setStep] = React.useState<AnalysisStep>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [shareKey, setShareKey] = React.useState<string | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const stepTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

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

  function clearTimers() {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }

  async function handleAnalyze(targetUrl?: string) {
    const resolvedUrl = (targetUrl ?? url).trim();
    if (!resolvedUrl) { setError("Enter a URL to analyze."); return; }

    const currentModel = model || getStoredModel();
    if (!currentModel) { setError("No AI model selected. Please select one first."); return; }

    clearTimers();
    setError(null);
    setAnalysis(null);
    setShareKey(null);
    setStep(1);

    try {
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: resolvedUrl }),
      });

      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok || scrapeData.error) {
        setError(scrapeData.error ?? "Failed to fetch the page.");
        setStep(0);
        return;
      }

      setStep(2);

      // Schedule step advances while AI is working
      stepTimers.current.push(setTimeout(() => setStep(3), 2500));
      stepTimers.current.push(setTimeout(() => setStep(4), 5000));

      const analyzeRes = await fetch("/api/analyze/prompt-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrapedContent: scrapeData,
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });

      clearTimers();
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok || analyzeData.error) {
        setError(analyzeData.error ?? "Failed to analyze prompts.");
        setStep(0);
        return;
      }

      setStep(5);
      setAnalysis({ ...analyzeData.analysis, url: resolvedUrl });
    } catch (err) {
      clearTimers();
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAnalyze();
  }

  async function handleShare() {
    if (!analysis) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "prompt-analyzer",
          label: analysis.pageTitle || url,
          payload: { analysis, url },
        }),
      });
      const data = await res.json();
      if (data.shareKey) setShareKey(data.shareKey);
    } catch { /* ignore */ } finally {
      setSharing(false);
    }
  }

  function handleCopyLink() {
    if (!shareKey) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareKey}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const loading = step > 0 && step < 5;
  const [infoOpen, setInfoOpen] = React.useState(false);

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
            <span className="font-mono text-xs font-semibold">Prompt Analyzer</span>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              title="How this tool works"
              className="ml-1 text-muted-foreground transition-colors hover:text-primary"
            >
              <Info size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HistoryPanel<{ analysis: PromptAnalysis; url: string }>
            tool="prompt-analyzer"
            refreshToken={historyRefresh}
            onRestore={(payload) => {
              if (payload?.analysis) setAnalysis(payload.analysis);
              if (payload?.url) setUrl(payload.url);
              setShareKey(null);
              setStep(0);
            }}
          />
          <ApiKeyManager />
          <ModelSelector onModelChange={setModel} />
        </div>
      </nav>

      <InfoDrawer open={infoOpen} onClose={() => setInfoOpen(false)} />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-3xl">

          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <h1 className="font-mono text-xl font-bold tracking-tight">
              AI Prompt Analyzer
            </h1>
            <p className="font-mono text-xs text-muted-foreground max-w-lg">
              Discover which natural language prompts in Google AI, Perplexity, or ChatGPT would surface your page — and how well it ranks for each.
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
                  <MagnifyingGlass size={13} />
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

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4 border border-border p-8"
              >
                <div className="mb-2 flex items-center gap-2">
                  <CircleNotch size={14} className="animate-spin text-primary" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                    Analyzing AI Visibility
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {STEPS.map((s) => {
                    const isActive = step === s.id;
                    const isDone = step > s.id;
                    const isPending = step < s.id;

                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                        transition={{ delay: s.id * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                            isDone
                              ? "border-green-500/50 bg-green-500/10 text-green-500"
                              : isActive
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground/40"
                          }`}
                        >
                          {isDone ? (
                            <Check size={10} weight="bold" />
                          ) : isActive ? (
                            <CircleNotch size={10} className="animate-spin" />
                          ) : (
                            <span className="font-mono text-[8px]">{s.id}</span>
                          )}
                        </div>
                        <span
                          className={`font-mono text-xs ${
                            isDone
                              ? "text-muted-foreground line-through"
                              : isActive
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          }`}
                        >
                          {s.label}
                          {isActive && (
                            <span className="ml-1 inline-flex gap-0.5">
                              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                            </span>
                          )}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {analysis && step === 5 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
              >
                <AnalysisResults analysis={analysis} />

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <SaveToHistoryButton
                    tool="prompt-analyzer"
                    disabled={!analysis}
                    buildPayload={() => ({
                      id: `prompt-analyzer-${url.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 60)}`,
                      label: analysis.pageTitle || url,
                      payload: { analysis, url },
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
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function AnalysisResults({ analysis }: { analysis: PromptAnalysis }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Overall score card */}
      <div className="flex flex-col gap-4 border border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkle size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              AI Prompt Visibility Score
            </span>
          </div>
          <div className="flex items-end gap-3">
            <span className="font-mono text-5xl font-bold tracking-tight">
              {analysis.overallScore}
            </span>
            <span className="pb-1.5 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              / 100
            </span>
            <GradeBadge grade={analysis.overallGrade} size="lg" />
          </div>
          <p className="max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            {analysis.aiVisibilityVerdict}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <InfoCard label="Page" value={analysis.pageTitle} mono />
          <InfoCard
            label="Prompts Analyzed"
            value={String(analysis.prompts.length)}
          />
        </div>
      </div>

      {/* Google Search queries used */}
      {analysis.searchQueries && analysis.searchQueries.length > 0 && (
        <div className="flex flex-col gap-2 border border-border bg-muted/10 p-4">
          <div className="flex items-center gap-2">
            <Globe size={12} className="text-primary" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Google searches run by Gemini
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.searchQueries.map((q, i) => (
              <span
                key={i}
                className="inline-flex items-center border border-border bg-background px-2.5 py-1 font-mono text-[10px] text-foreground"
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths + Gaps */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StrengthGapCard
          title="Top Strengths"
          items={analysis.topStrengths}
          tone="positive"
        />
        <StrengthGapCard
          title="Critical Gaps"
          items={analysis.criticalGaps}
          tone="warning"
        />
      </div>

      {/* Content Quality Checks */}
      {analysis.contentChecks && analysis.contentChecks.length > 0 && (
        <ContentChecksSection checks={analysis.contentChecks} />
      )}

      {/* Prompt list */}
      <div className="flex flex-col gap-1">
        <div className="mb-2 flex items-center gap-2">
          <MagnifyingGlass size={13} className="text-primary" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            AI Prompt Predictions
          </span>
        </div>
        {analysis.prompts.map((p, i) => (
          <PromptCard key={i} result={p} index={i} />
        ))}
      </div>
    </div>
  );
}

const CHECK_ICONS: Record<string, React.ReactNode> = {
  semanticHtml: <span className="font-mono text-[9px] font-bold text-primary">&lt;/&gt;</span>,
  semanticCoverage: <span className="font-mono text-[9px] font-bold text-primary">§</span>,
  atomicSections: <span className="font-mono text-[9px] font-bold text-primary">⊞</span>,
  examplesAndFaqs: <span className="font-mono text-[9px] font-bold text-primary">?</span>,
  internalLinking: <span className="font-mono text-[9px] font-bold text-primary">↔</span>,
};

function ContentChecksSection({ checks }: { checks: ContentCheck[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkle size={13} className="text-primary" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Content Quality Checks
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => (
          <ContentCheckCard key={check.key} check={check} />
        ))}
      </div>
    </div>
  );
}

function ContentCheckCard({ check }: { check: ContentCheck }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-border bg-muted/20">
          {CHECK_ICONS[check.key]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold text-foreground truncate">
              {check.label}
            </span>
            <GradeBadge grade={check.grade} size="sm" />
          </div>
          <div className="h-1 w-full overflow-hidden rounded-none bg-border">
            <div
              className={`h-full transition-all ${
                check.score >= 85
                  ? "bg-green-500"
                  : check.score >= 70
                  ? "bg-blue-500"
                  : check.score >= 50
                  ? "bg-yellow-500"
                  : check.score >= 30
                  ? "bg-orange-500"
                  : "bg-destructive"
              }`}
              style={{ width: `${check.score}%` }}
            />
          </div>
          <span className="mt-0.5 font-mono text-[9px] text-muted-foreground">{check.score}/100</span>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {open ? <CaretUp size={11} /> : <CaretDown size={11} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 border-t border-border bg-muted/10 px-3 pb-3 pt-2.5">
              <p className="font-mono text-[11px] leading-relaxed text-foreground">{check.verdict}</p>
              {check.suggestions.length > 0 && (
                <div className="flex flex-col gap-1">
                  {check.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 font-mono text-[9px] text-primary">→</span>
                      <p className="font-mono text-[11px] leading-relaxed text-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PromptCard({ result, index }: { result: PromptResult; index: number }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(result.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border"
    >
      <div className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30">
        <div className="mt-0.5 shrink-0">
          <GradeBadge grade={result.grade} size="sm" />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 flex-col gap-1 text-left"
        >
          <p className="font-mono text-xs font-semibold text-foreground">
            &ldquo;{result.prompt}&rdquo;
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LikelihoodChip likelihood={result.likelihood} />
            <span className="font-mono text-[10px] text-muted-foreground">{result.category}</span>
            <span className="font-mono text-[10px] text-muted-foreground">·</span>
            <span className="font-mono text-[10px] text-muted-foreground">Score: {result.score}</span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy prompt"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            {copied ? (
              <Check size={13} className="text-green-500" />
            ) : (
              <Copy size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-4 pb-4 pt-3">
              <div>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Why
                </span>
                <p className="font-mono text-xs leading-relaxed text-foreground">
                  {result.reasoning}
                </p>
              </div>
              <div>
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Suggestions to Improve
                </span>
                <div className="flex flex-col gap-1.5">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[10px] text-primary">→</span>
                      <p className="font-mono text-xs leading-relaxed text-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Info drawer ────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Scrape your page",
    detail:
      "We fetch your URL server-side and extract the title, meta description, headings (H1–H3), and body text. No browser required — this is a real HTTP request to your page.",
  },
  {
    step: "02",
    title: "Google Search grounding via Gemini",
    detail:
      "We call Gemini with its built-in Google Search tool enabled. Gemini autonomously runs live Google searches to check what is currently ranking for topics related to your page. The exact queries it ran are shown in the results under \"Google searches run by Gemini\".",
  },
  {
    step: "03",
    title: "AI model analysis",
    detail:
      "Gemini reads your scraped content alongside the live search results it just fetched. It identifies which natural-language prompts — the kind real users type into Google AI Overview, Perplexity, or ChatGPT — would cause your page to be cited or recommended.",
  },
  {
    step: "04",
    title: "Grounded predictions + grades",
    detail:
      "Each predicted prompt gets a grade (A–F) and a likelihood (High / Medium / Low) based on how well your page currently satisfies it compared to what is already ranking. Suggestions are specific to closing the gap on each prompt.",
  },
];

const TECH_FACTS = [
  { label: "AI Model", value: "Google Gemini (your selected model)" },
  { label: "Search grounding", value: "Google Search tool — native Gemini feature" },
  { label: "Web scraping", value: "Server-side fetch → HTML parse (no third-party)" },
  { label: "Data stored", value: "Only if you click Save — never auto-stored" },
  { label: "Credentials", value: "Your Gemini API key — never logged or shared" },
];

function InfoDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-primary" />
                <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                  How it works
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Intro */}
              <p className="mb-5 font-mono text-xs leading-relaxed text-muted-foreground">
                The AI Prompt Analyzer tells you which natural-language queries a real user would type into{" "}
                <span className="text-foreground">Google AI Overview</span>,{" "}
                <span className="text-foreground">Perplexity</span>, or{" "}
                <span className="text-foreground">ChatGPT</span> that would surface your page — and grades how well your content currently satisfies each one.
              </p>

              {/* Steps */}
              <div className="mb-6 flex flex-col gap-4">
                {HOW_IT_WORKS.map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-primary opacity-60">
                      {item.step}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {item.title}
                      </span>
                      <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech facts */}
              <div className="mb-5 border border-border">
                <div className="border-b border-border px-4 py-2.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Under the hood
                  </span>
                </div>
                {TECH_FACTS.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-start justify-between gap-4 border-b border-border px-4 py-2.5 last:border-0"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">{fact.label}</span>
                    <span className="text-right font-mono text-[10px] font-semibold text-foreground">
                      {fact.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Why trust it */}
              <div className="border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Globe size={11} className="text-primary" />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                    Why the results are grounded in reality
                  </span>
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Unlike tools that only read your page, we enable{" "}
                  <span className="text-foreground">Gemini&apos;s native Google Search grounding</span>. This means Gemini actually queries Google before answering — it sees what pages are currently ranking, what questions people are asking, and where your content sits relative to live competition. The predictions reflect what is happening in search today, not a static model snapshot from months ago.
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const GRADE_STYLES: Record<PromptGrade, string> = {
  A: "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
  B: "border-blue-500/40 bg-blue-500/8 text-blue-600 dark:text-blue-400",
  C: "border-yellow-500/40 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400",
  D: "border-orange-500/40 bg-orange-500/8 text-orange-600 dark:text-orange-400",
  F: "border-destructive/40 bg-destructive/8 text-destructive",
};

function GradeBadge({ grade, size }: { grade: PromptGrade; size: "sm" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center justify-center border font-mono font-bold ${GRADE_STYLES[grade]} ${
        size === "lg" ? "h-10 w-10 text-2xl" : "h-6 w-6 text-xs"
      }`}
    >
      {grade}
    </span>
  );
}

const LIKELIHOOD_STYLES: Record<PromptLikelihood, string> = {
  High: "border-green-500/40 bg-green-500/8 text-green-600 dark:text-green-400",
  Medium: "border-yellow-500/40 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400",
  Low: "border-border bg-muted/30 text-muted-foreground",
};

function LikelihoodChip({ likelihood }: { likelihood: PromptLikelihood }) {
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${LIKELIHOOD_STYLES[likelihood]}`}
    >
      {likelihood}
    </span>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border border-border p-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`${mono ? "font-mono text-[11px]" : "font-mono text-lg font-bold"} text-foreground truncate`}>
        {value}
      </span>
    </div>
  );
}

function StrengthGapCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "warning";
}) {
  return (
    <div
      className={`flex flex-col gap-3 border p-4 ${
        tone === "positive" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
      }`}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`mt-0.5 font-mono text-[10px] ${tone === "positive" ? "text-primary" : "text-muted-foreground"}`}>
              {tone === "positive" ? "✓" : "✗"}
            </span>
            <p className="font-mono text-xs leading-relaxed text-foreground">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
