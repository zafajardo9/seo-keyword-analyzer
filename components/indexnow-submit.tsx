"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  Copy,
  Key,
  LinkSimple,
  Warning,
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

const STORAGE_KEY = "indexnow:lastSubmit";

function generateKey(): string {
  // 32 lowercase hex chars
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function inferHost(urls: string[]): string | null {
  for (const u of urls) {
    try {
      return new URL(u).host;
    } catch {
      continue;
    }
  }
  return null;
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

  // Restore previous submission state
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        host?: string;
        apiKey?: string;
        keyLocation?: string;
        engine?: string;
      };
      if (saved.host) setHost(saved.host);
      if (saved.apiKey) setApiKey(saved.apiKey);
      if (saved.keyLocation) setKeyLocation(saved.keyLocation);
      if (saved.engine) setEngine(saved.engine);
    } catch {
      // ignore
    }
  }, []);

  const urlList = React.useMemo(
    () =>
      urlsText
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean),
    [urlsText],
  );

  const expectedKeyLocation = React.useMemo(() => {
    if (!host || !apiKey) return "";
    return `https://${host}/${apiKey}.txt`;
  }, [host, apiKey]);

  function handleGenerateKey() {
    const k = generateKey();
    setApiKey(k);
  }

  function handleInferHost() {
    const h = inferHost(urlList);
    if (h) setHost(h);
  }

  async function handleCopyKey() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!host.trim()) {
      setError("Host is required (e.g. www.example.com).");
      return;
    }
    if (!apiKey.trim()) {
      setError("API key is required.");
      return;
    }
    if (urlList.length === 0) {
      setError("Add at least one URL (one per line).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: host.trim(),
          key: apiKey.trim(),
          keyLocation: keyLocation.trim() || undefined,
          urlList,
          engine,
        }),
      });
      const data = (await res.json()) as SubmitResult;
      setResult(data);

      // Persist non-secret-ish identifiers for convenience
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            host: host.trim(),
            apiKey: apiKey.trim(),
            keyLocation: keyLocation.trim(),
            engine,
          }),
        );
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = (() => {
    if (!result) return null;
    switch (result.status) {
      case 200:
        return "OK — URLs submitted.";
      case 202:
        return "Accepted — key validation pending.";
      case 400:
        return "Bad request — check your payload.";
      case 403:
        return "Forbidden — key not found at keyLocation.";
      case 422:
        return "Unprocessable — URLs do not match host or key mismatch.";
      case 429:
        return "Too many requests — slow down.";
      default:
        return result.statusText || "Submitted.";
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Host */}
        <div className="flex flex-col gap-2">
          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Host
          </Label>
          <div className="flex gap-2">
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="www.example.com"
              className="flex-1 font-mono text-xs"
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInferHost}
              disabled={urlList.length === 0 || loading}
              className="font-mono text-[11px] uppercase tracking-widest"
            >
              Infer from URLs
            </Button>
          </div>
        </div>

        {/* API Key */}
        <div className="flex flex-col gap-2">
          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            API Key
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="2371de24ab364e5598751f6b792b07d6"
                className="pl-8 font-mono text-xs"
                disabled={loading}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateKey}
              disabled={loading}
              className="font-mono text-[11px] uppercase tracking-widest"
            >
              Generate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyKey}
              disabled={!apiKey || loading}
              className="gap-1 font-mono text-[11px] uppercase tracking-widest"
            >
              {copied ? (
                <>
                  <CheckCircle size={12} weight="fill" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            8–128 alphanumeric characters. You must host this key as a text file
            on your domain so search engines can verify ownership.
          </p>
        </div>

        {/* Key Location */}
        <div className="flex flex-col gap-2">
          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Key Location <span className="normal-case text-muted-foreground/70">(optional)</span>
          </Label>
          <div className="relative">
            <LinkSimple
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={keyLocation}
              onChange={(e) => setKeyLocation(e.target.value)}
              placeholder={
                expectedKeyLocation || "https://www.example.com/myKey.txt"
              }
              className="pl-8 font-mono text-xs"
              disabled={loading}
            />
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Leave empty if your key file is at the host root:{" "}
            <span className="text-foreground">
              {expectedKeyLocation || "https://<host>/<key>.txt"}
            </span>
            . The file&apos;s contents must equal the API key above.
          </p>
        </div>

        {/* Engine */}
        <div className="flex flex-col gap-2">
          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Search Engine Endpoint
          </Label>
          <Select value={engine} onValueChange={setEngine} disabled={loading}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGINES.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="font-mono text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Submitting to one participating engine shares the URLs with all
            IndexNow partners. Use the default unless you need a specific one.
          </p>
        </div>

        {/* URLs */}
        <div className="flex flex-col gap-2">
          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            URLs to Submit
            <span className="ml-2 normal-case text-muted-foreground/70">
              ({urlList.length} / 10,000)
            </span>
          </Label>
          <Textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={`https://www.example.com/url1\nhttps://www.example.com/folder/url2\nhttps://www.example.com/url3`}
            className="min-h-32 font-mono text-xs"
            disabled={loading}
          />
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            One URL per line. All URLs must belong to the host above.
          </p>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 font-mono text-xs text-destructive"
          >
            <Warning size={12} />
            {error}
          </motion.p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="gap-1.5 font-mono text-xs"
          >
            {loading ? (
              <>
                <CircleNotch size={13} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit to IndexNow
                <ArrowRight size={13} />
              </>
            )}
          </Button>
          {result && statusLabel && (
            <span
              className={cn(
                "font-mono text-[11px] uppercase tracking-widest",
                result.ok ? "text-primary" : "text-destructive",
              )}
            >
              [{result.status}] {statusLabel}
            </span>
          )}
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 border border-border bg-muted/30 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Endpoint
              </span>
              <span className="font-mono text-[11px] text-foreground">
                {result.endpoint}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Submitted
              </span>
              <span className="font-mono text-[11px] text-foreground">
                {result.submitted} URL{result.submitted === 1 ? "" : "s"}
              </span>
            </div>
            {result.response && (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Response
                </span>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all border border-border bg-background p-2 font-mono text-[11px] text-foreground">
                  {result.response}
                </pre>
              </div>
            )}
            {result.error && (
              <p className="font-mono text-[11px] text-destructive">
                {result.error}
              </p>
            )}
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
