"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleNotch,
  Clock,
  FloppyDisk,
  Trash,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export type ToolName =
  | "relevance"
  | "battle"
  | "market-research"
  | "indexnow"
  | "company-research"
  | "geo-aeo"
  | "google-indexing";

export interface HistoryItem<T = unknown> {
  id: string;
  tool: ToolName;
  label: string;
  payload: T;
  createdAt: string;
  updatedAt: string;
}

interface HistoryPanelProps<T = unknown> {
  tool: ToolName;
  /** Called when user picks an item to restore */
  onRestore: (payload: T, item: HistoryItem<T>) => void;
  /** Optional refresh trigger; bump this when caller saves to refresh list */
  refreshToken?: number;
  /** Optional button label */
  buttonLabel?: string;
}

export function HistoryPanel<T = unknown>({
  tool,
  onRestore,
  refreshToken = 0,
  buttonLabel = "History",
}: HistoryPanelProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<HistoryItem<T>[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [deleteingId, setDeletingId] = React.useState<string | null>(null);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?tool=${tool}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setItems((data?.items ?? []) as HistoryItem<T>[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tool]);

  React.useEffect(() => {
    if (open) void loadItems();
  }, [open, loadItems, refreshToken]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setItems((cur) => cur.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        aria-label="View history"
      >
        <Clock size={13} />
        <span>{buttonLabel}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                    Saved History
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close history"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <CircleNotch size={16} className="animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                    <Clock size={18} className="text-muted-foreground" />
                    <p className="font-mono text-xs text-muted-foreground">
                      No saved sessions yet.
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Run the tool, then click &ldquo;Save to History&rdquo;.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="group flex items-start gap-2 border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onRestore(item.payload, item);
                            setOpen(false);
                          }}
                          className="flex-1 text-left"
                        >
                          <div className="font-mono text-xs font-semibold text-foreground line-clamp-2">
                            {item.label}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {new Date(item.updatedAt).toLocaleString()}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteingId === item.id}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                          title="Delete from history"
                        >
                          {deleteingId === item.id ? (
                            <CircleNotch size={13} className="animate-spin" />
                          ) : (
                            <Trash size={13} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface SaveToHistoryButtonProps<T = unknown> {
  tool: ToolName;
  /** Build the snapshot payload at click time. Return an `id` to upsert instead of insert. */
  buildPayload: () => { id?: string; label: string; payload: T } | null;
  /** Called after successful save (e.g., to bump refreshToken) */
  onSaved?: (id: string) => void;
  /** Disable when no data to save */
  disabled?: boolean;
  className?: string;
}

export function SaveToHistoryButton<T = unknown>({
  tool,
  buildPayload,
  onSaved,
  disabled,
  className,
}: SaveToHistoryButtonProps<T>) {
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function handleSave() {
    const built = buildPayload();
    if (!built) return;
    setSaving(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          label: built.label,
          payload: built.payload,
          ...(built.id ? { id: built.id } : {}),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setSaved(true);
      onSaved?.(data?.id ?? "");
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={disabled || saving}
      className={
        className ??
        "gap-1.5 font-mono text-[11px] uppercase tracking-widest"
      }
    >
      {saving ? (
        <>
          <CircleNotch size={12} className="animate-spin" />
          Saving…
        </>
      ) : saved ? (
        <>
          <FloppyDisk size={12} weight="fill" />
          Saved
        </>
      ) : (
        <>
          <FloppyDisk size={12} />
          Save to History
        </>
      )}
    </Button>
  );
}
