import { clampScore, generateGeminiText, getGeminiApiKey, parseJsonSafely } from "@/lib/gemini";
import { ContentRelevanceAudit } from "@/lib/types";
import { scrapePage } from "@/lib/scrape-page";

interface RawContentRelevanceAudit {
  targetKeyword: string;
  detectedIntent: string;
  intentMatchScore: number;
  relevanceScore: number;
  verdict: string;
  missingSubtopics: string[];
  offTopicSections: string[];
  headingSuggestions: string[];
  rewriteSuggestions: string[];
  improvedTitle: string;
  improvedMetaDescription: string;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeAudit(raw: RawContentRelevanceAudit | null, targetKeyword: string): ContentRelevanceAudit | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    targetKeyword,
    detectedIntent: String(raw.detectedIntent ?? "Unknown intent"),
    intentMatchScore: clampScore(raw.intentMatchScore ?? 0),
    relevanceScore: clampScore(raw.relevanceScore ?? 0),
    verdict: String(raw.verdict ?? "No relevance summary available."),
    missingSubtopics: normalizeList(raw.missingSubtopics),
    offTopicSections: normalizeList(raw.offTopicSections),
    headingSuggestions: normalizeList(raw.headingSuggestions),
    rewriteSuggestions: normalizeList(raw.rewriteSuggestions),
    improvedTitle: String(raw.improvedTitle ?? ""),
    improvedMetaDescription: String(raw.improvedMetaDescription ?? ""),
  };
}

export async function POST(request: Request) {
  try {
    const key = getGeminiApiKey();
    const { keyword, draft, url, model } = await request.json();

    if (!keyword || !model) {
      return Response.json({ error: "keyword and model are required" }, { status: 400 });
    }

    const trimmedDraft = String(draft ?? "").trim();
    const trimmedUrl = String(url ?? "").trim();

    if (!trimmedDraft && !trimmedUrl) {
      return Response.json(
        { error: "Provide either draft content or a public URL to analyze." },
        { status: 400 }
      );
    }

    let contentForAudit = "";
    let sourceType: "draft" | "url" = "draft";

    if (trimmedUrl) {
      const scraped = await scrapePage(trimmedUrl);
      const h1Summary = scraped.headings.h1.length > 0
        ? scraped.headings.h1.join(" | ")
        : "No H1 headings found";
      const bodySummary = scraped.bodyText.trim();

      if (bodySummary.length < 120) {
        return Response.json(
          { error: "The page did not contain enough body content to judge relevance." },
          { status: 400 }
        );
      }

      sourceType = "url";
      contentForAudit = `Source URL: ${scraped.url}
H1 headings:
${h1Summary}

Body content:
${bodySummary.slice(0, 9000)}`;
    } else {
      if (trimmedDraft.length < 120) {
        return Response.json(
          { error: "Draft content is too short. Please paste at least a paragraph or a short outline." },
          { status: 400 }
        );
      }

      contentForAudit = trimmedDraft.slice(0, 9000);
    }

    const prompt = `You are an expert SEO editor and search intent evaluator.

Target keyword: ${String(keyword).trim()}

Content to evaluate:
${contentForAudit}

Return ONLY valid JSON using this exact structure:
{
  "targetKeyword": "repeat the target keyword",
  "detectedIntent": "informational | commercial investigation | transactional | navigational | mixed",
  "intentMatchScore": 0,
  "relevanceScore": 0,
  "verdict": "2-3 sentence verdict on how well the draft matches the keyword and likely search intent",
  "missingSubtopics": ["up to 6 missing supporting subtopics"],
  "offTopicSections": ["up to 5 sections, ideas, or patterns that feel weak or off-topic"],
  "headingSuggestions": ["up to 6 improved heading or section ideas"],
  "rewriteSuggestions": ["up to 6 concrete rewrite suggestions"],
  "improvedTitle": "SEO-friendly improved title",
  "improvedMetaDescription": "SEO-friendly meta description under 160 characters"
}

Scoring guidance:
- Score from 0 to 100
- Judge actual relevance, not just keyword mentions
- Penalize thin, vague, repetitive, or loosely related content
- Reward content that satisfies likely search intent with clear, useful coverage
- If the source is a URL scrape, base the judgment only on the provided H1 headings and body content
- Do not assume metadata, H2s, H3s, navigation, or other page elements beyond what is shown`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.45,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonSafely<RawContentRelevanceAudit>(rawText);
    const audit = normalizeAudit(parsed, String(keyword).trim());

    if (!audit) {
      return Response.json({ error: "Failed to parse relevance audit response" }, { status: 500 });
    }

    audit.sourceType = sourceType;
    audit.sourceUrl = sourceType === "url" ? trimmedUrl : undefined;

    return Response.json({ audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /valid URL|HTTP and HTTPS|Failed to fetch page|Invalid URL|enough body content/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
