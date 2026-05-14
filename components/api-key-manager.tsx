"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Key, Trash, Eye, EyeSlash, Check, Robot, Fire } from "@phosphor-icons/react";

// Module-level cache so synchronous getters can return the most recently
// loaded values. Hydrated on first mount of <ApiKeyManager /> (rendered in
// page headers) and refreshed on save.
let cachedGeminiKey = "";
let cachedFirecrawlKey = "";
let hydrationPromise: Promise<void> | null = null;

async function fetchKeys(): Promise<{ geminiKey: string; firecrawlKey: string }> {
  const res = await fetch("/api/keys", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load keys (${res.status})`);
  const data = await res.json();
  return {
    geminiKey: data.geminiKey ?? "",
    firecrawlKey: data.firecrawlKey ?? "",
  };
}

export function hydrateApiKeys(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = fetchKeys()
    .then((d) => {
      cachedGeminiKey = d.geminiKey;
      cachedFirecrawlKey = d.firecrawlKey;
    })
    .catch(() => {
      // Leave cache empty on failure
    });
  return hydrationPromise;
}

export function getStoredGeminiKey(): string {
  return cachedGeminiKey;
}

export function getStoredFirecrawlKey(): string {
  return cachedFirecrawlKey;
}

export async function clearStoredGeminiKey(): Promise<void> {
  cachedGeminiKey = "";
  await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geminiKey: "",
      firecrawlKey: cachedFirecrawlKey,
    }),
  });
}

export async function clearStoredFirecrawlKey(): Promise<void> {
  cachedFirecrawlKey = "";
  await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geminiKey: cachedGeminiKey,
      firecrawlKey: "",
    }),
  });
}

export function hasAnyKey(): boolean {
  return Boolean(cachedGeminiKey);
}

export function hasFirecrawlKey(): boolean {
  return Boolean(cachedFirecrawlKey);
}

interface ApiKeyManagerProps {
  onChange?: () => void;
}

export function ApiKeyManager({ onChange }: ApiKeyManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [geminiKey, setGeminiKey] = React.useState("");
  const [firecrawlKey, setFirecrawlKey] = React.useState("");
  const [showGemini, setShowGemini] = React.useState(false);
  const [showFirecrawl, setShowFirecrawl] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    hydrateApiKeys().then(() => {
      setGeminiKey(cachedGeminiKey);
      setFirecrawlKey(cachedFirecrawlKey);
    });
  }, []);

  const hasGemini = geminiKey.length > 0;
  const hasFirecrawl = firecrawlKey.length > 0;

  async function handleSave() {
    setSaving(true);
    const nextGemini = geminiKey.trim();
    const nextFirecrawl = firecrawlKey.trim();
    try {
      await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey: nextGemini,
          firecrawlKey: nextFirecrawl,
        }),
      });
      cachedGeminiKey = nextGemini;
      cachedFirecrawlKey = nextFirecrawl;
      setSaved(true);
      onChange?.();
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearGemini() {
    setGeminiKey("");
    await clearStoredGeminiKey();
    onChange?.();
  }

  async function handleClearFirecrawl() {
    setFirecrawlKey("");
    await clearStoredFirecrawlKey();
    onChange?.();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Manage API keys"
        >
          <Key size={13} className={hasGemini ? "text-primary" : ""} />
          <span>Keys</span>
          {hasGemini && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Key size={14} className="text-primary" />
            <span className="font-mono text-xs font-semibold">API Keys</span>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Optional. Provide your own keys to override the server defaults.
            Keys are stored in the shared database.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Robot size={12} className="text-muted-foreground" />
              <Label className="font-mono text-[10px] uppercase tracking-widest">
                Gemini Key
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type={showGemini ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Paste Gemini API key"
                className="font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowGemini((v) => !v)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {showGemini ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
              {hasGemini && (
                <button
                  type="button"
                  onClick={handleClearGemini}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Clear Gemini key"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Fire size={12} className="text-muted-foreground" />
              <Label className="font-mono text-[10px] uppercase tracking-widest">
                Firecrawl Key
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type={showFirecrawl ? "text" : "password"}
                value={firecrawlKey}
                onChange={(e) => setFirecrawlKey(e.target.value)}
                placeholder="Paste Firecrawl API key"
                className="font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowFirecrawl((v) => !v)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {showFirecrawl ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
              {hasFirecrawl && (
                <button
                  type="button"
                  onClick={handleClearFirecrawl}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Clear Firecrawl key"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="font-mono text-[10px] uppercase tracking-widest"
            size="sm"
          >
            {saved ? (
              <>
                <Check size={12} className="mr-1.5" />
                Saved
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save Keys"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
