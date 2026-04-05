"use client";

import * as React from "react";
import ForceGraph2D from "react-force-graph-2d";

const STOP_WORDS = new Set([
  "the","a","an","of","in","for","to","with","and","or","is","are","was","were","on",
  "at","by","from","as","it","its","this","that","be","do","does","did","have","has",
  "had","not","but","we","you","your","our","their","they","he","she","i","my","me",
  "him","her","us","can","will","would","should","could","may","might","shall","about",
  "into","through","during","before","after","above","below","up","down","out","off",
  "over","under","again","then","so","if","than","too","very","just","how","all","both",
  "each","few","more","most","other","some","such","no","nor","only","same","any","also",
]);

function extractUniqueWords(keywords: string[]): { word: string; freq: number; rank: number }[] {
  const freqMap = new Map<string, number>();
  const firstRankMap = new Map<string, number>();

  keywords.forEach((phrase, phraseIndex) => {
    const words = phrase
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    const seen = new Set<string>();
    words.forEach((w) => {
      if (!seen.has(w)) {
        seen.add(w);
        freqMap.set(w, (freqMap.get(w) ?? 0) + 1);
        if (!firstRankMap.has(w)) firstRankMap.set(w, phraseIndex);
      }
    });
  });

  const maxFreq = Math.max(1, ...freqMap.values());
  return Array.from(freqMap.entries())
    .map(([word, freq]) => ({
      word,
      freq,
      rank: firstRankMap.get(word) ?? 999,
    }))
    .sort((a, b) => b.freq - a.freq || a.rank - b.rank)
    .map((entry) => ({ ...entry, freq: entry.freq / maxFreq }));
}

interface BubbleNode {
  id: string;
  label: string;
  val: number;
  freq: number;
  isTop: boolean;
  x?: number;
  y?: number;
}

interface KeywordBubbleGraphProps {
  keywords: string[];
}

export function KeywordBubbleGraph({ keywords }: KeywordBubbleGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(600);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.offsetWidth);
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = React.useMemo(() => {
    const wordEntries = extractUniqueWords(keywords);
    const nodes: BubbleNode[] = wordEntries.map((entry, i) => ({
      id: entry.word,
      label: entry.word,
      val: 0.15 + entry.freq * 0.85,
      freq: entry.freq,
      isTop: i === 0,
    }));
    return { nodes, links: [] };
  }, [keywords]);

  const nodeCanvasObject = React.useCallback(
    (node: BubbleNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = hoveredId === node.id;
      const isFlash = flashId === node.id;
      const baseRadius = 7 + node.val * 26;
      const radius = isHovered ? baseRadius * 1.12 : baseRadius;

      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);

      if (isFlash) {
        ctx.fillStyle = "rgba(255,255,255,0.95)";
      } else if (node.isTop) {
        ctx.fillStyle = isHovered
          ? "rgba(220,110,40,1)"
          : "rgba(203,99,30,0.92)";
      } else {
        const alpha = 0.22 + node.val * 0.6;
        ctx.fillStyle = isHovered
          ? `rgba(220,120,50,${alpha + 0.15})`
          : `rgba(203,99,30,${alpha})`;
      }
      ctx.fill();

      ctx.strokeStyle = isHovered
        ? "rgba(255,180,100,0.9)"
        : node.isTop
        ? "rgba(255,160,80,0.6)"
        : "rgba(203,99,30,0.25)";
      ctx.lineWidth = isHovered ? 1.5 : node.isTop ? 1 : 0.5;
      ctx.stroke();

      const showLabel = radius * globalScale > 10 || isHovered;
      if (showLabel) {
        const fontSize = Math.max(7, Math.min(12, radius * 0.5));
        ctx.font = `${node.isTop ? "bold" : "normal"} ${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isFlash ? "rgba(203,99,30,0.9)" : "rgba(255,255,255,0.92)";

        const maxW = radius * 1.75;
        let label = node.label;
        if (!isHovered && ctx.measureText(label).width > maxW) {
          while (label.length > 1 && ctx.measureText(label + "…").width > maxW) {
            label = label.slice(0, -1);
          }
          label += "…";
        }
        ctx.fillText(label, node.x ?? 0, node.y ?? 0);
      }
    },
    [hoveredId, flashId]
  );

  function handleNodeClick(node: BubbleNode) {
    navigator.clipboard.writeText(node.label).catch(() => {});
    setFlashId(node.id);
    setCopied(node.label);
    setTimeout(() => setFlashId(null), 380);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[420px] w-full overflow-hidden border border-border"
      style={{ background: "oklch(0.153 0.006 107.1)" }}
    >
      {width > 0 && (
        <ForceGraph2D
          graphData={graphData as never}
          width={width}
          height={420}
          backgroundColor="transparent"
          nodeLabel={() => ""}
          nodeVal={(n) => (n as BubbleNode).val * 12}
          nodeCanvasObject={nodeCanvasObject as never}
          nodeCanvasObjectMode={() => "replace"}
          onNodeClick={(node) => handleNodeClick(node as BubbleNode)}
          onNodeHover={(node) => setHoveredId(node ? (node as BubbleNode).id : null)}
          linkColor={() => "transparent"}
          cooldownTicks={100}
          d3VelocityDecay={0.25}
          d3AlphaDecay={0.02}
        />
      )}

      {copied && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] text-primary animate-in fade-in slide-in-from-top-2 duration-200">
          Copied: {copied}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-widest text-white/25">
        bubble size = prominence · click to copy
      </div>
    </div>
  );
}
