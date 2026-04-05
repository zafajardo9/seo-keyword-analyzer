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
  "back","new","first","last","long","great","little","own","right","old","big","high",
  "different","small","large","next","early","important","public","private","real","best",
]);

function tokenizePhrase(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

const CLUSTER_COLORS = [
  "rgba(203,99,30,VAL)",
  "rgba(99,160,203,VAL)",
  "rgba(99,203,140,VAL)",
  "rgba(203,180,30,VAL)",
  "rgba(180,99,203,VAL)",
  "rgba(203,120,120,VAL)",
  "rgba(120,180,203,VAL)",
];

function colorForGroup(group: number, alpha: number): string {
  const template = CLUSTER_COLORS[group % CLUSTER_COLORS.length];
  return template.replace("VAL", String(alpha));
}

interface SupportNode {
  id: string;
  label: string;
  group: number;
  degree: number;
  x?: number;
  y?: number;
}

interface SupportLink {
  source: string | SupportNode;
  target: string | SupportNode;
  strength: number;
}

function buildGraphData(keywords: string[]): {
  nodes: SupportNode[];
  links: SupportLink[];
} {
  // Step 1: collect unique words with frequency across all phrases
  const freqMap = new Map<string, number>();
  const phraseTokens: string[][] = keywords.map((phrase) => {
    const tokens = tokenizePhrase(phrase);
    const unique = Array.from(new Set(tokens));
    unique.forEach((w) => freqMap.set(w, (freqMap.get(w) ?? 0) + 1));
    return unique;
  });

  const uniqueWords = Array.from(freqMap.keys());

  // Step 2: build edges — two words share an edge if they co-occur in the same phrase
  const coMap = new Map<string, number>(); // "wordA|||wordB" → count
  phraseTokens.forEach((tokens) => {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const key = [tokens[i], tokens[j]].sort().join("|||");
        coMap.set(key, (coMap.get(key) ?? 0) + 1);
      }
    }
  });

  const links: SupportLink[] = [];
  coMap.forEach((count, key) => {
    const [a, b] = key.split("|||");
    links.push({ source: a, target: b, strength: count });
  });

  // Step 3: adjacency list for BFS
  const adj = new Map<string, string[]>();
  uniqueWords.forEach((w) => adj.set(w, []));
  links.forEach((l) => {
    adj.get(l.source as string)?.push(l.target as string);
    adj.get(l.target as string)?.push(l.source as string);
  });

  // Step 4: BFS connected components → group assignment
  let group = 0;
  const visited = new Set<string>();
  const groupMap = new Map<string, number>();
  uniqueWords.forEach((w) => {
    if (!visited.has(w)) {
      const queue = [w];
      while (queue.length) {
        const curr = queue.shift()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        groupMap.set(curr, group);
        adj.get(curr)?.forEach((nb) => { if (!visited.has(nb)) queue.push(nb); });
      }
      group++;
    }
  });

  // Step 5: degree map
  const degreeMap = new Map<string, number>();
  uniqueWords.forEach((w) => degreeMap.set(w, 0));
  links.forEach((l) => {
    degreeMap.set(l.source as string, (degreeMap.get(l.source as string) ?? 0) + 1);
    degreeMap.set(l.target as string, (degreeMap.get(l.target as string) ?? 0) + 1);
  });

  const nodes: SupportNode[] = uniqueWords.map((w) => ({
    id: w,
    label: w,
    group: groupMap.get(w) ?? 0,
    degree: degreeMap.get(w) ?? 0,
  }));

  return { nodes, links };
}

interface KeywordSupportGraphProps {
  keywords: string[];
}

export function KeywordSupportGraph({ keywords }: KeywordSupportGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(600);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

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

  const { graphData, connectedIds } = React.useMemo(() => {
    const data = buildGraphData(keywords);
    const connMap = new Map<string, Set<string>>();
    data.nodes.forEach((n) => connMap.set(n.id, new Set()));
    data.links.forEach((l) => {
      connMap.get(l.source as string)?.add(l.target as string);
      connMap.get(l.target as string)?.add(l.source as string);
    });
    return { graphData: data, connectedIds: connMap };
  }, [keywords]);

  const maxDegree = React.useMemo(
    () => Math.max(1, ...graphData.nodes.map((n) => n.degree)),
    [graphData]
  );

  const nodeCanvasObject = React.useCallback(
    (node: SupportNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = hoveredId === node.id;
      const isNeighbor = hoveredId
        ? connectedIds.get(hoveredId)?.has(node.id) ?? false
        : false;
      const isDimmed = hoveredId && !isHovered && !isNeighbor;

      const baseRadius = 5 + (node.degree / maxDegree) * 18;
      const radius = isHovered ? baseRadius * 1.15 : baseRadius;

      const alpha = isDimmed ? 0.12 : isHovered ? 1 : isNeighbor ? 0.85 : 0.7;

      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = colorForGroup(node.group, alpha);
      ctx.fill();

      ctx.strokeStyle = isHovered
        ? colorForGroup(node.group, 1)
        : colorForGroup(node.group, isDimmed ? 0.05 : 0.35);
      ctx.lineWidth = isHovered ? 1.5 : 0.5;
      ctx.stroke();

      const showLabel = radius * globalScale > 10 || isHovered || isNeighbor;
      if (showLabel) {
        const fontSize = Math.max(7, Math.min(11, radius * 0.55));
        ctx.font = `${node.degree > 2 ? "bold" : "normal"} ${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isDimmed
          ? "rgba(255,255,255,0.15)"
          : "rgba(255,255,255,0.92)";

        const maxW = radius * 1.8;
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
    [hoveredId, connectedIds, maxDegree]
  );

  const linkCanvasObject = React.useCallback(
    (link: SupportLink, ctx: CanvasRenderingContext2D) => {
      const src = link.source as SupportNode;
      const tgt = link.target as SupportNode;
      if (!src.x || !src.y || !tgt.x || !tgt.y) return;

      const isActive =
        hoveredId && (src.id === hoveredId || tgt.id === hoveredId);
      const isDimmed = hoveredId && !isActive;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      const alpha = isDimmed ? 0.04 : isActive ? 0.6 : 0.15;
      ctx.strokeStyle = `rgba(203,99,30,${alpha})`;
      ctx.lineWidth = isActive ? link.strength * 1.2 : link.strength * 0.6;
      ctx.stroke();
    },
    [hoveredId]
  );

  const uniqueGroups = React.useMemo(() => {
    const seen = new Set<number>();
    return graphData.nodes
      .filter((n) => {
        if (seen.has(n.group)) return false;
        seen.add(n.group);
        return true;
      })
      .slice(0, 7);
  }, [graphData]);

  const isolatedCount = graphData.nodes.filter((n) => n.degree === 0).length;

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
          nodeVal={(n) => {
            const node = n as SupportNode;
            return 3 + (node.degree / maxDegree) * 10;
          }}
          nodeCanvasObject={nodeCanvasObject as never}
          nodeCanvasObjectMode={() => "replace"}
          linkCanvasObject={linkCanvasObject as never}
          linkCanvasObjectMode={() => "replace"}
          onNodeHover={(node) =>
            setHoveredId(node ? (node as SupportNode).id : null)
          }
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          d3AlphaDecay={0.015}
          linkDirectionalParticles={0}
        />
      )}

      {uniqueGroups.length > 1 && (
        <div className="pointer-events-none absolute top-3 right-3 flex flex-col gap-1">
          {uniqueGroups.map((n) => (
            <div key={n.group} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-none"
                style={{ background: colorForGroup(n.group, 0.85) }}
              />
              <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest">
                Group {n.group + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-3 flex flex-col gap-0.5">
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">
          node size = connections · hover to explore
        </span>
        {isolatedCount > 0 && (
          <span className="font-mono text-[9px] text-white/20">
            {isolatedCount} isolated keyword{isolatedCount > 1 ? "s" : ""} (no shared words)
          </span>
        )}
      </div>
    </div>
  );
}
