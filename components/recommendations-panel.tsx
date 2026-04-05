"use client";

import { motion } from "framer-motion";
import { Lightbulb, Tag, Article } from "@phosphor-icons/react";
import { Recommendation } from "@/lib/types";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  loading?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const card = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function RecommendationsPanel({
  recommendations,
  loading = false,
}: RecommendationsPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Lightbulb size={14} className="text-primary" />
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest">
          Content Recommendations
        </h2>
        {!loading && recommendations.length > 0 && (
          <span className="rounded-none border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {recommendations.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 border border-border p-4">
              <div className="h-4 w-3/4 animate-pulse rounded-none bg-muted" />
              <div className="h-3 w-full animate-pulse rounded-none bg-muted/70" />
              <div className="h-3 w-5/6 animate-pulse rounded-none bg-muted/70" />
              <div className="mt-1 flex gap-2">
                {[60, 80, 70].map((w) => (
                  <div
                    key={w}
                    className="h-5 animate-pulse rounded-none bg-muted/50"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground">No recommendations generated.</p>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              variants={card}
              className="flex flex-col gap-3 border border-border p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold leading-snug text-foreground">
                  {rec.topic}
                </h3>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
                  #{i + 1}
                </span>
              </div>

              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                {rec.reasoning}
              </p>

              {rec.targetKeywords?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag size={11} className="text-muted-foreground/60" />
                  {rec.targetKeywords.map((kw, j) => (
                    <span
                      key={j}
                      className="border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-l-2 border-primary/40 pl-3">
                <div className="mb-1 flex items-center gap-1">
                  <Article size={11} className="text-muted-foreground/60" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    Sample content
                  </span>
                </div>
                <p className="font-mono text-xs leading-relaxed text-foreground/80 italic">
                  &ldquo;{rec.sampleContent}&rdquo;
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
