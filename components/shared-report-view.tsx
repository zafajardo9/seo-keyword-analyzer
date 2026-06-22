"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Atom,
  Brain,
  Broadcast,
  CaretDown,
  CaretUp,
  ChatCircle,
  ChartPolar,
  Check,
  Copy,
  Eye,
  FileText,
  MagnifyingGlass,
  NotePencil,
  Question,
  Sparkle,
  Strategy,
  Target,
  TextAlignLeft,
} from "@phosphor-icons/react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  GeoAeoAudit,
  GeoAeoDimension,
  LlmCitationPotential,
  PromptAnalysis,
  PromptGrade,
  PromptLikelihood,
  PromptResult,
  ContentOptimizerResult,
  ContentStrategyResult,
  ContentBriefResult,
} from "@/lib/types";

interface SharedReportViewProps {
  label: string;
  tool: string;
  shareKey: string;
  viewCount: number;
  createdAt: string;
  audit: GeoAeoAudit | null;
  promptAnalysis?: PromptAnalysis | null;
  optimizerResult?: ContentOptimizerResult | null;
  strategyResult?: ContentStrategyResult | null;
  briefResult?: ContentBriefResult | null;
}

export function SharedReportView({
  label,
  shareKey,
  viewCount,
  createdAt,
  audit,
  promptAnalysis,
  optimizerResult,
  strategyResult,
  briefResult,
}: SharedReportViewProps) {
  const toolLabel = promptAnalysis
    ? "Prompt Analyzer Report"
    : audit
      ? "GEO & AEO Report"
      : optimizerResult
        ? "Content Optimizer Report"
        : strategyResult
          ? "Content Strategy Report"
          : briefResult
            ? "Content Brief Report"
            : "Report";

  const toolIcon = promptAnalysis ? (
    <TextAlignLeft size={13} className="text-primary" />
  ) : audit ? (
    <Brain size={13} className="text-primary" />
  ) : optimizerResult ? (
    <NotePencil size={13} className="text-primary" />
  ) : strategyResult ? (
    <Strategy size={13} className="text-primary" />
  ) : briefResult ? (
    <FileText size={13} className="text-primary" />
  ) : (
    <Sparkle size={13} weight="fill" className="text-primary" />
  );

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Sparkle size={14} weight="fill" className="text-primary" />
          <span className="font-mono text-sm font-semibold tracking-tight">
            SEO Analyzer
          </span>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            {toolIcon}
            <span className="font-mono text-xs font-semibold">{toolLabel}</span>
          </div>
        </div>
        <Link
          href="/"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Try it yourself →
        </Link>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex flex-col gap-1 border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {toolIcon}
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Shared {toolLabel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Eye size={11} />
                  {viewCount} view{viewCount !== 1 ? "s" : ""}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <p className="font-mono text-sm font-semibold text-foreground">
              {label}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              Share key: {shareKey}
            </p>
          </div>

          {promptAnalysis ? (
            <SharedPromptResults analysis={promptAnalysis} />
          ) : audit ? (
            <AuditResults audit={audit} />
          ) : optimizerResult ? (
            <SharedOptimizerResults result={optimizerResult} />
          ) : strategyResult ? (
            <SharedStrategyResults result={strategyResult} />
          ) : briefResult ? (
            <SharedBriefResults result={briefResult} />
          ) : (
            <div className="border border-border p-8 text-center">
              <p className="font-mono text-xs text-muted-foreground">
                This report type is not supported for display yet.
              </p>
            </div>
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
          <ScoreMetaCard
            label="GEO Score"
            value={`${audit.geoScore}`}
            subtitle="Generative Engine"
          />
          <ScoreMetaCard
            label="AEO Score"
            value={`${audit.aeoScore}`}
            subtitle="Answer Engine"
          />
          <CitationBadge
            potential={audit.llmCitationPotential}
            reasoning={audit.llmCitationReasoning}
          />
        </div>
      </div>

      <DimensionSection
        title="GEO — Generative Engine Optimization"
        subtitle="How likely AI models are to trust and cite this page"
        icon={Broadcast}
        dimensions={geoDims}
      />

      <DimensionSection
        title="AEO — Answer Engine Optimization"
        subtitle="How well the page surfaces as a direct answer in AI results"
        icon={ChatCircle}
        dimensions={aeoDims}
      />

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
          <span className="font-mono text-[10px] text-muted-foreground">
            {subtitle}
          </span>
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
                  tick={{
                    fill: "currentColor",
                    fontSize: 9,
                    fontFamily: "monospace",
                  }}
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
            <div
              key={dim.key}
              className="flex flex-col gap-2 border border-border p-3"
            >
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
      <span className="font-mono text-2xl font-bold text-foreground">
        {value}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {subtitle}
      </span>
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
      <span className="font-mono text-[10px] leading-relaxed opacity-70">
        {reasoning}
      </span>
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
          <p
            key={i}
            className="font-mono text-xs leading-relaxed text-foreground"
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Prompt Analyzer shared view ────────────────────────────────────────────

const GRADE_STYLES: Record<PromptGrade, string> = {
  A: "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
  B: "border-blue-500/40 bg-blue-500/8 text-blue-600 dark:text-blue-400",
  C: "border-yellow-500/40 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400",
  D: "border-orange-500/40 bg-orange-500/8 text-orange-600 dark:text-orange-400",
  F: "border-destructive/40 bg-destructive/8 text-destructive",
};

const LIKELIHOOD_STYLES: Record<PromptLikelihood, string> = {
  High: "border-green-500/40 bg-green-500/8 text-green-600 dark:text-green-400",
  Medium:
    "border-yellow-500/40 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400",
  Low: "border-border bg-muted/30 text-muted-foreground",
};

function SharedGradeBadge({ grade }: { grade: PromptGrade }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center border font-mono text-xs font-bold ${GRADE_STYLES[grade]}`}
    >
      {grade}
    </span>
  );
}

function SharedPromptResults({ analysis }: { analysis: PromptAnalysis }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Score card */}
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
            <span
              className={`inline-flex h-10 w-10 items-center justify-center border font-mono text-2xl font-bold ${GRADE_STYLES[analysis.overallGrade]}`}
            >
              {analysis.overallGrade}
            </span>
          </div>
          <p className="max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            {analysis.aiVisibilityVerdict}
          </p>
        </div>
      </div>

      {/* Google Search queries */}
      {analysis.searchQueries && analysis.searchQueries.length > 0 && (
        <div className="flex flex-col gap-2 border border-border bg-muted/10 p-4">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={12} className="text-primary" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Google searches run by Gemini
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.searchQueries.map((q: string, i: number) => (
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
        <div className="flex flex-col gap-3 border border-primary/30 bg-primary/5 p-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Top Strengths
          </span>
          {analysis.topStrengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-[10px] text-primary">
                ✓
              </span>
              <p className="font-mono text-xs leading-relaxed text-foreground">
                {s}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border border-border bg-muted/20 p-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Critical Gaps
          </span>
          {analysis.criticalGaps.map((g, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                ✗
              </span>
              <p className="font-mono text-xs leading-relaxed text-foreground">
                {g}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Prompts */}
      <div className="flex flex-col gap-1">
        <div className="mb-2 flex items-center gap-2">
          <MagnifyingGlass size={13} className="text-primary" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            AI Prompt Predictions
          </span>
        </div>
        {analysis.prompts.map((p: PromptResult, i: number) => (
          <SharedPromptRow key={i} prompt={p} />
        ))}
      </div>
    </div>
  );
}

function SharedPromptRow({ prompt: p }: { prompt: PromptResult }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(p.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border border-border">
      <div className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30">
        <div className="mt-0.5 shrink-0">
          <SharedGradeBadge grade={p.grade} />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 flex-col gap-1 text-left"
        >
          <p className="font-mono text-xs font-semibold text-foreground">
            &ldquo;{p.prompt}&rdquo;
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${LIKELIHOOD_STYLES[p.likelihood]}`}
            >
              {p.likelihood}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {p.category}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              · Score: {p.score}
            </span>
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
      {open && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-4 pb-4 pt-3">
          <div>
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Why
            </span>
            <p className="font-mono text-xs leading-relaxed text-foreground">
              {p.reasoning}
            </p>
          </div>
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Suggestions
            </span>
            {p.suggestions.map((s: string, j: number) => (
              <div key={j} className="flex items-start gap-2 mb-1">
                <span className="mt-0.5 font-mono text-[10px] text-primary">
                  →
                </span>
                <p className="font-mono text-xs leading-relaxed text-foreground">
                  {s}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Content Optimizer Results ──

function SharedOptimizerResults({
  result,
}: {
  result: ContentOptimizerResult;
}) {
  return (
    <div className="flex flex-col gap-5">
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
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Optimized Content
        </span>
        <div className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-muted/20 p-4 font-mono text-xs leading-relaxed text-foreground">
          {result.optimizedContent}
        </div>
      </div>

      {result.keyChanges.length > 0 && (
        <ListCard
          title="Key Changes"
          icon={NotePencil}
          items={result.keyChanges}
          tone="action"
        />
      )}
    </div>
  );
}

// ── Shared Content Strategy Results ──

function SharedStrategyResults({ result }: { result: ContentStrategyResult }) {
  return (
    <div className="flex flex-col gap-5">
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
              <div key={i} className="border-l-2 border-primary/30 pl-3">
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
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
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
                <p key={i} className="font-mono text-[10px] text-foreground">
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
                <p key={i} className="font-mono text-[10px] text-foreground">
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

      <div className="border border-border p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Competitive Landscape
        </span>
        {result.competitiveLandscape.topCompetitors.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {result.competitiveLandscape.topCompetitors.map((comp, i) => (
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
                    <p className="font-mono text-[10px] text-foreground">
                      {comp.gapToExploit}
                    </p>
                  </div>
                )}
              </div>
            ))}
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
        {result.competitiveLandscape.contentDifferentiation.length > 0 && (
          <ListCard
            title="Content Differentiation"
            icon={Strategy}
            items={result.competitiveLandscape.contentDifferentiation}
            tone="default"
          />
        )}
      </div>
    </div>
  );
}

// ── Shared Content Brief Results ──

function SharedBriefResults({ result }: { result: ContentBriefResult }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="border border-border bg-muted/20 p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Working Title
        </span>
        <p className="mt-2 font-mono text-base font-bold text-foreground">
          {result.workingTitle}
        </p>
      </div>

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

      <div className="border border-border p-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Search Intent
        </span>
        <p className="mt-1 font-mono text-xs leading-relaxed text-foreground">
          {result.searchIntent}
        </p>
      </div>

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
                    className="font-mono text-[10px] text-muted-foreground"
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

      {result.writingGuidelines.length > 0 && (
        <ListCard
          title="Writing Guidelines"
          icon={NotePencil}
          items={result.writingGuidelines}
          tone="default"
        />
      )}
      {result.suggestedMedia.length > 0 && (
        <ListCard
          title="Suggested Media"
          icon={FileText}
          items={result.suggestedMedia}
          tone="default"
        />
      )}
      {result.seoRecommendations.length > 0 && (
        <ListCard
          title="SEO Recommendations"
          icon={Target}
          items={result.seoRecommendations}
          tone="action"
        />
      )}
      {result.questionsToAnswer && result.questionsToAnswer.length > 0 && (
        <ListCard
          title="Questions to Answer"
          icon={Question}
          items={result.questionsToAnswer}
          tone="action"
        />
      )}
    </div>
  );
}
