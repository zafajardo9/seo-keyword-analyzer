import {
  generateGeminiTextWithSearch,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
import { ContentOutlineResult, SerpResult, BriefOutlineItem } from "@/lib/types";

interface RawOutlineResult {
  targetKeyword: string;
  topResults: Array<{
    url: string;
    title: string;
    headings: string[];
  }>;
  commonHeadingPatterns: string[];
  contentGaps: string[];
  outline: Array<{
    heading: string;
    hLevel: string;
    keyPoints: string[];
    targetKeywords?: string[];
    estimatedWordCount?: number;
  }>;
  totalEstimatedWords: number;
  seoTips: string[];
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeSerpResults(value: unknown): SerpResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      url: String(item.url ?? ""),
      title: String(item.title ?? ""),
      headings: normalizeList(item.headings),
    }))
    .filter((r) => r.url.length > 0);
}

function normalizeOutline(value: unknown): BriefOutlineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      heading: String(item.heading ?? ""),
      hLevel: (item.hLevel === "h2" || item.hLevel === "h3" || item.hLevel === "h4"
        ? item.hLevel
        : "h2") as BriefOutlineItem["hLevel"],
      keyPoints: normalizeList(item.keyPoints),
      targetKeywords: Array.isArray(item.targetKeywords) ? item.targetKeywords.map(String) : undefined,
      estimatedWordCount: Number.isFinite(Number(item.estimatedWordCount)) ? Number(item.estimatedWordCount) : undefined,
    }))
    .filter((s) => s.heading.length > 0);
}

function normalizeResult(raw: RawOutlineResult | null, targetKeyword: string): ContentOutlineResult | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    targetKeyword,
    serpAnalysis: {
      topResults: normalizeSerpResults(raw.topResults),
      commonHeadingPatterns: normalizeList(raw.commonHeadingPatterns),
      contentGaps: normalizeList(raw.contentGaps),
    },
    recommendedOutline: normalizeOutline(raw.outline),
    totalEstimatedWords: Number.isFinite(Number(raw.totalEstimatedWords)) ? Number(raw.totalEstimatedWords) : 0,
    seoTips: normalizeList(raw.seoTips),
  };
}

export async function POST(request: Request) {
  try {
    const { keyword, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!keyword || !model) {
      return Response.json({ error: "keyword and model are required" }, { status: 400 });
    }

    const prompt = `You are an expert SEO content strategist. Research the SERP for the target keyword and create a data-driven content outline.

Target keyword: ${String(keyword).trim()}

First, use Google Search to find the top-ranking pages for this keyword. Analyze their heading structures (H1, H2, H3) to understand what the competition covers.

Then create a comprehensive, SERP-informed outline that covers what competitors cover but also identifies gaps to exploit.

Return ONLY valid JSON using this exact structure:
{
  "targetKeyword": "the target keyword",
  "topResults": [
    {
      "url": "URL of a top-ranking page",
      "title": "Page title",
      "headings": ["H2: Main Section", "H3: Sub-section", "H2: Another Section"]
    }
  ],
  "commonHeadingPatterns": ["Pattern observed across top results, e.g. 'What is X'"],
  "contentGaps": ["Topic not well covered by competitors that we can exploit"],
  "outline": [
    {
      "heading": "H2 heading title",
      "hLevel": "h2",
      "keyPoints": ["key point to cover"],
      "targetKeywords": ["related keyword to use"],
      "estimatedWordCount": 300
    }
  ],
  "totalEstimatedWords": 2500,
  "seoTips": ["tip 1", "tip 2"]
}

Requirements:
- Analyze at least 3-5 top SERP results
- Outline should have 5-8 sections mixing H2 and H3
- totalEstimatedWords should be realistic (1500-3500)
- Base patterns and gaps on actual SERP analysis, not assumptions
- Include an introduction section and a conclusion section
- H3s should be nested under their parent H2 in the array order`;

    const { text } = await generateGeminiTextWithSearch(model, prompt, key, {
      temperature: 0.4,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonSafely<RawOutlineResult>(text);
    const result = normalizeResult(parsed, String(keyword).trim());

    if (!result || result.recommendedOutline.length === 0) {
      return Response.json({ error: "Failed to generate outline" }, { status: 500 });
    }

    return Response.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const classified = classifyApiError(message);
    return Response.json(
      { error: classified.error, detail: classified.detail },
      { status: classified.status },
    );
  }
}
