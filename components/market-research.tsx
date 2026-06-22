"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChartBar,
  ChartLineUp,
  CircleNotch,
  Fire,
  Globe,
  Lightning,
  MagnifyingGlass,
  Newspaper,
  ShieldWarning,
  Sparkle,
  Star,
  Sword,
  Target,
  TrendUp,
  User,
} from "@phosphor-icons/react";
import { MarketResearchReport } from "@/lib/types";
import { getStoredModel, ModelSelector } from "@/components/model-selector";
import {
  ApiKeyManager,
  getStoredGeminiKey,
} from "@/components/api-key-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HistoryPanel, SaveToHistoryButton } from "@/components/history-panel";
import { InfoButton, ToolInfoDrawer } from "@/components/tool-info-drawer";

const MARKET_INFO = {
  toolName: "Market Research",
  tagline:
    "Enter a company name or market topic and get a clear snapshot of where things stand — trends, competition, recent news, and where opportunities or risks exist.",
  sections: [
    {
      title: "What's trending in your market",
      body: "The topics, technologies, and shifts currently driving your space, so you can speak to what your audience actually cares about right now.",
    },
    {
      title: "Who you're up against",
      body: "Key players in the market, what they're known for, and how they position themselves — so you can spot gaps and avoid stepping on what's already crowded.",
    },
    {
      title: "Recent news worth knowing",
      body: "What's happened lately — launches, funding, partnerships, or market shifts that could affect how you position, price, or pitch.",
    },
    {
      title: "Opportunities and risks",
      body: "Where there's open space to grow, and where there are headwinds or threats worth keeping an eye on before you make a move.",
    },
  ],
};

interface MarketSnapshot {
  url: string;
  industry: string;
  report: MarketResearchReport | null;
}

interface MarketResearchProps {
  initialUrl?: string;
}

export function MarketResearch({ initialUrl = "" }: MarketResearchProps) {
  const [model, setModel] = React.useState("");
  const [url, setUrl] = React.useState(initialUrl);
  const [industry, setIndustry] = React.useState("");
  const [report, setReport] = React.useState<MarketResearchReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [infoOpen, setInfoOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);
  }, []);

  React.useEffect(() => {
    if (initialUrl.trim()) {
      setUrl(initialUrl.trim());
    }
  }, [initialUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setReport(null);

    if (!url.trim()) {
      setError("Please enter a company website URL.");
      return;
    }

    const currentModel = model || getStoredModel();
    if (!currentModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/research/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          industry: industry.trim() || undefined,
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate market research report.");
        return;
      }

      setReport(data.report ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setReport(null);
    setError(null);
    setUrl("");
    setIndustry("");
  }

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
            <MagnifyingGlass size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Market Research
            </span>
            <InfoButton onClick={() => setInfoOpen(true)} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HistoryPanel<MarketSnapshot>
            tool="market-research"
            refreshToken={historyRefresh}
            onRestore={(payload) => {
              setUrl(payload.url ?? "");
              setIndustry(payload.industry ?? "");
              setReport(payload.report ?? null);
              setError(null);
            }}
          />
          <ApiKeyManager />
          <ModelSelector onModelChange={setModel} />
        </div>
      </nav>

      <ToolInfoDrawer
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        {...MARKET_INFO}
      />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <section className="border border-border p-5">
              <div className="mb-5 space-y-2">
                <h1 className="font-mono text-xl font-bold tracking-tight">
                  Market Research
                </h1>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  Enter a company website. AI scrapes the homepage, searches the
                  web for current market intelligence, and synthesizes a full
                  market research report — trends, competitors, news, and
                  opportunities.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="market-url"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Company Website
                  </Label>
                  <Input
                    id="market-url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="font-mono text-xs"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="market-industry"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Industry / Business Type (optional)
                  </Label>
                  <Input
                    id="market-industry"
                    type="text"
                    placeholder="e.g. SaaS, E-commerce, Healthcare"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 font-mono text-xs font-semibold uppercase tracking-widest"
                  >
                    {loading ? (
                      <>
                        <CircleNotch size={14} className="mr-2 animate-spin" />
                        Researching...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlass size={14} className="mr-2" />
                        Start Research
                      </>
                    )}
                  </Button>

                  {report && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="font-mono text-xs uppercase tracking-widest"
                    >
                      Reset
                    </Button>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-destructive">
                    <ShieldWarning size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            </section>

            {report && (
              <section className="space-y-5">
                <div className="flex justify-end">
                  <SaveToHistoryButton<MarketSnapshot>
                    tool="market-research"
                    buildPayload={() => ({
                      label: `${report.companyName || url.trim()}${industry.trim() ? ` \u2014 ${industry.trim()}` : ""}`,
                      payload: {
                        url: url.trim(),
                        industry: industry.trim(),
                        report,
                      },
                    })}
                    onSaved={() => setHistoryRefresh((n) => n + 1)}
                  />
                </div>
                <div className="border border-border p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-mono text-lg font-bold tracking-tight">
                        {report.companyName}
                      </h2>
                      <p className="font-mono text-xs text-muted-foreground">
                        {report.industry}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded border border-primary/30 bg-primary/5 px-2.5 py-1">
                      <Target size={12} className="text-primary" />
                      <span className="font-mono text-xs font-semibold text-primary">
                        {report.confidenceScore}% confidence
                      </span>
                    </div>
                  </div>

                  <p className="mb-5 font-mono text-sm leading-relaxed text-foreground">
                    {report.summary}
                  </p>

                  <div className="space-y-5">
                    {report.trends.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <TrendUp size={12} className="text-primary" />
                          Market Trends
                        </h3>
                        <ul className="space-y-1.5">
                          {report.trends.map((trend, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 font-mono text-xs leading-relaxed text-foreground"
                            >
                              <ArrowRight
                                size={10}
                                className="mt-1 shrink-0 text-primary"
                              />
                              {trend}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.competitorInsights.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <ChartBar size={12} className="text-primary" />
                          Competitor Insights
                        </h3>
                        <ul className="space-y-1.5">
                          {report.competitorInsights.map((insight, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 font-mono text-xs leading-relaxed text-foreground"
                            >
                              <ArrowRight
                                size={10}
                                className="mt-1 shrink-0 text-primary"
                              />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.recentNews.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <Newspaper size={12} className="text-primary" />
                          Recent News
                        </h3>
                        <ul className="space-y-1.5">
                          {report.recentNews.map((news, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 font-mono text-xs leading-relaxed text-foreground"
                            >
                              <ArrowRight
                                size={10}
                                className="mt-1 shrink-0 text-primary"
                              />
                              {news}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.opportunities.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <Lightning size={12} className="text-primary" />
                          Opportunities
                        </h3>
                        <ul className="space-y-1.5">
                          {report.opportunities.map((opportunity, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 font-mono text-xs leading-relaxed text-foreground"
                            >
                              <ArrowRight
                                size={10}
                                className="mt-1 shrink-0 text-primary"
                              />
                              {opportunity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.risks.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <Fire size={12} className="text-destructive" />
                          Risks
                        </h3>
                        <ul className="space-y-1.5">
                          {report.risks.map((risk, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 font-mono text-xs leading-relaxed text-foreground"
                            >
                              <ArrowRight
                                size={10}
                                className="mt-1 shrink-0 text-destructive"
                              />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Similar Companies */}
                    {report.similarCompanies &&
                      report.similarCompanies.length > 0 && (
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            <Sword size={12} className="text-primary" />
                            Similar Companies &amp; Competitors
                          </h3>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {report.similarCompanies.map((comp, i) => (
                              <div key={i} className="border border-border p-3">
                                <p className="font-mono text-xs font-semibold text-foreground">
                                  {comp.name}
                                </p>
                                {comp.website && (
                                  <a
                                    href={comp.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate font-mono text-[10px] text-primary hover:underline"
                                  >
                                    {comp.website}
                                  </a>
                                )}
                                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                  {comp.description}
                                </p>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <div className="rounded bg-green-500/10 px-2 py-1">
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-green-600">
                                      Google
                                    </span>
                                    <p className="font-mono text-xs font-bold text-green-600">
                                      {comp.googleVisibility}%
                                    </p>
                                  </div>
                                  <div className="rounded bg-blue-500/10 px-2 py-1">
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-blue-600">
                                      Users
                                    </span>
                                    <p className="font-mono text-xs font-bold text-blue-600">
                                      {comp.userPreference}%
                                    </p>
                                  </div>
                                </div>
                                <p className="mt-1 font-mono text-[10px] italic text-muted-foreground">
                                  {comp.positioning}
                                </p>
                                {comp.strengths.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {comp.strengths.map((s, j) => (
                                      <span
                                        key={j}
                                        className="rounded bg-green-500/10 px-1.5 py-0.5 font-mono text-[9px] text-green-700"
                                      >
                                        + {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Market Visibility Comparison */}
                    {report.marketVisibility &&
                      report.marketVisibility.length > 0 && (
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            <ChartLineUp size={12} className="text-primary" />
                            Market Visibility Comparison
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    Competitor
                                  </th>
                                  <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    Google Ranking
                                  </th>
                                  <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    User Trust
                                  </th>
                                  <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    Content Quality
                                  </th>
                                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    Key Difference
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.marketVisibility.map((row, i) => (
                                  <tr
                                    key={i}
                                    className="border-b border-border last:border-0"
                                  >
                                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">
                                      {row.competitor}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <Badge type={row.googleRanking} />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <Badge type={row.userTrust} />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <Badge type={row.contentQuality} />
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                                      {row.keyDifference}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* Google vs User Favored Factors */}
                    {(report.googleFavoredFactors?.length ?? 0) > 0 ||
                    (report.userFavoredFactors?.length ?? 0) > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(report.googleFavoredFactors?.length ?? 0) > 0 && (
                          <div className="border border-border p-4">
                            <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              <Globe size={12} className="text-primary" />
                              Favored by Google
                            </h3>
                            <ul className="space-y-1">
                              {report.googleFavoredFactors!.map((f, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 font-mono text-[10px] leading-relaxed text-foreground"
                                >
                                  <span className="mt-0.5 text-green-500">
                                    ✓
                                  </span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(report.userFavoredFactors?.length ?? 0) > 0 && (
                          <div className="border border-border p-4">
                            <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              <Star size={12} className="text-primary" />
                              Favored by Users / Clients
                            </h3>
                            <ul className="space-y-1">
                              {report.userFavoredFactors!.map((f, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 font-mono text-[10px] leading-relaxed text-foreground"
                                >
                                  <span className="mt-0.5 text-blue-500">
                                    ✓
                                  </span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Overall Positioning */}
                    {report.overallPositioning && (
                      <div className="rounded border border-primary/30 bg-primary/5 p-4">
                        <h3 className="mb-1 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                          <Target size={12} />
                          Overall Positioning
                        </h3>
                        <p className="font-mono text-xs leading-relaxed text-foreground">
                          {report.overallPositioning}
                        </p>
                      </div>
                    )}

                    {report.sources.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <Globe size={12} className="text-primary" />
                          Sources
                        </h3>
                        <ul className="space-y-1">
                          {report.sources.map((source, i) => (
                            <li key={i}>
                              <a
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary"
                              >
                                {source}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Badge({ type }: { type: string }) {
  const colorClass =
    type === "stronger" || type === "better"
      ? "bg-green-500/10 text-green-600 border-green-500/30"
      : type === "weaker" || type === "worse"
        ? "bg-red-500/10 text-red-500 border-red-500/30"
        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";

  const label =
    type === "stronger"
      ? "Stronger"
      : type === "weaker"
        ? "Weaker"
        : type === "better"
          ? "Better"
          : type === "worse"
            ? "Worse"
            : "Similar";

  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${colorClass}`}
    >
      {label}
    </span>
  );
}
