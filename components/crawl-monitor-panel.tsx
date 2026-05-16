"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CircleNotch,
  Code,
  Copy,
  Globe,
  Plus,
  Robot,
  Trash,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConnectedSite {
  id: string;
  name: string;
  domain: string;
  token: string;
  createdAt: string;
}

interface CrawlLog {
  id: number;
  siteId: string;
  path: string;
  userAgent: string | null;
  botName: string | null;
  botCompany: string | null;
  isAiBot: boolean;
  ts: string;
}

const BOT_COMPANY_COLORS: Record<string, string> = {
  OpenAI: "border-green-500/40 bg-green-500/8 text-green-600 dark:text-green-400",
  Anthropic: "border-orange-500/40 bg-orange-500/8 text-orange-600 dark:text-orange-400",
  Perplexity: "border-blue-500/40 bg-blue-500/8 text-blue-600 dark:text-blue-400",
  Google: "border-yellow-500/40 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400",
  "You.com": "border-purple-500/40 bg-purple-500/8 text-purple-600 dark:text-purple-400",
  ByteDance: "border-pink-500/40 bg-pink-500/8 text-pink-600 dark:text-pink-400",
  Meta: "border-indigo-500/40 bg-indigo-500/8 text-indigo-600 dark:text-indigo-400",
};

const DEFAULT_BOT_COLOR = "border-border bg-muted/30 text-muted-foreground";

function botColor(company: string | null) {
  if (!company) return DEFAULT_BOT_COLOR;
  return BOT_COMPANY_COLORS[company] ?? DEFAULT_BOT_COLOR;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Tab = "overview" | "logs" | "integration";

export function CrawlMonitorPanel() {
  const [sites, setSites] = React.useState<ConnectedSite[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loadingSites, setLoadingSites] = React.useState(true);
  const [logs, setLogs] = React.useState<CrawlLog[]>([]);
  const [logsTotal, setLogsTotal] = React.useState(0);
  const [logsPage, setLogsPage] = React.useState(1);
  const [logsFilter, setLogsFilter] = React.useState<"all" | "ai">("all");
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [sitePickerOpen, setSitePickerOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [clearingId, setClearingId] = React.useState<string | null>(null);
  const [appOrigin, setAppOrigin] = React.useState("");

  React.useEffect(() => {
    setAppOrigin(window.location.origin);
    fetchSites();
  }, []);

  const selectedSite = sites.find((s) => s.id === selectedId) ?? null;

  async function fetchSites() {
    setLoadingSites(true);
    try {
      const res = await fetch("/api/crawl-monitor/sites");
      const data = await res.json();
      if (data.sites) {
        setSites(data.sites);
        if (!selectedId && data.sites.length > 0) {
          setSelectedId(data.sites[0].id);
        }
      }
    } finally {
      setLoadingSites(false);
    }
  }

  async function fetchLogs(siteId: string, page = 1, filter: "all" | "ai" = logsFilter) {
    setLoadingLogs(true);
    try {
      const res = await fetch(
        `/api/crawl-monitor/logs?siteId=${siteId}&page=${page}&filter=${filter}`,
      );
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setLogsTotal(data.total ?? 0);
        setLogsPage(page);
      }
    } finally {
      setLoadingLogs(false);
    }
  }

  React.useEffect(() => {
    if (selectedId) {
      setLogsPage(1);
      fetchLogs(selectedId, 1, logsFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, logsFilter]);

  async function handleDeleteSite(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/crawl-monitor/sites?id=${id}`, { method: "DELETE" });
      setSites((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) {
        const remaining = sites.filter((s) => s.id !== id);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearLogs(siteId: string) {
    setClearingId(siteId);
    try {
      await fetch(`/api/crawl-monitor/logs?siteId=${siteId}`, { method: "DELETE" });
      setLogs([]);
      setLogsTotal(0);
    } finally {
      setClearingId(null);
    }
  }

  // ── Stats computed from logs ──────────────────────────────────
  const allLogs = logs;
  const aiBotLogs = allLogs.filter((l) => l.isAiBot);
  const uniqueBotNames = [...new Set(aiBotLogs.map((l) => l.botName).filter(Boolean))];
  const uniquePages = [...new Set(allLogs.map((l) => l.path))];

  const botCounts = aiBotLogs.reduce<Record<string, { company: string | null; count: number }>>(
    (acc, log) => {
      const key = log.botName ?? "Unknown";
      if (!acc[key]) acc[key] = { company: log.botCompany, count: 0 };
      acc[key].count++;
      return acc;
    },
    {},
  );
  const botBreakdown = Object.entries(botCounts)
    .map(([name, v]) => ({ name, company: v.company, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const topPages = Object.entries(
    allLogs.reduce<Record<string, number>>((acc, l) => {
      acc[l.path] = (acc[l.path] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalPages = Math.ceil(logsTotal / 100);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
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
            <Robot size={13} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold">AI Crawl Monitor</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Site switcher */}
          {sites.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSitePickerOpen((v) => !v)}
                className="flex items-center gap-2 border border-border bg-background px-3 py-1.5 font-mono text-xs transition-colors hover:border-primary hover:text-primary"
              >
                <Globe size={12} />
                <span className="max-w-[140px] truncate">
                  {selectedSite ? selectedSite.name : "Select site"}
                </span>
                <CaretDown size={10} />
              </button>

              <AnimatePresence>
                {sitePickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full z-50 mt-1 min-w-[200px] border border-border bg-background shadow-lg"
                  >
                    {sites.map((site) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(site.id);
                          setActiveTab("overview");
                          setSitePickerOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-semibold text-foreground">
                            {site.name}
                          </p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {site.domain}
                          </p>
                        </div>
                        {site.id === selectedId && (
                          <Check size={11} className="shrink-0 text-primary" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-border p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConnectOpen(true);
                          setSitePickerOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-2 py-1.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/5"
                      >
                        <Plus size={11} />
                        Connect another site
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => setConnectOpen(true)}
            className="gap-1.5 font-mono text-[11px] uppercase tracking-widest"
          >
            <Plus size={12} />
            Connect Site
          </Button>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl">

          {loadingSites ? (
            <div className="flex items-center justify-center py-24">
              <CircleNotch size={20} className="animate-spin text-primary" />
            </div>
          ) : sites.length === 0 ? (
            <EmptyState onConnect={() => setConnectOpen(true)} />
          ) : !selectedSite ? (
            <div className="flex items-center justify-center py-24 font-mono text-xs text-muted-foreground">
              Select a site to view its dashboard.
            </div>
          ) : (
            <SiteDashboard
              site={selectedSite}
              logs={allLogs}
              aiBotLogs={aiBotLogs}
              uniqueBotNames={uniqueBotNames}
              uniquePages={uniquePages}
              botBreakdown={botBreakdown}
              topPages={topPages}
              logsTotal={logsTotal}
              loadingLogs={loadingLogs}
              logsPage={logsPage}
              logsFilter={logsFilter}
              totalPages={totalPages}
              activeTab={activeTab}
              appOrigin={appOrigin}
              deletingId={deletingId}
              clearingId={clearingId}
              onTabChange={setActiveTab}
              onFilterChange={(f) => setLogsFilter(f)}
              onPageChange={(p) => fetchLogs(selectedSite.id, p, logsFilter)}
              onDeleteSite={() => handleDeleteSite(selectedSite.id)}
              onClearLogs={() => handleClearLogs(selectedSite.id)}
            />
          )}
        </div>
      </main>

      {connectOpen && (
        <ConnectModal
          onClose={() => setConnectOpen(false)}
          onConnected={(site) => {
            setSites((prev) => [site, ...prev]);
            setSelectedId(site.id);
            setActiveTab("integration");
            setConnectOpen(false);
          }}
        />
      )}

      {/* Backdrop to close site picker */}
      {sitePickerOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setSitePickerOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-20 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center border border-border bg-muted/20">
        <Robot size={28} className="text-primary" weight="duotone" />
      </div>
      <div className="space-y-2">
        <h2 className="font-mono text-lg font-bold tracking-tight">AI Crawl Monitor</h2>
        <p className="mx-auto max-w-sm font-mono text-xs leading-relaxed text-muted-foreground">
          See exactly which AI bots are crawling your pages — GPTBot, ClaudeBot, PerplexityBot and
          16 more. Add a one-line snippet to your site and get live logs.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: "🔌", title: "Connect", desc: "Add your site + copy snippet" },
          { icon: "📡", title: "Detect", desc: "We identify 19 AI bots" },
          { icon: "📊", title: "Monitor", desc: "Live logs, stats, breakdowns" },
        ].map((step) => (
          <div key={step.title} className="flex flex-col gap-1.5 border border-border p-4 text-left">
            <span className="text-lg">{step.icon}</span>
            <span className="font-mono text-xs font-semibold text-foreground">{step.title}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{step.desc}</span>
          </div>
        ))}
      </div>

      <Button onClick={onConnect} className="gap-2 font-mono text-xs uppercase tracking-widest">
        <Plus size={14} />
        Connect Your First Site
      </Button>
    </motion.div>
  );
}

// ─── Site Dashboard ───────────────────────────────────────────────────────────

interface DashboardProps {
  site: ConnectedSite;
  logs: CrawlLog[];
  aiBotLogs: CrawlLog[];
  uniqueBotNames: (string | null)[];
  uniquePages: string[];
  botBreakdown: { name: string; company: string | null; count: number }[];
  topPages: { path: string; count: number }[];
  logsTotal: number;
  loadingLogs: boolean;
  logsPage: number;
  logsFilter: "all" | "ai";
  totalPages: number;
  activeTab: Tab;
  appOrigin: string;
  deletingId: string | null;
  clearingId: string | null;
  onTabChange: (t: Tab) => void;
  onFilterChange: (f: "all" | "ai") => void;
  onPageChange: (p: number) => void;
  onDeleteSite: () => void;
  onClearLogs: () => void;
}

function SiteDashboard({
  site,
  logs,
  aiBotLogs,
  uniqueBotNames,
  uniquePages,
  botBreakdown,
  topPages,
  logsTotal,
  loadingLogs,
  logsPage,
  logsFilter,
  totalPages,
  activeTab,
  appOrigin,
  deletingId,
  clearingId,
  onTabChange,
  onFilterChange,
  onPageChange,
  onDeleteSite,
  onClearLogs,
}: DashboardProps) {
  return (
    <motion.div
      key={site.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      {/* Site header */}
      <div className="flex items-start justify-between gap-4 border border-border p-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-mono text-sm font-bold text-foreground">{site.name}</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">{site.domain}</span>
          <span className="font-mono text-[10px] text-muted-foreground/60">
            Connected {new Date(site.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearLogs}
            disabled={clearingId === site.id || logs.length === 0}
            className="flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
            title="Clear all logs"
          >
            {clearingId === site.id ? <CircleNotch size={11} className="animate-spin" /> : <Trash size={11} />}
            Clear Logs
          </button>
          <button
            type="button"
            onClick={onDeleteSite}
            disabled={deletingId === site.id}
            className="flex items-center gap-1.5 border border-destructive/30 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-40"
            title="Disconnect site"
          >
            {deletingId === site.id ? <CircleNotch size={11} className="animate-spin" /> : <X size={11} />}
            Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {(["overview", "logs", "integration"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`border-b-2 px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            {loadingLogs ? (
              <div className="flex justify-center py-12">
                <CircleNotch size={18} className="animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <StatCard label="Total Visits" value={String(logsTotal)} />
                  <StatCard label="AI Bot Visits" value={String(aiBotLogs.length)} highlight />
                  <StatCard label="Unique AI Bots" value={String(uniqueBotNames.length)} />
                  <StatCard label="Pages Tracked" value={String(uniquePages.length)} />
                </div>

                {aiBotLogs.length === 0 ? (
                  <NoDataCard />
                ) : (
                  <>
                    {/* Bot breakdown */}
                    {botBreakdown.length > 0 && (
                      <div className="flex flex-col gap-3 border border-border p-4">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          AI Bot Breakdown
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {botBreakdown.map((b) => (
                            <div
                              key={b.name}
                              className={`flex items-center gap-2 border px-3 py-1.5 ${botColor(b.company)}`}
                            >
                              <span className="font-mono text-[11px] font-semibold">{b.name}</span>
                              <span className="font-mono text-[10px] opacity-70">{b.company}</span>
                              <span className="ml-1 font-mono text-[11px] font-bold">{b.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top pages */}
                    {topPages.length > 0 && (
                      <div className="flex flex-col gap-2 border border-border p-4">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Most Crawled Pages
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {topPages.map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                              <span className="min-w-0 truncate font-mono text-[11px] text-foreground">
                                {p.path}
                              </span>
                              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                {p.count} hits
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent AI visits */}
                    <div className="flex flex-col gap-2 border border-border p-4">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Recent AI Bot Visits
                      </span>
                      <LogTable logs={aiBotLogs.slice(0, 8)} compact />
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">Filter:</span>
              {(["all", "ai"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onFilterChange(f)}
                  className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    logsFilter === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All Visits" : "AI Bots Only"}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {logsTotal} total
              </span>
            </div>

            {loadingLogs ? (
              <div className="flex justify-center py-12">
                <CircleNotch size={18} className="animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <NoDataCard />
            ) : (
              <>
                <LogTable logs={logs} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={logsPage === 1}
                      onClick={() => onPageChange(logsPage - 1)}
                      className="border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    >
                      <CaretLeft size={12} />
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {logsPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={logsPage === totalPages}
                      onClick={() => onPageChange(logsPage + 1)}
                      className="border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    >
                      <CaretRight size={12} />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === "integration" && (
          <IntegrationTab site={site} appOrigin={appOrigin} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Log Table ────────────────────────────────────────────────────────────────

function LogTable({ logs, compact = false }: { logs: CrawlLog[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 pr-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Time
            </th>
            <th className="pb-2 pr-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Bot / Visitor
            </th>
            <th className="pb-2 pr-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Path
            </th>
            {!compact && (
              <th className="pb-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                User Agent
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-4 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                {timeAgo(log.ts)}
              </td>
              <td className="py-2 pr-4">
                {log.isAiBot && log.botName ? (
                  <span
                    className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] font-semibold ${botColor(log.botCompany)}`}
                  >
                    {log.botName}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">Human / Other</span>
                )}
              </td>
              <td className="py-2 pr-4 font-mono text-[11px] text-foreground max-w-[200px] truncate">
                {log.path}
              </td>
              {!compact && (
                <td className="py-2 font-mono text-[10px] text-muted-foreground max-w-[200px] truncate">
                  {log.userAgent ?? "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Integration Tab ──────────────────────────────────────────────────────────

function IntegrationTab({ site, appOrigin }: { site: ConnectedSite; appOrigin: string }) {
  const beaconUrl = `${appOrigin}/api/crawl-monitor/beacon`;
  const jsSnippet = `<!-- AI Crawl Monitor — paste before </body> -->
<script>
(function(){
  var img=new Image();
  img.src='${beaconUrl}?t=${site.token}&p='+encodeURIComponent(window.location.pathname);
})();
</script>`;

  const apiSnippet = `curl -X POST ${beaconUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "${site.token}",
    "path": "/your-page-path",
    "userAgent": "GPTBot/1.0"
  }'`;

  return (
    <motion.div
      key="integration"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-5"
    >
      <div className="border border-primary/20 bg-primary/5 p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Code size={13} className="text-primary" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
            Your Tracking Token
          </span>
        </div>
        <code className="font-mono text-xs text-foreground">{site.token}</code>
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
          Keep this private — it identifies your site in our system.
        </p>
      </div>

      <SnippetBlock
        title="JS Snippet"
        subtitle="Paste before </body> on every page — takes 30 seconds"
        code={jsSnippet}
      />

      <SnippetBlock
        title="Server-side API"
        subtitle="POST from your server on each request to catch all bots, including those that skip JS"
        code={apiSnippet}
      />
    </motion.div>
  );
}

function SnippetBlock({ title, subtitle, code }: { title: string; subtitle: string; code: string }) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">{title}</span>
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto border border-border bg-muted/20 p-4 font-mono text-[11px] leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}

// ─── Connect Modal ────────────────────────────────────────────────────────────

function ConnectModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: (site: ConnectedSite) => void;
}) {
  const [name, setName] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crawl-monitor/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to connect site.");
        return;
      }
      onConnected(data as ConnectedSite);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Robot size={14} weight="fill" className="text-primary" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest">
              Connect a Site
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Site Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Blog"
              className="font-mono text-xs"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Domain
            </label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="font-mono text-xs"
              required
            />
            <p className="font-mono text-[10px] text-muted-foreground">
              Without https:// — e.g. example.com or blog.example.com
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-2.5">
              <Warning size={12} className="mt-0.5 shrink-0 text-destructive" />
              <p className="font-mono text-[11px] text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !domain.trim()}
              className="flex-1 gap-2 font-mono text-xs uppercase tracking-widest"
            >
              {submitting ? (
                <>
                  <CircleNotch size={13} className="animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plus size={13} />
                  Connect Site
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="font-mono text-xs">
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 border p-3 ${highlight ? "border-primary/30 bg-primary/5" : "border-border"}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-mono text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function NoDataCard() {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-border py-14 text-center">
      <Robot size={24} className="text-muted-foreground/40" />
      <p className="font-mono text-xs text-muted-foreground">No visits logged yet.</p>
      <p className="font-mono text-[11px] text-muted-foreground/60">
        Add the snippet to your site — logs will appear here within seconds.
      </p>
    </div>
  );
}
