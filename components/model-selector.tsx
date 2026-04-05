"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GeminiModel } from "@/lib/types";
import { CircleNotch, Robot } from "@phosphor-icons/react";

const STORAGE_KEY = "gemini_selected_model";

interface ModelSelectorProps {
  onModelChange?: (model: string) => void;
}

export function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models, setModels] = React.useState<GeminiModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string>("");

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSelected(saved);

    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setModels(data.models ?? []);
          if (!saved && data.models?.length > 0) {
            const defaultModel = data.models[0].id;
            setSelected(defaultModel);
            localStorage.setItem(STORAGE_KEY, defaultModel);
            onModelChange?.(defaultModel);
          } else if (saved) {
            onModelChange?.(saved);
          }
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [onModelChange]);

  function handleChange(value: string) {
    setSelected(value);
    localStorage.setItem(STORAGE_KEY, value);
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
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}
