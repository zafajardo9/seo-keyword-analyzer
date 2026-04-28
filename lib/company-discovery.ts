import Firecrawl, {
  type Document,
  type SearchResultWeb,
} from "@mendable/firecrawl-js";
import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
} from "@/lib/gemini";
import {
  CompanyAgeMix,
  CompanyAgeSignal,
  CompanyDiscoveryResult,
} from "@/lib/types";

const FIRECRAWL_QUERY_LIMIT = 10;

const EXCLUDED_HOSTS = [
  "wikipedia.org",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "crunchbase.com",
  "g2.com",
  "capterra.com",
  "producthunt.com",
  "apps.apple.com",
  "play.google.com",
  "google.com",
  "bing.com",
  "brave.com",
  "reddit.com",
  "medium.com",
  "forbes.com",
  "techcrunch.com",
  "builtin.com",
];

interface DiscoveryCandidate {
  website: string;
  domain: string;
  title: string;
  snippet: string;
  evidenceUrl: string;
  query: string;
}

interface DiscoveryRequest {
  market: string;
  location: string;
  industry?: string;
  ageMix?: CompanyAgeMix;
  contactPreference?: string;
  limit?: number;
  model: string;
}

interface RawRankedCompany {
  companyName?: string;
  website?: string;
  domain?: string;
  ageSignal?: CompanyAgeSignal;
  discoveryReason?: string;
  relevanceScore?: number;
}

function getFirecrawlApiKey(): string {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Firecrawl API key is not configured");
  }
  return apiKey;
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 25;
  return Math.max(1, Math.min(50, Math.round(limit ?? 25)));
}

function normalizeDomain(url: string): { website: string; domain: string } | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    parsed.search = "";
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return {
      website: `${parsed.protocol}//${parsed.hostname}`,
      domain,
    };
  } catch {
    return null;
  }
}

function isExcludedDomain(domain: string): boolean {
  return EXCLUDED_HOSTS.some(
    (excluded) => domain === excluded || domain.endsWith(`.${excluded}`),
  );
}

function buildQueries({
  market,
  location,
  industry,
  ageMix = "both",
}: Omit<DiscoveryRequest, "model" | "limit" | "contactPreference">): string[] {
  const base = industry?.trim()
    ? `${market.trim()} ${industry.trim()}`
    : market.trim();
  const place = location.trim();
  const queries = [
    `"${base}" companies ${place}`,
    `top ${base} companies ${place}`,
    `"${base}" "contact" company ${place}`,
  ];

  if (ageMix === "both" || ageMix === "emerging") {
    queries.push(`emerging ${base} startups ${place}`);
    queries.push(`new ${base} companies ${place}`);
  }

  if (ageMix === "both" || ageMix === "established") {
    queries.push(`established ${base} competitors ${place}`);
    queries.push(`leading ${base} companies ${place}`);
  }

  return Array.from(new Set(queries));
}

function isFirecrawlDocument(
  result: SearchResultWeb | Document,
): result is Document {
  return "metadata" in result || "markdown" in result || "html" in result;
}

function searchResultToCandidate(
  query: string,
  result: SearchResultWeb | Document,
): DiscoveryCandidate | null {
  const url = isFirecrawlDocument(result)
    ? result.metadata?.sourceURL ?? result.metadata?.url ?? result.metadata?.ogUrl
    : result.url;
  if (!url) return null;
  const normalized = normalizeDomain(url);
  if (!normalized || isExcludedDomain(normalized.domain)) return null;

  const title = isFirecrawlDocument(result)
    ? result.metadata?.title ??
      result.metadata?.ogTitle ??
      normalized.domain
    : result.title ?? normalized.domain;
  const description = isFirecrawlDocument(result)
    ? result.metadata?.description ??
      result.metadata?.ogDescription ??
      result.summary ??
      result.markdown ??
      ""
    : result.description ?? "";

  return {
    website: normalized.website,
    domain: normalized.domain,
    title,
    snippet: description.slice(0, 600),
    evidenceUrl: url,
    query,
  };
}

async function firecrawlSearch(
  query: string,
  app: Firecrawl,
): Promise<DiscoveryCandidate[]> {
  try {
    const results = await app.search(query, {
      sources: ["web"],
      limit: FIRECRAWL_QUERY_LIMIT,
    });

    return (results.web ?? [])
      .map((result) => searchResultToCandidate(query, result))
      .filter((candidate): candidate is DiscoveryCandidate =>
        Boolean(candidate),
      );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Firecrawl search error: ${message}`);
  }
}

function dedupeCandidates(candidates: DiscoveryCandidate[]): DiscoveryCandidate[] {
  const seen = new Map<string, DiscoveryCandidate>();
  candidates.forEach((candidate) => {
    if (!seen.has(candidate.domain)) {
      seen.set(candidate.domain, candidate);
      return;
    }

    const existing = seen.get(candidate.domain);
    if (existing && candidate.snippet.length > existing.snippet.length) {
      seen.set(candidate.domain, candidate);
    }
  });
  return Array.from(seen.values());
}

function coerceAgeSignal(value: unknown): CompanyAgeSignal {
  return value === "emerging" || value === "established" || value === "unknown"
    ? value
    : "unknown";
}

async function rankCandidates(
  candidates: DiscoveryCandidate[],
  request: DiscoveryRequest,
): Promise<CompanyDiscoveryResult[]> {
  const key = getGeminiApiKey();
  const evidence = candidates
    .slice(0, 60)
    .map(
      (candidate, index) => `${index + 1}. Domain: ${candidate.domain}
Website: ${candidate.website}
Title: ${candidate.title}
Snippet: ${candidate.snippet}
Search query: ${candidate.query}`,
    )
    .join("\n\n");

  const prompt = `You are ranking company discovery candidates for SEO partnership research. Use only the search evidence below. Do not invent companies or websites.

Market: ${request.market}
Location: ${request.location}
Industry/Niche: ${request.industry || "not specified"}
Company age target: ${request.ageMix || "both"}
Contact preference: ${request.contactPreference || "Public business contacts"}

Candidates:
${evidence}

Return ONLY valid JSON array. Include up to ${normalizeLimit(request.limit)} companies using this exact shape:
[
  {
    "companyName": "company name inferred from title/domain",
    "website": "candidate website exactly as provided",
    "domain": "candidate domain exactly as provided",
    "ageSignal": "emerging | established | unknown",
    "discoveryReason": "short reason this company fits the market and location",
    "relevanceScore": 0
  }
]

Guidance:
- Score 0 to 100 for relevance to the market/location and usefulness for outreach
- Prefer actual company websites over lists, articles, marketplaces, or social profiles
- Include both new/rising and established companies when age target is both
- Mark ageSignal unknown when search evidence does not clearly indicate company age`;

  const rawText = await generateGeminiText(request.model, prompt, key, {
    temperature: 0.25,
    maxOutputTokens: 4096,
  });

  const parsed = parseJsonSafely<RawRankedCompany[]>(rawText);
  const ranked = Array.isArray(parsed) ? parsed : [];
  const candidateByDomain = new Map(
    candidates.map((candidate) => [candidate.domain, candidate]),
  );

  return ranked
    .map((item) => {
      const domain = String(item.domain ?? "").toLowerCase();
      const candidate = candidateByDomain.get(domain);
      if (!candidate) return null;
      return {
        companyName: String(item.companyName ?? candidate.title),
        website: candidate.website,
        domain: candidate.domain,
        market: request.market.trim(),
        location: request.location.trim(),
        ageSignal: coerceAgeSignal(item.ageSignal),
        discoveryReason: String(
          item.discoveryReason ?? "Matched the market search evidence.",
        ),
        evidenceTitle: candidate.title,
        evidenceUrl: candidate.evidenceUrl,
        evidenceSnippet: candidate.snippet,
        relevanceScore: clampScore(item.relevanceScore ?? 50),
      };
    })
    .filter(
      (item): item is CompanyDiscoveryResult =>
        item !== null && !isExcludedDomain(item.domain),
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, normalizeLimit(request.limit));
}

function fallbackRank(
  candidates: DiscoveryCandidate[],
  request: DiscoveryRequest,
): CompanyDiscoveryResult[] {
  return candidates.slice(0, normalizeLimit(request.limit)).map((candidate) => ({
    companyName: candidate.title.split(/[|-]/)[0]?.trim() || candidate.domain,
    website: candidate.website,
    domain: candidate.domain,
    market: request.market.trim(),
    location: request.location.trim(),
    ageSignal: "unknown",
    discoveryReason: "Matched Firecrawl search evidence for the market.",
    evidenceTitle: candidate.title,
    evidenceUrl: candidate.evidenceUrl,
    evidenceSnippet: candidate.snippet,
    relevanceScore: 50,
  }));
}

export async function discoverCompanies(
  request: DiscoveryRequest,
): Promise<CompanyDiscoveryResult[]> {
  if (!request.market?.trim()) throw new Error("market is required");
  if (!request.location?.trim()) throw new Error("location is required");
  if (!request.model?.trim()) throw new Error("model is required");

  const apiKey = getFirecrawlApiKey();
  const app = new Firecrawl({ apiKey });
  const queries = buildQueries(request);
  const searchResults = await Promise.all(
    queries.map(async (query) => ({
      query,
      results: await firecrawlSearch(query, app),
    })),
  );

  const candidates = dedupeCandidates(
    searchResults.flatMap(({ results }) => results),
  );

  if (candidates.length === 0) return [];

  const ranked = await rankCandidates(candidates, request);
  return ranked.length > 0 ? ranked : fallbackRank(candidates, request);
}
