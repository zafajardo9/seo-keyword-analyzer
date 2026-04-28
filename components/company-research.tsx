"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowClockwise,
  ArrowLeft,
  Buildings,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  DownloadSimple,
  Envelope,
  FilePdf,
  Globe,
  MagnifyingGlass,
  Pause,
  Phone,
  Play,
  Sparkle,
  Trash,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  CompanyAgeMix,
  CompanyDiscoveryResult,
  CompanyDiscoveryRun,
  CompanyResearchMode,
  CompanyResearchResult,
  CompanyResearchRun,
  CompanyResearchStatus,
} from "@/lib/types";
import { getStoredModel, ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ToolNavDropdown } from "@/components/tool-nav-dropdown";

const HISTORY_KEY = "company_research_runs";
const MAX_HISTORY = 8;
const CONCURRENCY = 2;

type SortKey =
  | "status"
  | "companyName"
  | "domain"
  | "category"
  | "confidenceScore"
  | "relevanceScore";

type ResearchPhase = "idle" | "discovering" | "ranking" | "crawling";

interface CompanyResearchProps {
  initialUrl?: string;
}

interface RunStats {
  queued: number;
  crawling: number;
  enriched: number;
  failed: number;
}

const STATUS_LABELS: Record<CompanyResearchStatus, string> = {
  queued: "Queued",
  crawling: "Crawling",
  enriched: "Complete",
  failed: "Failed",
};

export function CompanyResearch({ initialUrl = "" }: CompanyResearchProps) {
  const [mode, setMode] = React.useState<CompanyResearchMode>(
    initialUrl ? "urls" : "discovery",
  );
  const [model, setModel] = React.useState("");
  const [input, setInput] = React.useState(initialUrl);
  const [market, setMarket] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [ageMix, setAgeMix] = React.useState<CompanyAgeMix>("both");
  const [contactPreference, setContactPreference] = React.useState(
    "Public business contacts",
  );
  const [limit, setLimit] = React.useState("25");
  const [results, setResults] = React.useState<CompanyResearchResult[]>([]);
  const [history, setHistory] = React.useState<CompanyResearchRun[]>([]);
  const [activeRunId, setActiveRunId] = React.useState("");
  const [activeRunMode, setActiveRunMode] =
    React.useState<CompanyResearchMode>("urls");
  const [activeDiscoveryQuery, setActiveDiscoveryQuery] =
    React.useState<CompanyDiscoveryRun | undefined>();
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("companyName");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [running, setRunning] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [phase, setPhase] = React.useState<ResearchPhase>("idle");
  const [runNote, setRunNote] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const cancelRef = React.useRef(false);
  const pausedRef = React.useRef(false);

  React.useEffect(() => {
    const stored = getStoredModel();
    if (stored) setModel(stored);

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      setHistory([]);
    }
  }, []);

  React.useEffect(() => {
    if (initialUrl.trim()) {
      setInput(initialUrl.trim());
      setMode("urls");
    }
  }, [initialUrl]);

  React.useEffect(() => {
    if (activeRunId && results.length > 0) {
      persistRun(
        activeRunId,
        results.map((result) => result.website),
        results,
        activeRunMode,
        activeDiscoveryQuery,
      );
    }
  }, [results, activeRunId, activeRunMode, activeDiscoveryQuery]);

  function persistRun(
    runId: string,
    sourceUrls: string[],
    nextResults: CompanyResearchResult[],
    runMode: CompanyResearchMode,
    discoveryQuery?: CompanyDiscoveryRun,
  ) {
    setHistory((current) => {
      const now = Date.now();
      const existing = current.find((run) => run.id === runId);
      const nextRun: CompanyResearchRun = {
        id: runId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        mode: runMode,
        sourceUrls,
        discoveryQuery,
        results: nextResults,
      };
      const nextHistory = [
        nextRun,
        ...current.filter((run) => run.id !== runId),
      ].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
  }

  function parseUrls(value: string): string[] {
    const urls = value
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);
    return Array.from(new Set(urls));
  }

  function createPendingResult(
    url: string,
    discovery?: CompanyDiscoveryResult,
  ): CompanyResearchResult {
    let domain = url;
    try {
      const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, "");
    } catch {
      domain = url;
    }

    return {
      id: `${domain}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: "queued",
      website: url,
      domain,
      companyName: domain,
      category: "",
      summary: "",
      targetAudience: "",
      partnershipFit: "",
      emails: [],
      phones: [],
      contactPage: "",
      socialLinks: [],
      confidenceScore: 0,
      notes: [],
      crawledPages: [],
      discovery,
    };
  }

  function updateResult(id: string, patch: Partial<CompanyResearchResult>) {
    setResults((current) =>
      current.map((result) =>
        result.id === id ? { ...result, ...patch } : result,
      ),
    );
  }

  async function waitWhilePaused() {
    while (pausedRef.current && !cancelRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  async function researchOne(
    result: CompanyResearchResult,
    selectedModel: string,
  ) {
    await waitWhilePaused();
    if (cancelRef.current) return;

    updateResult(result.id, { status: "crawling", error: undefined });

    try {
      const res = await fetch("/api/research/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: result.website,
          model: selectedModel,
          discovery: result.discovery,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to research company.");
      }

      updateResult(result.id, {
        ...data.company,
        id: result.id,
        status: "enriched",
      });
    } catch (err) {
      updateResult(result.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        notes: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  async function runQueue(queue: CompanyResearchResult[], selectedModel: string) {
    let cursor = 0;

    async function worker() {
      while (cursor < queue.length && !cancelRef.current) {
        const next = queue[cursor];
        cursor += 1;
        await researchOne(next, selectedModel);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
    );
    setRunning(false);
    setPaused(false);
    pausedRef.current = false;
    setPhase("idle");
  }

  function handleStart() {
    setError(null);
    const urls = parseUrls(input);
    if (urls.length === 0) {
      setError("Add at least one company website URL.");
      return;
    }

    const selectedModel = model || getStoredModel();
    if (!selectedModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }

    const pending = urls.map((url) => createPendingResult(url));
    const runId = `company-run-${Date.now()}`;
    cancelRef.current = false;
    pausedRef.current = false;
    setActiveRunId(runId);
    setActiveRunMode("urls");
    setActiveDiscoveryQuery(undefined);
    setResults(pending);
    setRunning(true);
    setPaused(false);
    setPhase("crawling");
    setRunNote(null);
    void runQueue(pending, selectedModel);
  }

  async function handleDiscover() {
    setError(null);
    setRunNote(null);

    const selectedModel = model || getStoredModel();
    if (!selectedModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }
    if (!market.trim()) {
      setError("Enter a market to discover companies.");
      return;
    }
    if (!location.trim()) {
      setError("Enter a location to focus the discovery.");
      return;
    }

    const discoveryQuery: CompanyDiscoveryRun = {
      market: market.trim(),
      location: location.trim(),
      industry: industry.trim() || undefined,
      ageMix,
      contactPreference: contactPreference.trim() || undefined,
      limit: Number(limit),
    };

    const runId = `company-discovery-${Date.now()}`;
    cancelRef.current = false;
    pausedRef.current = false;
    setActiveRunId(runId);
    setActiveRunMode("discovery");
    setActiveDiscoveryQuery(discoveryQuery);
    setResults([]);
    setRunning(true);
    setPaused(false);
    setPhase("discovering");

    try {
      const res = await fetch("/api/research/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...discoveryQuery, model: selectedModel }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to discover companies.");
      }

      const companies = Array.isArray(data.companies)
        ? (data.companies as CompanyDiscoveryResult[])
        : [];

      if (companies.length === 0) {
        setRunNote("No companies were discovered for this market and location.");
        setRunning(false);
        setPhase("idle");
        return;
      }

      if (companies.length < discoveryQuery.limit) {
        setRunNote(
          `Found ${companies.length} companies, fewer than the requested ${discoveryQuery.limit}.`,
        );
      }

      setPhase("ranking");
      const pending = companies.map((company) =>
        createPendingResult(company.website, company),
      );
      setResults(pending);
      setPhase("crawling");
      void runQueue(pending, selectedModel);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
      setPhase("idle");
    }
  }

  function handlePauseToggle() {
    const nextPaused = !paused;
    setPaused(nextPaused);
    pausedRef.current = nextPaused;
  }

  function handleCancel() {
    cancelRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setRunning(false);
    setPhase("idle");
    setResults((current) =>
      current.map((result) =>
        result.status === "queued" || result.status === "crawling"
          ? {
              ...result,
              status: "failed",
              error: "Run cancelled.",
              notes: ["Run cancelled."],
            }
          : result,
      ),
    );
  }

  function handleClear() {
    cancelRef.current = true;
    pausedRef.current = false;
    setRunning(false);
    setPaused(false);
    setResults([]);
    setActiveRunId("");
    setActiveDiscoveryQuery(undefined);
    setActiveRunMode("urls");
    setPhase("idle");
    setRunNote(null);
    setError(null);
  }

  function handleRetry(result: CompanyResearchResult) {
    const selectedModel = model || getStoredModel();
    if (!selectedModel) {
      setError("No AI model selected. Please select one first.");
      return;
    }

    cancelRef.current = false;
    setRunning(true);
    void researchOne(result, selectedModel).finally(() => setRunning(false));
  }

  function handleLoadHistory(run: CompanyResearchRun) {
    cancelRef.current = true;
    pausedRef.current = false;
    setActiveRunId(run.id);
    setActiveRunMode(run.mode ?? "urls");
    setActiveDiscoveryQuery(run.discoveryQuery);
    setInput(run.sourceUrls.join("\n"));
    if (run.discoveryQuery) {
      setMode("discovery");
      setMarket(run.discoveryQuery.market);
      setLocation(run.discoveryQuery.location);
      setIndustry(run.discoveryQuery.industry ?? "");
      setAgeMix(run.discoveryQuery.ageMix);
      setContactPreference(
        run.discoveryQuery.contactPreference ?? "Public business contacts",
      );
      setLimit(String(run.discoveryQuery.limit));
    } else {
      setMode("urls");
    }
    setResults(run.results);
    setRunning(false);
    setPaused(false);
    setError(null);
  }

  function handleDeleteHistory(runId: string) {
    setHistory((current) => {
      const next = current.filter((run) => run.id !== runId);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function copyValue(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const stats = React.useMemo<RunStats>(
    () =>
      results.reduce(
        (acc, result) => {
          acc[result.status] += 1;
          return acc;
        },
        { queued: 0, crawling: 0, enriched: 0, failed: 0 },
      ),
    [results],
  );

  const filteredResults = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const searched = query
      ? results.filter((result) => {
          const haystack = [
            result.companyName,
            result.domain,
            result.category,
            result.summary,
            result.discovery?.discoveryReason,
            result.discovery?.ageSignal,
            ...result.emails.map((contact) => contact.value),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : results;

    return [...searched].sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortKey === "relevanceScore") {
        return (
          ((a.discovery?.relevanceScore ?? 0) -
            (b.discovery?.relevanceScore ?? 0)) *
          direction
        );
      }

      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [results, search, sortDir, sortKey]);

  function csvCell(value: string | number): string {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const headers = [
      "Status",
      "Company",
      "Website",
      "Category",
      "Summary",
      "Target Audience",
      "Partnership Fit",
      "Discovery Reason",
      "Age Signal",
      "Relevance Score",
      "Emails",
      "Phones",
      "Contact Page",
      "Social Links",
      "Confidence",
      "Notes",
    ];
    const rows = filteredResults.map((result) => [
      STATUS_LABELS[result.status],
      result.companyName,
      result.website,
      result.category,
      result.summary,
      result.targetAudience,
      result.partnershipFit,
      result.discovery?.discoveryReason ?? "",
      result.discovery?.ageSignal ?? "",
      result.discovery?.relevanceScore ?? "",
      result.emails.map((contact) => contact.value).join("; "),
      result.phones.map((contact) => contact.value).join("; "),
      result.contactPage,
      result.socialLinks.map((contact) => contact.value).join("; "),
      result.confidenceScore,
      result.notes.join("; "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-research-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const { pdf, Document, Page, Text, View, StyleSheet } = await import(
      "@react-pdf/renderer"
    );

    const styles = StyleSheet.create({
      page: {
        fontFamily: "Helvetica",
        fontSize: 8,
        padding: 32,
        color: "#1a1a1a",
      },
      title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
      subtitle: { fontSize: 9, color: "#666666", marginBottom: 18 },
      stats: { flexDirection: "row", gap: 8, marginBottom: 14 },
      stat: { border: "0.5px solid #dddddd", padding: 6, width: "24%" },
      statLabel: { color: "#777777", fontSize: 7, marginBottom: 2 },
      statValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
      row: {
        border: "0.5px solid #dddddd",
        padding: 8,
        marginBottom: 8,
      },
      company: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 3 },
      muted: { color: "#666666", marginBottom: 2 },
      label: { fontFamily: "Helvetica-Bold" },
      text: { lineHeight: 1.35, marginBottom: 2 },
      footer: {
        position: "absolute",
        bottom: 24,
        left: 32,
        right: 32,
        flexDirection: "row",
        justifyContent: "space-between",
      },
    });

    const MyDoc = (
      <Document title="Company Research Report">
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Company Research Report</Text>
          <Text style={styles.subtitle}>
            Generated {new Date().toLocaleString()} · {filteredResults.length} companies
          </Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Complete</Text>
              <Text style={styles.statValue}>{stats.enriched}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Failed</Text>
              <Text style={styles.statValue}>{stats.failed}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Emails Found</Text>
              <Text style={styles.statValue}>
                {results.reduce((sum, result) => sum + result.emails.length, 0)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Avg Confidence</Text>
              <Text style={styles.statValue}>
                {results.length
                  ? Math.round(
                      results.reduce(
                        (sum, result) => sum + result.confidenceScore,
                        0,
                      ) / results.length,
                    )
                  : 0}
              </Text>
            </View>
          </View>

          {filteredResults.map((result) => (
            <View key={result.id} style={styles.row} wrap={false}>
              <Text style={styles.company}>
                {result.companyName || result.domain} · {STATUS_LABELS[result.status]}
              </Text>
              <Text style={styles.muted}>{result.website}</Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Category: </Text>
                {result.category || "Unknown"} · Confidence {result.confidenceScore}/100
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Summary: </Text>
                {result.summary || "No summary available."}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Partnership fit: </Text>
                {result.partnershipFit || "Review manually."}
              </Text>
              {result.discovery ? (
                <Text style={styles.text}>
                  <Text style={styles.label}>Discovery: </Text>
                  {result.discovery.ageSignal} · Relevance{" "}
                  {result.discovery.relevanceScore}/100 ·{" "}
                  {result.discovery.discoveryReason}
                </Text>
              ) : null}
              <Text style={styles.text}>
                <Text style={styles.label}>Emails: </Text>
                {result.emails.map((contact) => contact.value).join(", ") || "None"}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Phones: </Text>
                {result.phones.map((contact) => contact.value).join(", ") || "None"}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Contact: </Text>
                {result.contactPage || "None"}
              </Text>
              <Text style={styles.text}>
                <Text style={styles.label}>Notes: </Text>
                {result.notes.join("; ") || result.error || "None"}
              </Text>
            </View>
          ))}

          <View style={styles.footer} fixed>
            <Text>SEO Keyword Analyzer</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </Page>
      </Document>
    );

    const blob = await pdf(MyDoc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-research-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
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
            <Buildings size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Company Research
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ModelSelector onModelChange={setModel} />
          <ToolNavDropdown />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="grid w-full max-w-7xl gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="border border-border p-5">
              <div className="mb-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkle size={14} className="text-primary" />
                  <h1 className="font-mono text-xl font-bold tracking-tight">
                    Company Research
                  </h1>
                </div>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  Discover companies from a market or paste known websites. The
                  crawler checks public key pages, extracts contact details, and
                  AI turns the crawl into a clean outreach table.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 border border-border">
                  <button
                    type="button"
                    onClick={() => setMode("discovery")}
                    className={cn(
                      "px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors",
                      mode === "discovery"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    disabled={running}
                  >
                    Discover Companies
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("urls")}
                    className={cn(
                      "border-l border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors",
                      mode === "urls"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    disabled={running}
                  >
                    Paste URLs
                  </button>
                </div>

                {mode === "discovery" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="company-market"
                        className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        Market
                      </Label>
                      <Input
                        id="company-market"
                        value={market}
                        onChange={(event) => setMarket(event.target.value)}
                        placeholder="AI SEO tools"
                        className="font-mono text-xs"
                        disabled={running}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="company-location"
                        className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        Location
                      </Label>
                      <Input
                        id="company-location"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder="United States"
                        className="font-mono text-xs"
                        disabled={running}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="company-industry"
                        className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        Industry / Niche
                      </Label>
                      <Input
                        id="company-industry"
                        value={industry}
                        onChange={(event) => setIndustry(event.target.value)}
                        placeholder="B2B SaaS"
                        className="font-mono text-xs"
                        disabled={running}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                          Company Age
                        </Label>
                        <Select
                          value={ageMix}
                          onValueChange={(value) =>
                            setAgeMix(value as CompanyAgeMix)
                          }
                          disabled={running}
                        >
                          <SelectTrigger className="w-full font-mono text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="emerging">Emerging</SelectItem>
                            <SelectItem value="established">
                              Established
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                          Limit
                        </Label>
                        <Select
                          value={limit}
                          onValueChange={setLimit}
                          disabled={running}
                        >
                          <SelectTrigger className="w-full font-mono text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="contact-preference"
                        className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        Contact Preference
                      </Label>
                      <Input
                        id="contact-preference"
                        value={contactPreference}
                        onChange={(event) =>
                          setContactPreference(event.target.value)
                        }
                        placeholder="Public business contacts"
                        className="font-mono text-xs"
                        disabled={running}
                      />
                      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                        Requires `FIRECRAWL_API_KEY`. Discovery uses
                        Firecrawl search results, then crawls public company
                        pages.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label
                      htmlFor="company-urls"
                      className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      Company Websites
                    </Label>
                    <Textarea
                      id="company-urls"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={"https://example.com\nhttps://startup.com"}
                      className="min-h-[220px] font-mono text-xs"
                      disabled={running}
                    />
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      One URL per line. V1 only collects public contact details
                      visible on each website.
                    </p>
                  </div>
                )}

                {error ? (
                  <div className="border border-destructive/40 bg-destructive/5 p-3">
                    <p className="font-mono text-xs text-destructive">{error}</p>
                  </div>
                ) : null}

                {runNote ? (
                  <div className="border border-primary/30 bg-primary/5 p-3">
                    <p className="font-mono text-xs text-primary">{runNote}</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={mode === "discovery" ? handleDiscover : handleStart}
                    disabled={running}
                    className="font-mono text-xs uppercase tracking-widest"
                  >
                    {running ? (
                      <CircleNotch size={13} className="animate-spin" />
                    ) : (
                      <Play size={13} />
                    )}
                    {mode === "discovery" ? "Discover" : "Start"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePauseToggle}
                    disabled={!running}
                    className="font-mono text-xs uppercase tracking-widest"
                  >
                    {paused ? <Play size={13} /> : <Pause size={13} />}
                    {paused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={!running}
                    className="font-mono text-xs uppercase tracking-widest"
                  >
                    <X size={13} />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="font-mono text-xs uppercase tracking-widest"
                  >
                    <Trash size={13} />
                    Clear
                  </Button>
                </div>
              </div>
            </section>

            <section className="border border-border p-5">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle size={14} className="text-primary" />
                <h2 className="font-mono text-xs font-semibold uppercase tracking-widest">
                  Progress
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Discovering"
                  value={phase === "discovering" ? 1 : 0}
                />
                <StatCard label="Ranking" value={phase === "ranking" ? 1 : 0} />
                <StatCard label="Queued" value={stats.queued} />
                <StatCard label="Crawling" value={stats.crawling} />
                <StatCard label="Complete" value={stats.enriched} />
                <StatCard label="Failed" value={stats.failed} />
              </div>
            </section>

            <section className="border border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-widest">
                  Local History
                </h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {history.length}
                </span>
              </div>
              {history.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Completed runs will appear here.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between gap-3 border border-border p-3"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadHistory(run)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate font-mono text-xs font-semibold">
                          {run.mode === "discovery"
                            ? run.discoveryQuery?.market || "Discovery"
                            : `${run.results.length} companies`}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {run.results.length} companies ·{" "}
                          {new Date(run.updatedAt).toLocaleString()}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(run.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Delete history run"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 border border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <MagnifyingGlass
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company, domain, email, category, or discovery reason..."
                  className="pl-8 font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {copied ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Copied {copied}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportCsv}
                  disabled={filteredResults.length === 0}
                  className="font-mono text-xs uppercase tracking-widest"
                >
                  <DownloadSimple size={13} />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void exportPdf()}
                  disabled={filteredResults.length === 0}
                  className="font-mono text-xs uppercase tracking-widest"
                >
                  <FilePdf size={13} />
                  PDF
                </Button>
              </div>
            </div>

            <ResultsTable
              results={filteredResults}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRetry={handleRetry}
              onCopy={copyValue}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

function SortButton({
  label,
  sortKey,
  activeKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      {activeKey === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

function StatusBadge({ status }: { status: CompanyResearchStatus }) {
  const className =
    status === "enriched"
      ? "border-primary/30 bg-primary/5 text-primary"
      : status === "failed"
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : "border-border text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        className,
      )}
    >
      {status === "crawling" ? (
        <CircleNotch size={10} className="animate-spin" />
      ) : status === "failed" ? (
        <Warning size={10} />
      ) : status === "enriched" ? (
        <Check size={10} />
      ) : null}
      {STATUS_LABELS[status]}
    </span>
  );
}

function ResultsTable({
  results,
  sortKey,
  sortDir,
  onSort,
  onRetry,
  onCopy,
}: {
  results: CompanyResearchResult[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onRetry: (result: CompanyResearchResult) => void;
  onCopy: (value: string, label: string) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="flex min-h-[460px] flex-col items-center justify-center gap-4 border border-border p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/5">
          <Buildings size={22} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="font-mono text-sm font-semibold">
            Ready for company research
          </h2>
          <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
            Add websites on the left to build a contact and partnership
            research table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[1500px] border-collapse">
        <thead className="border-b border-border bg-muted/25">
          <tr>
            <th className="p-3 text-left">
              <SortButton
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="p-3 text-left">
              <SortButton
                label="Company"
                sortKey="companyName"
                activeKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="p-3 text-left">
              <SortButton
                label="Website"
                sortKey="domain"
                activeKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="p-3 text-left">
              <SortButton
                label="Category"
                sortKey="category"
                activeKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="p-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Summary
              </span>
            </th>
            <th className="p-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Partnership Fit
              </span>
            </th>
            <th className="p-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Discovery Reason
              </span>
            </th>
            <th className="p-3 text-left">
              <SortButton
                label="Relevance"
                sortKey="relevanceScore"
                activeKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="p-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Emails
              </span>
            </th>
            <th className="p-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Phones
              </span>
            </th>
            <th className="p-3 text-left">
              <SortButton
                label="Confidence"
                sortKey="confidenceScore"
                activeKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="p-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr
              key={result.id}
              className="border-b border-border align-top last:border-b-0"
            >
              <td className="p-3">
                <StatusBadge status={result.status} />
              </td>
              <td className="max-w-[220px] p-3">
                <p className="font-mono text-xs font-semibold leading-relaxed">
                  {result.companyName || result.domain}
                </p>
                {result.targetAudience ? (
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {result.targetAudience}
                  </p>
                ) : null}
              </td>
              <td className="max-w-[220px] p-3">
                <a
                  href={result.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
                >
                  <Globe size={11} />
                  {result.domain || result.website}
                </a>
                {result.contactPage ? (
                  <a
                    href={result.contactPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block font-mono text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Contact page
                  </a>
                ) : null}
              </td>
              <td className="max-w-[180px] p-3 font-mono text-xs">
                {result.category || "-"}
              </td>
              <td className="max-w-[280px] p-3">
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  {result.summary || result.error || "Waiting for crawl."}
                </p>
                {result.notes.length > 0 ? (
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {result.notes.join(" ")}
                  </p>
                ) : null}
              </td>
              <td className="max-w-[260px] p-3 font-mono text-xs leading-relaxed">
                {result.partnershipFit || "-"}
              </td>
              <td className="max-w-[260px] p-3">
                {result.discovery ? (
                  <div className="space-y-2">
                    <span className="inline-flex border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {result.discovery.ageSignal}
                    </span>
                    <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                      {result.discovery.discoveryReason}
                    </p>
                    <a
                      href={result.discovery.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[10px] text-primary hover:underline"
                    >
                      Search evidence
                    </a>
                  </div>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">
                    Manual URL
                  </span>
                )}
              </td>
              <td className="p-3">
                <div className="w-24">
                  <div className="flex items-end gap-1">
                    <span className="font-mono text-lg font-semibold">
                      {result.discovery?.relevanceScore ?? 0}
                    </span>
                    <span className="pb-0.5 font-mono text-[10px] text-muted-foreground">
                      /100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${result.discovery?.relevanceScore ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              </td>
              <td className="max-w-[220px] p-3">
                <ContactList
                  contacts={result.emails}
                  icon="email"
                  empty="No email"
                  onCopy={onCopy}
                />
              </td>
              <td className="max-w-[180px] p-3">
                <ContactList
                  contacts={result.phones}
                  icon="phone"
                  empty="No phone"
                  onCopy={onCopy}
                />
              </td>
              <td className="p-3">
                <div className="w-24">
                  <div className="flex items-end gap-1">
                    <span className="font-mono text-lg font-semibold">
                      {result.confidenceScore}
                    </span>
                    <span className="pb-0.5 font-mono text-[10px] text-muted-foreground">
                      /100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${result.confidenceScore}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {result.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => onRetry(result)}
                      className="text-muted-foreground transition-colors hover:text-primary"
                      aria-label="Retry company research"
                    >
                      <ArrowClockwise size={14} />
                    </button>
                  ) : null}
                  {result.emails[0] ? (
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(result.emails[0].value, "email")
                      }
                      className="text-muted-foreground transition-colors hover:text-primary"
                      aria-label="Copy first email"
                    >
                      <Copy size={14} />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactList({
  contacts,
  icon,
  empty,
  onCopy,
}: {
  contacts: { value: string; sourceUrl: string }[];
  icon: "email" | "phone";
  empty: string;
  onCopy: (value: string, label: string) => void;
}) {
  const Icon = icon === "email" ? Envelope : Phone;

  if (contacts.length === 0) {
    return <span className="font-mono text-[10px] text-muted-foreground">{empty}</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {contacts.slice(0, 3).map((contact) => (
        <button
          key={`${contact.value}-${contact.sourceUrl}`}
          type="button"
          onClick={() => onCopy(contact.value, icon)}
          className="inline-flex max-w-full items-center gap-1 text-left font-mono text-[10px] text-foreground transition-colors hover:text-primary"
          title={contact.sourceUrl}
        >
          <Icon size={11} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{contact.value}</span>
        </button>
      ))}
      {contacts.length > 3 ? (
        <span className="font-mono text-[10px] text-muted-foreground">
          +{contacts.length - 3} more
        </span>
      ) : null}
    </div>
  );
}
