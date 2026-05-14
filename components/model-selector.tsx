"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GeminiModel } from "@/lib/types";
import { CircleNotch, Robot } from "@phosphor-icons/react";
import { getStoredGeminiKey } from "@/components/api-key-manager";

let cachedModel = "";
let modelHydrationPromise: Promise<void> | null = null;

async function loadModelFromServer(): Promise<string> {
  const res = await fetch("/api/preferences", { cache: "no-store" });
  if (!res.ok) return "";
  const data = await res.json();
  return (data?.model as string) ?? "";
}

export function hydrateModel(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (modelHydrationPromise) return modelHydrationPromise;
  modelHydrationPromise = loadModelFromServer()
    .then((m) => {
      cachedModel = m;
    })
    .catch(() => {});
  return modelHydrationPromise;
}

async function saveModelToServer(model: string): Promise<void> {
  await fetch("/api/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
}

interface ModelSelectorProps {
  onModelChange?: (model: string) => void;
}

export function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models, setModels] = React.useState<GeminiModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateModel();
      const saved = cachedModel;
      if (cancelled) return;
      if (saved) setSelected(saved);

      try {
        const r = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: getStoredGeminiKey() }),
        });
        const data = await r.json();
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setModels(data.models ?? []);
          if (!saved && data.models?.length > 0) {
            const defaultModel = data.models[0].id;
            setSelected(defaultModel);
            cachedModel = defaultModel;
            await saveModelToServer(defaultModel);
            onModelChange?.(defaultModel);
          } else if (saved) {
            onModelChange?.(saved);
          }
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onModelChange]);

  function handleChange(value: string) {
    setSelected(value);
    cachedModel = value;
    void saveModelToServer(value);
    onModelChange?.(value);
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive border border-destructive/30 px-3 py-2">
        <span>Model fetch failed: {error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Robot size={14} />
        <span>AI Model</span>
      </div>
      <div className="flex items-center gap-2">
        {loading && (
          <CircleNotch size={14} className="animate-spin text-muted-foreground" />
        )}
        <Select value={selected} onValueChange={handleChange} disabled={loading}>
          <SelectTrigger className="w-64 font-mono text-xs">
            <SelectValue placeholder={loading ? "Loading models…" : "Select a model"} />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function getStoredModel(): string {
  return cachedModel;
}
