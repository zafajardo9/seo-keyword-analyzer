import { PageAudit, ScrapedContent, Recommendation } from "@/lib/types";

export interface CacheEntry {
  url: string;
  scrapedContent: ScrapedContent;
  pageAudit: PageAudit | null;
  keywords: string[];
  recommendations: Recommendation[];
  model: string;
  timestamp: number;
}

export async function getCachedAnalysis(url: string): Promise<CacheEntry | null> {
  try {
    const res = await fetch(
      `/api/cache?url=${encodeURIComponent(url)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = data?.entry as Partial<CacheEntry> | null;
    if (!parsed) return null;
    return {
      url: parsed.url ?? url,
      scrapedContent: parsed.scrapedContent as ScrapedContent,
      pageAudit: parsed.pageAudit ?? null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      model: parsed.model ?? "",
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : 0,
    };
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(entry: CacheEntry): Promise<void> {
  try {
    await fetch("/api/cache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry }),
    });
  } catch {
    // ignore
  }
}

export async function clearCachedAnalysis(url: string): Promise<void> {
  try {
    await fetch(`/api/cache?url=${encodeURIComponent(url)}`, {
      method: "DELETE",
    });
  } catch {
    // ignore
  }
}

/** Returns how many seconds ago the entry was cached. */
export function cacheAge(entry: CacheEntry): number {
  return Math.floor((Date.now() - entry.timestamp) / 1000);
}

/** Human-readable age string, e.g. "2 min ago" */
export function formatCacheAge(entry: CacheEntry): string {
  const secs = cacheAge(entry);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
