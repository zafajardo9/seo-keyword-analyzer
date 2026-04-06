"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChartPolar, Certificate, CursorClick, GlobeHemisphereWest, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { PageAudit } from "@/lib/types";

interface PageAuditPanelProps {
  audit: PageAudit | null;
  loading?: boolean;
}

const ICONS = {
  industry: GlobeHemisphereWest,
  pageType: Sparkle,
  primaryAudience: Certificate,
  primaryIntent: CursorClick,
};

export function PageAuditPanel({ audit, loading = false }: PageAuditPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse bg-muted" />
            <div className="h-8 w-32 animate-pulse bg-muted/80" />
            <div className="h-3 w-64 animate-pulse bg-muted/60" />
          </div>
          <div className="h-24 w-24 animate-pulse rounded-full bg-muted/70" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2 border border-border p-3">
              <div className="h-3 w-20 animate-pulse bg-muted/70" />
              <div className="h-4 w-32 animate-pulse bg-muted/50" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="h-[320px] animate-pulse border border-border bg-muted/30" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2 border border-border p-3">
                <div className="h-3 w-20 animate-pulse bg-muted/70" />
                <div className="h-6 w-12 animate-pulse bg-muted/50" />
                <div className="h-3 w-full animate-pulse bg-muted/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="border border-border p-5">
        <p className="font-mono text-xs text-muted-foreground">
          AI audit is unavailable for this analysis.
        </p>
      </div>
    );
  }

  const radarData = audit.dimensions.map((dimension) => ({
    subject: dimension.label,
    score: dimension.score,
    fullMark: 100,
  }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 border border-border p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest">
              AI SEO Audit
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
          <p className="max-w-3xl font-mono text-xs leading-relaxed text-muted-foreground">
            {audit.verdict}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetaCard label="Niche / Field" value={audit.industry} icon={ICONS.industry} />
          <MetaCard label="Page Type" value={audit.pageType} icon={ICONS.pageType} />
          <MetaCard label="Audience" value={audit.primaryAudience} icon={ICONS.primaryAudience} />
          <MetaCard label="Intent" value={audit.primaryIntent} icon={ICONS.primaryIntent} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="min-w-0 border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <ChartPolar size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Audit Dimensions
            </span>
          </div>
          <div className="h-[320px] min-w-0">
            <ResponsiveContainer width="99%" height={320} minWidth={280}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(120,120,120,0.22)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "currentColor", fontSize: 10, fontFamily: "monospace" }}
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

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {audit.dimensions.map((dimension) => (
            <div key={dimension.key} className="flex flex-col gap-2 border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {dimension.label}
                </span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  {dimension.score}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${dimension.score}%` }}
                />
              </div>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                {dimension.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <ListCard title="Strengths" items={audit.strengths} tone="positive" />
        <ListCard title="Weaknesses" items={audit.weaknesses} tone="default" />
        <ListCard title="Missing Subtopics" items={audit.missingSubtopics} tone="default" />
        <ListCard title="Priority Actions" items={audit.priorityActions} tone="action" />
      </div>
    </motion.section>
  );
}

function MetaCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border border-border p-3">
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="font-mono text-xs leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function ListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "action" | "default";
}) {
  const toneClass =
    tone === "positive"
      ? "border-primary/30 bg-primary/5"
      : tone === "action"
      ? "border-border bg-muted/20"
      : "border-border";

  return (
    <div className={`flex flex-col gap-2 border p-3 ${toneClass}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="font-mono text-xs leading-relaxed text-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
