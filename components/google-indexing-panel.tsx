"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleNotch,
  GoogleLogo,
  Info,
  Trash,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HistoryPanel, SaveToHistoryButton } from "@/components/history-panel";
import type { UrlResult } from "@/app/api/google-indexing/route";

interface IndexingSnapshot {
  urlsText: string;
  results: UrlResult[];
}

const SETUP_STEPS = [
  {
    n: "1",
    title: "Create a Google Cloud project",
    body: (
      <>
        Go to{" "}
        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          console.cloud.google.com
        </a>{" "}
        → New Project (or use an existing one).
      </>
    ),
  },
  {
    n: "2",
    title: "Enable the Indexing API",
    body: (
      <>
        In the project, go to{" "}
        <strong>APIs &amp; Services → Library</strong> and search for{" "}
        <strong>Web Search Indexing API</strong>. Click{" "}
        <strong>Enable</strong>.
      </>
    ),
  },
  {
    n: "3",
    title: "Create a service account",
    body: (
      <>
        Go to <strong>IAM &amp; Admin → Service Accounts → Create Service Account</strong>.
        Give it any name. No special roles needed — click through to finish.
        Then open the account, go to <strong>Keys → Add Key → Create new key → JSON</strong>.
        Download the JSON file.
      </>
    ),
  },
  {
    n: "4",
    title: "Add service account as a Search Console owner",
    body: (
      <>
        Open{" "}
        <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Google Search Console
        </a>
        , select your property, go to{" "}
        <strong>Settings → Users and permissions → Add user</strong>.
        Paste the <code className="bg-muted px-1 text-[11px]">client_email</code> from the JSON file, set permission to{" "}
        <strong>Owner</strong>, and save.
      </>
    ),
  },
  {
    n: "5",
    title: "Paste your JSON key below",
    body: "Open the downloaded JSON file, copy all its contents, and paste it into the field below.",
  },
];

export function GoogleIndexingPanel() {
  const [saJson, setSaJson] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedEmail, setSavedEmail] = React.useState<string | null>(null);
  const [setupError, setSetupError] = React.useState("");
  const [isConfigured, setIsConfigured] = React.useState(false);

  const [urlsText, setUrlsText] = React.useState("");
  const [notifType, setNotifType] = React.useState<"URL_UPDATED" | "URL_DELETED">("URL_UPDATED");
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<UrlResult[]>([]);
  const [submitError, setSubmitError] = React.useState("");
  const [historyRefresh, setHistoryRefresh] = React.useState(0);

  const urlList = React.useMemo(
    () => urlsText.split(/\r?\n/).map((u) => u.trim()).filter(Boolean),
    [urlsText],
  );

  React.useEffect(() => {
    fetch("/api/google-indexing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) {
          setIsConfigured(true);
          setSavedEmail(d.email);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveKey() {
    setSetupError("");
    setSaving(true);
    try {
      const res = await fetch("/api/google-indexing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saJson: saJson.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSetupError(data.error ?? "Failed to save key.");
        return;
      }
      setIsConfigured(true);
      setSavedEmail(data.email ?? null);
      setSaJson("");
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearKey() {
    setSaving(true);
    try {
      await fetch("/api/google-indexing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saJson: "" }),
      });
      setIsConfigured(false);
      setSavedEmail(null);
      setSaJson("");
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setResults([]);

    if (!isConfigured) {
      setSubmitError("Set up your Google Service Account first.");
      return;
    }
    if (urlList.length === 0) {
      setSubmitError("Enter at least one URL.");
      return;
    }
    if (urlList.length > 200) {
      setSubmitError("Google limits 200 URLs per day. Split into batches.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/google-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlList, type: notifType }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error ?? "Submission failed.");
        return;
      }
      setResults(data.results ?? []);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={12} />
            Home
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <GoogleLogo size={13} weight="bold" className="text-primary" />
            <span className="font-mono text-xs font-semibold">Google Indexing</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HistoryPanel<IndexingSnapshot>
            tool="google-indexing"
            refreshToken={historyRefresh}
            onRestore={(payload) => {
              setUrlsText(payload.urlsText ?? "");
              setResults(payload.results ?? []);
              setSubmitError("");
            }}
          />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-3xl space-y-10">

          {/* Notice */}
          <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 p-4">
            <Info size={14} className="mt-0.5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold text-foreground">
                Direct Google indexing via the official Indexing API
              </p>
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                This sends <code className="bg-muted px-1">URL_UPDATED</code> notifications directly to Google, asking it to crawl and re-index specific URLs immediately.
                Limit: <strong>200 URLs per day</strong> per Google Cloud project (extendable on request).
                This does not guarantee immediate indexing — Google still decides when to crawl.
              </p>
            </div>
          </div>

          {/* ── Setup section ── */}
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                1 · Service Account Setup
              </span>
              {isConfigured && (
                <span className="flex items-center gap-1 border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                  <CheckCircle size={10} weight="fill" />
                  Configured
                </span>
              )}
            </div>

            {isConfigured ? (
              <div className="flex items-center justify-between border border-border bg-muted/20 p-4">
                <div>
                  <p className="font-mono text-xs text-foreground">Service account active</p>
                  {savedEmail && (
                    <p className="font-mono text-[11px] text-muted-foreground">{savedEmail}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearKey}
                  disabled={saving}
                  className="gap-1.5 font-mono text-[11px] uppercase tracking-widest text-destructive hover:text-destructive"
                >
                  <Trash size={12} />
                  Remove Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step-by-step guide */}
                <ol className="space-y-3">
                  {SETUP_STEPS.map((step) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-primary/40 font-mono text-[10px] font-semibold text-primary">
                        {step.n}
                      </span>
                      <div className="pt-0.5">
                        <p className="font-mono text-xs font-semibold text-foreground">{step.title}</p>
                        <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Service Account JSON Key
                  </Label>
                  <Textarea
                    value={saJson}
                    onChange={(e) => setSaJson(e.target.value)}
                    placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\n...",\n  "client_email": "name@project.iam.gserviceaccount.com",\n  ...\n}'}
                    className="min-h-40 font-mono text-[11px]"
                    disabled={saving}
                  />
                  {setupError && (
                    <p className="flex items-center gap-1.5 font-mono text-xs text-destructive">
                      <Warning size={12} />{setupError}
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveKey}
                    disabled={saving || !saJson.trim()}
                    className="gap-1.5 font-mono text-xs"
                  >
                    {saving ? <><CircleNotch size={13} className="animate-spin" />Saving…</> : <>Save &amp; Activate<ArrowRight size={13} /></>}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* ── Submit section ── */}
          <section className="space-y-5 border-t border-border pt-8">
            <span className="font-mono text-xs font-semibold uppercase tracking-widest">
              2 · Request Indexing
            </span>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  URLs to Submit
                  <span className="ml-2 normal-case text-muted-foreground/70">({urlList.length} / 200 daily limit)</span>
                </Label>
                <Textarea
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  placeholder={"https://www.example.com/new-article\nhttps://www.example.com/updated-page"}
                  className="min-h-36 font-mono text-xs"
                  disabled={submitting}
                />
                <p className="font-mono text-[10px] text-muted-foreground">One URL per line. Must be full URLs including https://</p>
              </div>

              {/* Notification type */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Type:</span>
                {(["URL_UPDATED", "URL_DELETED"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNotifType(t)}
                    className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 border transition-colors ${
                      notifType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {t === "URL_UPDATED" ? "New / Updated" : "Deleted"}
                  </button>
                ))}
              </div>

              {submitError && (
                <p className="flex items-center gap-1.5 font-mono text-xs text-destructive">
                  <Warning size={12} />{submitError}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={submitting || !isConfigured || urlList.length === 0}
                  className="gap-1.5 font-mono text-xs"
                >
                  {submitting
                    ? <><CircleNotch size={13} className="animate-spin" />Submitting {urlList.length} URL{urlList.length !== 1 ? "s" : ""}…</>
                    : <>Request Google Indexing<ArrowRight size={13} /></>}
                </Button>
                {!isConfigured && (
                  <span className="font-mono text-[10px] text-muted-foreground">Configure service account above first</span>
                )}
              </div>
            </form>

            {/* Results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Results</span>
                      {succeeded > 0 && (
                        <span className="font-mono text-[11px] text-primary">{succeeded} accepted</span>
                      )}
                      {failed > 0 && (
                        <span className="font-mono text-[11px] text-destructive">{failed} failed</span>
                      )}
                    </div>
                    <SaveToHistoryButton<IndexingSnapshot>
                      tool="google-indexing"
                      buildPayload={() => ({
                        id: `google-indexing-${Date.now()}`,
                        label: `${urlList.length} URL${urlList.length !== 1 ? "s" : ""} — ${succeeded} accepted`,
                        payload: { urlsText, results },
                      })}
                      onSaved={() => setHistoryRefresh((n) => n + 1)}
                    />
                  </div>

                  <div className="divide-y divide-border border border-border">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        {r.ok
                          ? <CheckCircle size={13} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                          : <XCircle size={13} weight="fill" className="mt-0.5 shrink-0 text-destructive" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-foreground break-all">{r.url}</p>
                          {r.ok
                            ? <p className="font-mono text-[10px] text-primary">Accepted{r.notifyTime ? ` · ${new Date(r.notifyTime).toLocaleString()}` : ""}</p>
                            : <p className="font-mono text-[10px] text-destructive">{r.error ?? `HTTP ${r.status}`}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {failed > 0 && (
                    <div className="flex items-start gap-2 border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <Info size={12} className="mt-0.5 shrink-0 text-yellow-600" />
                      <p className="font-mono text-[10px] leading-relaxed text-yellow-700 dark:text-yellow-300">
                        <strong>403 Forbidden</strong> means the service account email hasn&apos;t been added as an Owner in Google Search Console for this property.{" "}
                        <strong>404</strong> means the URL isn&apos;t registered in Search Console.{" "}
                        <strong>429</strong> means you&apos;ve hit the 200/day limit.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </main>
    </div>
  );
}
