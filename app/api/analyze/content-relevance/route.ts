import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
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
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeAudit(
  raw: RawContentRelevanceAudit | null,
  targetKeyword: string,
): ContentRelevanceAudit | null {
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

async function detectKeyword(
  content: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const prompt = `Analyze this content and identify the single best target keyword that this page should rank for. Choose a keyword that:
- Has clear search intent (informational, commercial, etc.)
- Is specific enough to be actionable (not overly broad like "marketing")
- Matches the primary topic of the content

Content:
${content.slice(0, 5000)}

Return ONLY a single keyword phrase. No explanation, no JSON, just the keyword.`;

  const text = await generateGeminiText(model, prompt, apiKey, {
    temperature: 0.3,
    maxOutputTokens: 100,
  });

  return text.replace(/[\n"']/g, "").trim() || "content";
}

export async function POST(request: Request) {
  try {
    const { keyword, draft, url, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!model) {
      return Response.json({ error: "model is required" }, { status: 400 });
    }

    const trimmedDraft = String(draft ?? "").trim();
    const trimmedUrl = String(url ?? "").trim();

    if (!trimmedDraft && !trimmedUrl) {
      return Response.json(
        { error: "Provide either draft content or a public URL to analyze." },
        { status: 400 },
      );
    }

    let contentForAudit = "";
    let sourceType: "draft" | "url" = "draft";

    if (trimmedUrl) {
      const scraped = await scrapePage(trimmedUrl);
      const h1Summary =
        scraped.headings.h1.length > 0
          ? scraped.headings.h1.join(" | ")
          : "No H1 headings found";
      const bodySummary = scraped.bodyText.trim();

      if (bodySummary.length < 120) {
        return Response.json(
          {
            error:
              "The page did not contain enough body content to judge relevance.",
          },
          { status: 400 },
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
          {
            error:
              "Draft content is too short. Please paste at least a paragraph or a short outline.",
          },
          { status: 400 },
        );
      }

      contentForAudit = trimmedDraft.slice(0, 9000);
    }

    // Auto-detect keyword if not provided by the user
    const rawKeyword = String(keyword ?? "").trim();
    const detectedKeyword =
      rawKeyword.length > 0
        ? rawKeyword
        : await detectKeyword(contentForAudit, model, key);
    const finalKeyword = rawKeyword || detectedKeyword;

    const prompt = `You are an expert SEO editor and search intent evaluator. Be extremely concise — no unnecessary elaboration.

Target keyword: ${finalKeyword}

Content to evaluate:
${contentForAudit}

Return ONLY valid JSON using this exact structure:
{
  "targetKeyword": "${finalKeyword}",
  "detectedIntent": "informational | commercial investigation | transactional | navigational | mixed",
  "intentMatchScore": 0,
  "relevanceScore": 0,
  "verdict": "1-2 sentence verdict on how well the draft matches the keyword and likely search intent",
  "missingSubtopics": ["up to 5 short phrases only"],
  "offTopicSections": ["up to 4 short phrases only"],
  "headingSuggestions": ["up to 5 short heading ideas"],
  "rewriteSuggestions": ["up to 5 suggestions, 1 sentence each"],
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
      maxOutputTokens: 2048,
    });

    const parsed = parseJsonSafely<RawContentRelevanceAudit>(rawText);
    const audit = normalizeAudit(parsed, finalKeyword);

    if (!audit) {
      return Response.json(
        { error: "Failed to parse relevance audit response" },
        { status: 500 },
      );
    }

    audit.sourceType = sourceType;
    audit.sourceUrl = sourceType === "url" ? trimmedUrl : undefined;
    audit.wasAutoDetected = rawKeyword.length === 0;

    return Response.json({ audit, detectedKeyword: finalKeyword });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const classified = classifyApiError(message);
    return Response.json(
      { error: classified.error, detail: classified.detail },
      { status: classified.status },
    );
  }
}
