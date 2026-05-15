"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  GoogleLogo,
  Info,
  Key,
  LinkSimple,
  ShieldCheck,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HistoryPanel, SaveToHistoryButton } from "@/components/history-panel";

interface IndexNowSnapshot {
  host: string;
  apiKey: string;
  keyLocation: string;
  engine: string;
  urlsText: string;
  result: SubmitResult | null;
}

const ENGINES = [
  { value: "indexnow", label: "api.indexnow.org (all engines)" },
  { value: "bing", label: "Bing" },
  { value: "yandex", label: "Yandex" },
  { value: "naver", label: "Naver" },
  { value: "seznam", label: "Seznam" },
  { value: "yep", label: "Yep" },
] as const;

interface SubmitResult {
  ok: boolean;
  status: number;
  statusText: string;
  endpoint: string;
  response: string | null;
  submitted: number;
  error?: string;
  details?: string;
}

interface VerifyResult {
  url: string;
  reachable: boolean;
  statusCode: number | null;
  contentMatch: boolean;
  contentFound: string | null;
  error: string | null;
}

interface PingResults {
  sitemapUrl: string;
  results: Record<string, { status: number | null; ok: boolean; error?: string }>;
}

function generateKey(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function inferHost(urls: string[]): string | null {
  for (const u of urls) {
    try { return new URL(u).host; } catch { continue; }
  }
  return null;
}

function statusExplain(status: number): { label: string; fix: string } {
  switch (status) {
    case 200: return { label: "Success — URLs submitted.", fix: "" };
    case 202: return {
      label: "Accepted — key validation pending.",
      fix: "The engine received your request but hasn't verified your key file yet. Make sure your key file is publicly accessible at the Key Location URL and retry in a few minutes.",
    };
    case 400: return {
      label: "Bad request.",
      fix: "Check that all URLs belong to the declared host, the key is 8–128 alphanumeric characters, and the JSON payload is valid.",
    };
    case 403: return {
      label: "Forbidden — key not found.",
      fix: "The engine couldn't fetch or verify your key file. Use the 'Verify Key File' button above to check that it's publicly accessible and contains exactly your key (no extra spaces or newlines).",
    };
    case 422: return {
      label: "Unprocessable — host or key mismatch.",
      fix: "One or more URLs don't match your declared host, or your key file content doesn't exactly match the key. Verify each URL starts with https://<your-host>/.",
    };
    case 429: return {
      label: "Too many requests.",
      fix: "You've hit the rate limit. Wait at least 1 hour before retrying. IndexNow allows up to 10,000 URLs per day per key.",
    };
    default: return { label: `HTTP ${status}`, fix: "Check the raw response below for details." };
  }
}

export function IndexNowSubmit() {
  const [host, setHost] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [keyLocation, setKeyLocation] = React.useState("");
  const [engine, setEngine] = React.useState<string>("indexnow");
  const [urlsText, setUrlsText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<SubmitResult | null>(null);
  const [error, setError] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);

  // Verification
  const [verifying, setVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] = React.useState<VerifyResult | null>(null);

  // Google sitemap ping
  const [sitemapUrl, setSitemapUrl] = React.useState("");
  const [pinging, setPinging] = React.useState(false);
  const [pingResult, setPingResult] = React.useState<PingResults | null>(null);
  const [pingError, setPingError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const saved = data?.indexnow as null | { host?: string; apiKey?: string; keyLocation?: string; engine?: string };
        if (!saved || cancelled) return;
        if (saved.host) setHost(saved.host);
        if (saved.apiKey) setApiKey(saved.apiKey);
        if (saved.keyLocation) setKeyLocation(saved.keyLocation);
        if (saved.engine) setEngine(saved.engine);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const urlList = React.useMemo(
    () => urlsText.split(/\r?\n/).map((u) => u.trim()).filter(Boolean),
    [urlsText],
  );

  const expectedKeyLocation = React.useMemo(() => {
    if (!host || !apiKey) return "";
    return `https://${host}/${apiKey}.txt`;
  }, [host, apiKey]);

  function handleGenerateKey() { setApiKey(generateKey()); setVerifyResult(null); }
  function handleInferHost() { const h = inferHost(urlList); if (h) setHost(h); }

  async function handleCopyKey() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  async function handleVerify() {
    const resolvedKey = apiKey.trim();
    const resolvedHost = host.trim();
    const resolvedLocation = keyLocation.trim() || expectedKeyLocation;
    if (!resolvedHost || !resolvedKey || !resolvedLocation) {
      setError("Enter host and API key first.");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/indexnow/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: resolvedHost, key: resolvedKey, keyLocation: resolvedLocation }),
      });
      setVerifyResult(await res.json());
    } catch {
      setVerifyResult({ url: resolvedLocation, reachable: false, statusCode: null, contentMatch: false, contentFound: null, error: "Network error" });
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!host.trim()) { setError("Host is required (e.g. www.example.com)."); return; }
    if (!apiKey.trim()) { setError("API key is required."); return; }
    if (urlList.length === 0) { setError("Add at least one URL (one per line)."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: host.trim(), key: apiKey.trim(), keyLocation: keyLocation.trim() || undefined, urlList, engine }),
      });
      const data = (await res.json()) as SubmitResult;
      setResult(data);
      try {
        await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ indexnow: { host: host.trim(), apiKey: apiKey.trim(), keyLocation: keyLocation.trim(), engine } }),
        });
      } catch { /* ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSitemapPing(e: React.FormEvent) {
    e.preventDefault();
    setPingError("");
    setPingResult(null);
    if (!sitemapUrl.trim()) { setPingError("Enter your sitemap URL."); return; }
    setPinging(true);
    try {
      const res = await fetch("/api/sitemap-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl: sitemapUrl.trim(), engines: ["google", "bing"] }),
      });
      const data = await res.json();
      if (data.error) { setPingError(data.error); } else { setPingResult(data); }
    } catch (err) {
      setPingError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setPinging(false);
    }
  }

  const resultInfo = result ? statusExplain(result.status) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl space-y-8"
    >
      {/* ── Google notice ── */}
      <div className="flex items-start gap-3 border border-yellow-500/30 bg-yellow-500/5 p-4">
        <Info size={14} className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div className="space-y-1">
          <p className="font-mono text-xs font-semibold text-yellow-700 dark:text-yellow-300">
            Google does not participate in IndexNow
          </p>
          <p className="font-mono text-[11px] leading-relaxed text-yellow-700/80 dark:text-yellow-300/80">
            IndexNow notifies Bing, Yandex, Naver, and others — but not Google.
            To notify Google of new or updated pages, use the{" "}
            <strong>Google Sitemap Ping</strong> section at the bottom of this page,
            or submit URLs manually via{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Search Console
            </a>
            .
          </p>
        </div>
      </div>

      {/* ── IndexNow form ── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest">IndexNow Submission</span>
          </div>
          <div className="flex items-center gap-3">
            <HistoryPanel<IndexNowSnapshot>
              tool="indexnow"
              refreshToken={historyRefresh}
              onRestore={(payload) => {
                setHost(payload.host ?? "");
                setApiKey(payload.apiKey ?? "");
                setKeyLocation(payload.keyLocation ?? "");
                setEngine(payload.engine ?? "indexnow");
                setUrlsText(payload.urlsText ?? "");
                setResult(payload.result ?? null);
                setError("");
                setVerifyResult(null);
              }}
            />
            {result && (
              <SaveToHistoryButton<IndexNowSnapshot>
                tool="indexnow"
                buildPayload={() => ({
                  id: `indexnow-${host.trim().replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40)}`,
                  label: `${host.trim()} — ${urlList.length} URL${urlList.length === 1 ? "" : "s"} [${result.status}]`,
                  payload: { host: host.trim(), apiKey: apiKey.trim(), keyLocation: keyLocation.trim(), engine, urlsText, result },
                })}
                onSaved={() => setHistoryRefresh((n) => n + 1)}
              />
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Host */}
          <div className="flex flex-col gap-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Host</Label>
            <div className="flex gap-2">
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="www.example.com" className="flex-1 font-mono text-xs" disabled={loading} />
              <Button type="button" variant="outline" size="sm" onClick={handleInferHost} disabled={urlList.length === 0 || loading} className="font-mono text-[11px] uppercase tracking-widest">
                Infer from URLs
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={apiKey} onChange={(e) => { setApiKey(e.target.value); setVerifyResult(null); }} placeholder="2371de24ab364e5598751f6b792b07d6" className="pl-8 font-mono text-xs" disabled={loading} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerateKey} disabled={loading} className="font-mono text-[11px] uppercase tracking-widest">Generate</Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyKey} disabled={!apiKey || loading} className="gap-1 font-mono text-[11px] uppercase tracking-widest">
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </Button>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              8–128 alphanumeric characters. You must host this key as a plain-text file on your domain so search engines can verify ownership.
            </p>
          </div>

          {/* Key Location */}
          <div className="flex flex-col gap-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Key Location <span className="normal-case text-muted-foreground/70">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkSimple size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={keyLocation} onChange={(e) => { setKeyLocation(e.target.value); setVerifyResult(null); }} placeholder={expectedKeyLocation || "https://www.example.com/myKey.txt"} className="pl-8 font-mono text-xs" disabled={loading} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleVerify} disabled={verifying || !host || !apiKey} className="gap-1.5 font-mono text-[11px] uppercase tracking-widest">
                {verifying ? <><CircleNotch size={12} className="animate-spin" /> Checking…</> : <><ShieldCheck size={12} /> Verify File</>}
              </Button>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              Leave empty to use the default:{" "}
              <span className="text-foreground">{expectedKeyLocation || "https://<host>/<key>.txt"}</span>.
              The file must contain only your API key with no extra whitespace.
            </p>

            {/* Verify result */}
            <AnimatePresence>
              {verifyResult && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2 border border-border bg-muted/20 p-3"
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Key File Verification — {verifyResult.url}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <VerifyRow ok={verifyResult.reachable} label={`File reachable (HTTP ${verifyResult.statusCode ?? "—"})`} />
                    <VerifyRow ok={verifyResult.contentMatch} label="File content matches key exactly" />
                    {!verifyResult.reachable && (
                      <p className="font-mono text-[10px] text-destructive">
                        {verifyResult.error
                          ? `Network error: ${verifyResult.error}`
                          : `Got HTTP ${verifyResult.statusCode}. The file must return 200 and be publicly accessible (no auth, no redirect to login page).`}
                      </p>
                    )}
                    {verifyResult.reachable && !verifyResult.contentMatch && verifyResult.contentFound && (
                      <p className="font-mono text-[10px] text-destructive">
                        File contains <code className="bg-muted px-1">{verifyResult.contentFound}</code> but expected exactly <code className="bg-muted px-1">{apiKey}</code>. Remove any trailing newlines or extra characters.
                      </p>
                    )}
                    {verifyResult.reachable && verifyResult.contentMatch && (
                      <p className="font-mono text-[10px] text-primary">
                        Setup looks correct. You can now submit URLs.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Engine */}
          <div className="flex flex-col gap-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Search Engine Endpoint</Label>
            <Select value={engine} onValueChange={setEngine} disabled={loading}>
              <SelectTrigger className="font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENGINES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              Submitting to one participating engine shares the URLs with all IndexNow partners. Use the default unless you need a specific one.
            </p>
          </div>

          {/* URLs */}
          <div className="flex flex-col gap-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              URLs to Submit <span className="ml-2 normal-case text-muted-foreground/70">({urlList.length} / 10,000)</span>
            </Label>
            <Textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder={`https://www.example.com/url1\nhttps://www.example.com/folder/url2`}
              className="min-h-32 font-mono text-xs"
              disabled={loading}
            />
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">One URL per line. All URLs must belong to the host above.</p>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 font-mono text-xs text-destructive">
              <Warning size={12} />{error}
            </motion.p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading} className="gap-1.5 font-mono text-xs">
              {loading ? <><CircleNotch size={13} className="animate-spin" />Submitting…</> : <>Submit to IndexNow<ArrowRight size={13} /></>}
            </Button>
            {result && resultInfo && (
              <span className={cn("font-mono text-[11px] uppercase tracking-widest", result.ok ? "text-primary" : "text-destructive")}>
                [{result.status}] {resultInfo.label}
              </span>
            )}
          </div>

          {/* Result detail */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 border border-border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <ResultRow label="Endpoint" value={result.endpoint} />
                  <ResultRow label="Submitted" value={`${result.submitted} URL${result.submitted === 1 ? "" : "s"}`} />
                  <ResultRow label="Status" value={`HTTP ${result.status}`} />
                </div>
                {resultInfo?.fix && (
                  <div className="flex items-start gap-2 border border-yellow-500/30 bg-yellow-500/5 p-3">
                    <Info size={12} className="mt-0.5 shrink-0 text-yellow-600" />
                    <p className="font-mono text-[10px] leading-relaxed text-yellow-700 dark:text-yellow-300">{resultInfo.fix}</p>
                  </div>
                )}
                {result.response && (
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Raw Response</span>
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all border border-border bg-background p-2 font-mono text-[11px]">{result.response}</pre>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </section>

      {/* ── Google Sitemap Ping ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex items-start gap-3">
          <GoogleLogo size={16} weight="bold" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <span className="block font-mono text-xs font-semibold uppercase tracking-widest">Notify Google via Sitemap Ping</span>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
              Google doesn&apos;t use IndexNow. The fastest free way to prompt Google to crawl your site is to ping its sitemap endpoint. This doesn&apos;t guarantee immediate indexing — it just queues your sitemap for re-processing. For individual URLs, use{" "}
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Google Search Console
              </a>{" "}
              URL Inspection (up to 1,000 URLs/day).
            </p>
          </div>
        </div>

        <form onSubmit={handleSitemapPing} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sitemap URL</Label>
            <div className="flex gap-2">
              <Input
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://www.example.com/sitemap.xml"
                className="flex-1 font-mono text-xs"
                disabled={pinging}
              />
              <Button type="submit" variant="outline" disabled={pinging} className="gap-1.5 font-mono text-[11px] uppercase tracking-widest">
                {pinging ? <><CircleNotch size={12} className="animate-spin" />Pinging…</> : <>Ping Google &amp; Bing<ArrowRight size={12} /></>}
              </Button>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              This sends a GET request to <code className="bg-muted px-1">google.com/ping?sitemap=…</code> and <code className="bg-muted px-1">bing.com/ping?sitemap=…</code>.
            </p>
          </div>

          {pingError && (
            <p className="flex items-center gap-1.5 font-mono text-xs text-destructive">
              <Warning size={12} />{pingError}
            </p>
          )}

          <AnimatePresence>
            {pingResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 border border-border bg-muted/30 p-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ping Results</span>
                {Object.entries(pingResult.results).map(([engine, r]) => (
                  <div key={engine} className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs capitalize text-foreground">{engine}</span>
                    <div className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle size={13} weight="fill" className="text-primary" />
                      ) : (
                        <XCircle size={13} weight="fill" className="text-destructive" />
                      )}
                      <span className={cn("font-mono text-[11px]", r.ok ? "text-primary" : "text-destructive")}>
                        {r.ok ? `HTTP ${r.status} — accepted` : r.error ?? `HTTP ${r.status} — failed`}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="font-mono text-[10px] text-muted-foreground">
                  A 200 response means the sitemap was queued for re-crawl. It may take hours to days before all pages are re-indexed.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </section>
    </motion.div>
  );
}

function VerifyRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle size={12} weight="fill" className="shrink-0 text-primary" />
      ) : (
        <XCircle size={12} weight="fill" className="shrink-0 text-destructive" />
      )}
      <span className="font-mono text-[11px] text-foreground">{label}</span>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] text-foreground break-all">{value}</span>
    </div>
  );
}
