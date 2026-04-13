"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkle,
  Warning,
  Globe,
  ArrowCounterClockwise,
  Lightning,
  ArrowClockwise,
  Notebook,
  Sword,
} from "@phosphor-icons/react";
import { StepIndicator } from "@/components/step-indicator";
import { UrlInput } from "@/components/url-input";
import { KeywordsPanel } from "@/components/keywords-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { PageAuditPanel } from "@/components/page-audit-panel";
import { ModelSelector, getStoredModel } from "@/components/model-selector";
import { PdfExport } from "@/components/pdf-export";
import { ToolNavDropdown } from "@/components/tool-nav-dropdown";
import { PageAudit, ScrapedContent, Recommendation } from "@/lib/types";
import {
  getCachedAnalysis,
  setCachedAnalysis,
  clearCachedAnalysis,
  formatCacheAge,
  CacheEntry,
} from "@/lib/analysis-cache";

type Step = 1 | 2 | 3;

const pageVariants = {
  initial: { opacity: 0, x: 24 },
  enter: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.25 } },
};

export default function AnalyzePage() {
  const [step, setStep] = React.useState<Step>(1);
  const [model, setModel] = React.useState<string>("");
  const [scraping, setScraping] = React.useState(false);
  const [scrapedContent, setScrapedContent] =
    React.useState<ScrapedContent | null>(null);
  const [pageAudit, setPageAudit] = React.useState<PageAudit | null>(null);
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [recommendations, setRecommendations] = React.useState<
    Recommendation[]
  >([]);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [keywordsLoading, setKeywordsLoading] = React.useState(false);
  const [recsLoading, setRecsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [keywordsExpanded, setKeywordsExpanded] = React.useState(false);
  const [cacheEntry, setCacheEntry] = React.useState<CacheEntry | null>(null);
  const [currentUrl, setCurrentUrl] = React.useState<string>("");

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);
  }, []);

  async function handleUrlSubmit(url: string) {
    setError(null);
    setCurrentUrl(url);
    setCacheEntry(null);

    // --- cache hit ---
    const cached = getCachedAnalysis(url);
    if (cached) {
      setCacheEntry(cached);
      setScrapedContent(cached.scrapedContent);
      setPageAudit(cached.pageAudit);
      setKeywords(cached.keywords);
      setRecommendations(cached.recommendations);
      setStep(3);
      return;
    }

    // --- cache miss: run full analysis ---
    setScraping(true);
    setStep(2);

    try {
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const scrapeData = await scrapeRes.json();

      if (!scrapeRes.ok || scrapeData.error) {
        setError(scrapeData.error ?? "Failed to scrape the page.");
        setStep(1);
        setScraping(false);
        return;
      }

      const content: ScrapedContent = scrapeData;
      setScrapedContent(content);
      setScraping(false);

      const currentModel = model || getStoredModel();
      if (!currentModel) {
        setError("No AI model selected. Please go back and select a model.");
        setStep(1);
        return;
      }

      setKeywordsLoading(true);
      setAuditLoading(true);
      setRecsLoading(true);
      setStep(3);

      const [auditRes, kwRes, recRes] = await Promise.all([
        fetch("/api/analyze/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scrapedContent: content,
            model: currentModel,
          }),
        }),
        fetch("/api/analyze/keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scrapedContent: content,
            model: currentModel,
          }),
        }),
        fetch("/api/analyze/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scrapedContent: content,
            model: currentModel,
          }),
        }),
      ]);

      const [auditData, kwData, recData] = await Promise.all([
        auditRes.json(),
        kwRes.json(),
        recRes.json(),
      ]);

      let finalAudit: PageAudit | null = null;
      let finalKeywords: string[] = [];
      let finalRecs: Recommendation[] = [];

      if (auditData.error) {
        setError((prev) => prev ?? `Audit error: ${auditData.error}`);
      } else {
        finalAudit = auditData.audit ?? null;
        setPageAudit(finalAudit);
      }
      setAuditLoading(false);

      if (kwData.error) {
        setError((prev) => prev ?? `Keywords error: ${kwData.error}`);
      } else {
        finalKeywords = kwData.keywords ?? [];
        setKeywords(finalKeywords);
      }
      setKeywordsLoading(false);

      if (recData.error) {
        setError((prev) => prev ?? `Recommendations error: ${recData.error}`);
      } else {
        finalRecs = recData.recommendations ?? [];
        setRecommendations(finalRecs);
      }
      setRecsLoading(false);

      // --- save to cache ---
      if (finalAudit || finalKeywords.length > 0 || finalRecs.length > 0) {
        setCachedAnalysis({
          url,
          scrapedContent: content,
          pageAudit: finalAudit,
          keywords: finalKeywords,
          recommendations: finalRecs,
          model: currentModel,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      setError(String(err));
      setScraping(false);
      setAuditLoading(false);
      setKeywordsLoading(false);
      setRecsLoading(false);
      setStep(1);
    }
  }

  function handleReanalyze() {
    if (currentUrl) clearCachedAnalysis(currentUrl);
    setCacheEntry(null);
    handleReset();
  }

  function handleReset() {
    setStep(1);
    setScrapedContent(null);
    setPageAudit(null);
    setKeywords([]);
    setRecommendations([]);
    setError(null);
    setScraping(false);
    setAuditLoading(false);
    setKeywordsLoading(false);
    setRecsLoading(false);
  }

  const relevanceHref =
    step === 3 && scrapedContent?.url
      ? `/relevance?url=${encodeURIComponent(scrapedContent.url)}`
      : "/relevance";
  const battleHref =
    step === 3 && scrapedContent?.url
      ? `/battle?left=${encodeURIComponent(scrapedContent.url)}`
      : "/battle";
  const companyResearchHref =
    step === 3 && scrapedContent?.url
      ? `/company-research?url=${encodeURIComponent(scrapedContent.url)}`
      : "/company-research";

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
            <span className="font-mono text-xs font-semibold">
              SEO Analyzer
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ModelSelector onModelChange={setModel} />
          <ToolNavDropdown
            relevanceHref={relevanceHref}
            battleHref={battleHref}
            companyResearchHref={companyResearchHref}
          />
          {step === 3 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowCounterClockwise size={12} />
              New Analysis
            </button>
          )}
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl">
          <div className="mb-8 flex justify-center">
            <StepIndicator currentStep={step} />
          </div>

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
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex flex-col items-center gap-6"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="font-mono text-xl font-bold tracking-tight">
                    Analyze a Web Page
                  </h1>
                  <p className="font-mono text-xs text-muted-foreground">
                    Paste the URL of any blog post, landing page, or article you
                    want to analyze.
                  </p>
                </div>
                <UrlInput onSubmit={handleUrlSubmit} loading={scraping} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex flex-col items-center gap-6 py-12"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex h-12 w-12 items-center justify-center border border-primary/30">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="h-5 w-5 border-2 border-transparent border-t-primary"
                      style={{ borderRadius: "50%" }}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <p className="font-mono text-sm font-semibold">
                      Scraping page…
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Fetching and parsing the page content
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && scrapedContent && (
              <motion.div
                key="step-3"
                variants={pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-1 border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe size={12} className="text-muted-foreground" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Analyzed Page
                      </span>
                      {cacheEntry && (
                        <span className="flex items-center gap-1 border border-primary/30 bg-primary/8 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                          <Lightning size={9} weight="fill" />
                          Cached · {formatCacheAge(cacheEntry)}
                        </span>
                      )}
                    </div>
                    {cacheEntry && (
                      <button
                        onClick={handleReanalyze}
                        className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground uppercase tracking-widest transition-colors hover:text-foreground"
                      >
                        <ArrowClockwise size={11} />
                        Re-analyze
                      </button>
                    )}
                  </div>
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {scrapedContent.title || scrapedContent.url}
                  </p>
                  {scrapedContent.description && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {scrapedContent.description}
                    </p>
                  )}
                  <a
                    href={scrapedContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-primary hover:underline"
                  >
                    {scrapedContent.url}
                  </a>
                </div>

                <PageAuditPanel audit={pageAudit} loading={auditLoading} />

                <div
                  className={
                    keywordsExpanded
                      ? "flex flex-col gap-8"
                      : "grid grid-cols-1 gap-8 lg:grid-cols-2"
                  }
                >
                  <KeywordsPanel
                    keywords={keywords}
                    loading={keywordsLoading}
                    onViewChange={setKeywordsExpanded}
                  />
                  <RecommendationsPanel
                    recommendations={recommendations}
                    loading={recsLoading}
                  />
                </div>

                {!auditLoading &&
                  !keywordsLoading &&
                  !recsLoading &&
                  (pageAudit ||
                    keywords.length > 0 ||
                    recommendations.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between border-t border-border pt-6"
                    >
                      <p className="font-mono text-xs text-muted-foreground">
                        Analysis complete · Audit{" "}
                        {pageAudit
                          ? `${pageAudit.overallScore}/100`
                          : "unavailable"}{" "}
                        · {keywords.length} keywords · {recommendations.length}{" "}
                        recommendations
                      </p>
                      <div className="flex items-center gap-3">
                        <Link
                          href={battleHref}
                          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <Sword size={13} />
                          Open Battle
                        </Link>
                        <Link
                          href={relevanceHref}
                          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <Notebook size={13} />
                          Open In Relevance
                        </Link>
                        <Link
                          href={companyResearchHref}
                          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <Globe size={13} />
                          Open Research
                        </Link>
                        <PdfExport
                          scrapedContent={scrapedContent}
                          pageAudit={pageAudit}
                          keywords={keywords}
                          recommendations={recommendations}
                          model={model}
                        />
                      </div>
                    </motion.div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
