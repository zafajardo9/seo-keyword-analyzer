"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CircleNotch, Crown, Fire, Sparkle, Sword, Trophy } from "@phosphor-icons/react";
import { BlogBattleResult } from "@/lib/types";
import { getStoredModel, ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolNavDropdown } from "@/components/tool-nav-dropdown";

interface BlogBattleProps {
  initialLeftUrl?: string;
}

export function BlogBattle({ initialLeftUrl = "" }: BlogBattleProps) {
  const [model, setModel] = React.useState("");
  const [leftUrl, setLeftUrl] = React.useState(initialLeftUrl);
  const [rightUrl, setRightUrl] = React.useState("");
  const [battle, setBattle] = React.useState<BlogBattleResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);
  }, []);

  React.useEffect(() => {
    if (initialLeftUrl.trim()) {
      setLeftUrl(initialLeftUrl.trim());
    }
  }, [initialLeftUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBattle(null);

    if (!leftUrl.trim() || !rightUrl.trim()) {
      setError("Add both blog URLs to start the battle.");
      return;
    }

    const currentModel = model || getStoredModel();
    if (!currentModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/analyze/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leftUrl: leftUrl.trim(),
          rightUrl: rightUrl.trim(),
          model: currentModel,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to compare the two pages.");
        return;
      }

      setBattle(data.battle ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

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
            <Sword size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold">Battle of Blogs</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ModelSelector onModelChange={setModel} />
          <ToolNavDropdown />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="border border-border p-5">
              <div className="mb-5 space-y-2">
                <h1 className="font-mono text-xl font-bold tracking-tight">Battle of Blogs</h1>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  Put two pages head-to-head. AI will score both, compare key SEO/content metrics,
                  and give a verdict on who wins and why.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="battle-left" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Page A
                  </Label>
                  <Input
                    id="battle-left"
                    value={leftUrl}
                    onChange={(event) => setLeftUrl(event.target.value)}
                    placeholder="https://example.com/blog/page-a"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="battle-right" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Page B
                  </Label>
                  <Input
                    id="battle-right"
                    value={rightUrl}
                    onChange={(event) => setRightUrl(event.target.value)}
                    placeholder="https://example.com/blog/page-b"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
                </div>

                {error ? (
                  <div className="border border-destructive/40 bg-destructive/5 p-3">
                    <p className="font-mono text-xs text-destructive">{error}</p>
                  </div>
                ) : null}

                <Button type="submit" className="w-full font-mono text-xs uppercase tracking-widest" disabled={loading}>
                  {loading ? (
                    <>
                      <CircleNotch size={13} className="animate-spin" />
                      Starting Battle…
                    </>
                  ) : (
                    <>
                      <Fire size={13} />
                      Compare Pages
                    </>
                  )}
                </Button>
              </form>
            </section>

            <section className="border border-border p-5">
              {loading ? <BattleLoadingState /> : battle ? <BattleResults battle={battle} /> : <BattleEmptyState />}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function BattleEmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/5">
        <Sword size={20} className="text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="font-mono text-sm font-semibold">Ready for a head-to-head</h2>
        <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
          Add two blog or content URLs and let AI compare topical coverage, intent fit, readability,
          keyword opportunity, and more.
        </p>
      </div>
    </div>
  );
}

function BattleLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-36 animate-pulse bg-muted" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="border border-border p-4">
            <div className="h-3 w-20 animate-pulse bg-muted/70" />
            <div className="mt-3 h-8 w-20 animate-pulse bg-muted/50" />
            <div className="mt-3 h-3 w-full animate-pulse bg-muted/40" />
          </div>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border border-border p-4">
          <div className="h-3 w-28 animate-pulse bg-muted/70" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="h-3 animate-pulse bg-muted/40" />
            <div className="h-3 animate-pulse bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BattleResults({ battle }: { battle: BlogBattleResult }) {
  return (
    <div className="space-y-5">
      <div className="border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Trophy size={13} className="text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Final Verdict
          </span>
        </div>
        <p className="mt-3 font-mono text-sm leading-relaxed text-foreground">{battle.verdict}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BattleSideCard side={battle.left} winner={battle.winner === "left"} />
        <BattleSideCard side={battle.right} winner={battle.winner === "right"} />
      </div>

      <div className="grid gap-3">
        {battle.metrics.map((metric) => (
          <div key={metric.key} className="border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {metric.label}
              </span>
              <div className="flex items-center gap-3 font-mono text-xs text-foreground">
                <span>{metric.leftScore}</span>
                <span className="text-muted-foreground">vs</span>
                <span>{metric.rightScore}</span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DualBar score={metric.leftScore} />
              <DualBar score={metric.rightScore} />
            </div>
            <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {metric.explanation}
            </p>
          </div>
        ))}
      </div>

      <div className="border border-border p-4">
        <div className="flex items-center gap-2">
          <Sparkle size={12} className="text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Quick Takeaways
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {battle.quickTakeaways.map((item, index) => (
            <p key={index} className="font-mono text-xs leading-relaxed text-foreground">
              {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function BattleSideCard({
  side,
  winner,
}: {
  side: BlogBattleResult["left"];
  winner: boolean;
}) {
  return (
    <div className={`border p-4 ${winner ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {side.nickname}
          </span>
          <p className="font-mono text-sm font-semibold leading-relaxed text-foreground">
            {side.title || side.url}
          </p>
          <a
            href={side.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-primary hover:underline"
          >
            {side.url}
          </a>
        </div>
        <div className="flex items-center gap-2">
          {winner ? <Crown size={16} weight="fill" className="text-primary" /> : null}
          <span className="font-mono text-3xl font-bold">{side.overallScore}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ListCard title="Strengths" items={side.strengths} />
        <ListCard title="Weaknesses" items={side.weaknesses} />
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-border p-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="font-mono text-xs leading-relaxed text-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function DualBar({ score }: { score: number }) {
  return (
    <div className="h-2 w-full bg-muted">
      <div className="h-full bg-primary" style={{ width: `${score}%` }} />
    </div>
  );
}
