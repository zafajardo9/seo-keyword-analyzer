"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Atom,
  Brain,
  Broadcast,
  ChatCircle,
  ChartPolar,
  Eye,
  Question,
  Sparkle,
  Target,
} from "@phosphor-icons/react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { GeoAeoAudit, GeoAeoDimension, LlmCitationPotential } from "@/lib/types";

interface SharedReportViewProps {
  label: string;
  tool: string;
  shareKey: string;
  viewCount: number;
  createdAt: string;
  audit: GeoAeoAudit | null;
}

export function SharedReportView({
  label,
  shareKey,
  viewCount,
  createdAt,
  audit,
}: SharedReportViewProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Sparkle size={14} weight="fill" className="text-primary" />
          <span className="font-mono text-sm font-semibold tracking-tight">SEO Analyzer</span>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Brain size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">GEO &amp; AEO Report</span>
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
                <Brain size={12} className="text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Shared GEO &amp; AEO Report
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
            <p className="font-mono text-sm font-semibold text-foreground">{label}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              Share key: {shareKey}
            </p>
          </div>

          {audit ? (
            <AuditResults audit={audit} />
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
          <ScoreMetaCard label="GEO Score" value={`${audit.geoScore}`} subtitle="Generative Engine" />
          <ScoreMetaCard label="AEO Score" value={`${audit.aeoScore}`} subtitle="Answer Engine" />
          <CitationBadge potential={audit.llmCitationPotential} reasoning={audit.llmCitationReasoning} />
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
        <ListCard title="Top Questions Answered" icon={Question} items={audit.topQuestionsAnswered} tone="positive" />
        <ListCard title="Questions to Add" icon={Question} items={audit.missingQuestionsToAdd} tone="action" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ListCard title="Schema Opportunities" icon={Atom} items={audit.schemaMarkupOpportunities} tone="default" />
        <ListCard title="GEO Recommendations" icon={Broadcast} items={audit.geoRecommendations} tone="action" />
        <ListCard title="AEO Recommendations" icon={ChatCircle} items={audit.aeoRecommendations} tone="action" />
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
          <span className="block font-mono text-xs font-semibold uppercase tracking-widest">{title}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="min-w-0 border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <ChartPolar size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Dimensions</span>
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
                <Radar dataKey="score" stroke="rgba(203,99,30,1)" fill="rgba(203,99,30,0.2)" fillOpacity={1} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {dimensions.map((dim) => (
            <div key={dim.key} className="flex flex-col gap-2 border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{dim.label}</span>
                <span className="font-mono text-lg font-semibold text-foreground">{dim.score}</span>
              </div>
              <div className="h-1.5 w-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${dim.score}%` }} />
              </div>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">{dim.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreMetaCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border border-border p-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-bold text-foreground">{value}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function CitationBadge({ potential, reasoning }: { potential: LlmCitationPotential; reasoning: string }) {
  const colorClass =
    potential === "High"
      ? "border-green-500/40 bg-green-500/5 text-green-600 dark:text-green-400"
      : potential === "Medium"
      ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400"
      : "border-destructive/40 bg-destructive/5 text-destructive";

  return (
    <div className={`flex min-w-0 flex-col gap-1 border p-3 ${colorClass}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">Citation Potential</span>
      <span className="font-mono text-2xl font-bold">{potential}</span>
      <span className="font-mono text-[10px] leading-relaxed opacity-70">{reasoning}</span>
    </div>
  );
}

function ListCard({
  title, icon: Icon, items, tone,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: string[];
  tone: "positive" | "action" | "default";
}) {
  const containerClass =
    tone === "positive" ? "border-primary/30 bg-primary/5"
    : tone === "action" ? "border-border bg-muted/20"
    : "border-border";

  return (
    <div className={`flex flex-col gap-3 border p-4 ${containerClass}`}>
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <p key={i} className="font-mono text-xs leading-relaxed text-foreground">{item}</p>
        ))}
      </div>
    </div>
  );
}
