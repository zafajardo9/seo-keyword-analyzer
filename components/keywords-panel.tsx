"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlass, Copy, Check, List, Graph, ShareNetwork } from "@phosphor-icons/react";
import * as React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const KeywordBubbleGraph = dynamic(
  () => import("@/components/keyword-bubble-graph").then((m) => m.KeywordBubbleGraph),
  { ssr: false, loading: () => <GraphSkeleton /> }
);

const KeywordSupportGraph = dynamic(
  () => import("@/components/keyword-support-graph").then((m) => m.KeywordSupportGraph),
  { ssr: false, loading: () => <GraphSkeleton /> }
);

function GraphSkeleton() {
  return (
    <div className="h-[420px] w-full animate-pulse border border-border bg-muted/30" />
  );
}

type ViewMode = "list" | "graph" | "support";

interface KeywordsPanelProps {
  keywords: string[];
  loading?: boolean;
  onViewChange?: (expanded: boolean) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.85, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
};

const SKELETON_COUNT = 18;
const SKELETON_WIDTHS = [72, 96, 80, 112, 64, 88, 104, 76, 120, 68, 92, 84, 108, 60, 100, 78, 116, 70];

const VIEW_TABS: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
  { id: "list", icon: <List size={11} />, label: "List" },
  { id: "graph", icon: <Graph size={11} />, label: "Bubble" },
  { id: "support", icon: <ShareNetwork size={11} />, label: "Support" },
];

export function KeywordsPanel({ keywords, loading = false, onViewChange }: KeywordsPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const [view, setView] = React.useState<ViewMode>("list");

  function handleViewChange(v: ViewMode) {
    setView(v);
    onViewChange?.(v !== "list");
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(keywords.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MagnifyingGlass size={14} className="text-primary" />
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest">
            Keywords &amp; Phrases
          </h2>
          {!loading && keywords.length > 0 && (
            <span className="rounded-none border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {keywords.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!loading && keywords.length > 0 && (
            <>
              <div className="flex items-center border border-border">
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleViewChange(tab.id)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                      view === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {view === "list" && (
                <button
                  onClick={handleCopyAll}
                  className={cn(
                    "flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                    copied ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied!" : "Copy all"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {view === "graph" && !loading && keywords.length > 0 && (
        <div className="mb-1 font-mono text-[10px] text-muted-foreground">
          Each bubble represents a keyword. Bigger = more prominent in the page. Center node is the top-ranked keyword.
        </div>
      )}
      {view === "support" && !loading && keywords.length > 0 && (
        <div className="mb-1 font-mono text-[10px] text-muted-foreground">
          Keywords connected by shared words form clusters — these are natural topic groups to target together in content.
        </div>
      )}

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded-none bg-muted"
              style={{ width: `${SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}px` }}
            />
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground">No keywords extracted.</p>
      ) : (
        <AnimatePresence mode="wait">
          {view === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="flex flex-wrap gap-2"
              >
                {keywords.map((kw, i) => (
                  <motion.span
                    key={`${kw}-${i}`}
                    variants={item}
                    className="inline-flex cursor-default items-center border border-border px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    {kw}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}

          {view === "graph" && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <KeywordBubbleGraph keywords={keywords} />
            </motion.div>
          )}

          {view === "support" && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <KeywordSupportGraph keywords={keywords} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
