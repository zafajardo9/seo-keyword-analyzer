import { PageAudit, ScrapedContent, Recommendation } from "@/lib/types";

const CACHE_KEY_PREFIX = "seo_analysis_";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface CacheEntry {
  url: string;
  scrapedContent: ScrapedContent;
  pageAudit: PageAudit | null;
  keywords: string[];
  recommendations: Recommendation[];
  model: string;
  timestamp: number;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    // remove trailing slash and hash for consistent cache keys
    return (u.origin + u.pathname).replace(/\/$/, "") + u.search;
  } catch {
    return url.trim().toLowerCase();
  }
}

function cacheKey(url: string): string {
  return CACHE_KEY_PREFIX + normalizeUrl(url);
}

export function getCachedAnalysis(url: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEntry>;
    const entry: CacheEntry = {
      url: parsed.url ?? url,
      scrapedContent: parsed.scrapedContent as ScrapedContent,
      pageAudit: parsed.pageAudit ?? null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      model: parsed.model ?? "",
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : 0,
    };
    if (Date.now() - entry.timestamp > TTL_MS) {
      localStorage.removeItem(cacheKey(url));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(entry: CacheEntry): void {
  try {
    localStorage.setItem(cacheKey(entry.url), JSON.stringify(entry));
  } catch {
    // localStorage might be full — silently ignore
  }
}

export function clearCachedAnalysis(url: string): void {
  try {
    localStorage.removeItem(cacheKey(url));
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
