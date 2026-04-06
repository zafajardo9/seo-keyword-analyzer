import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
} from "@/lib/gemini";
import { PageAudit, ScoreDimension, ScoreDimensionKey } from "@/lib/types";

const DIMENSION_LABELS: Record<ScoreDimensionKey, string> = {
  topicalRelevance: "Topical Relevance",
  searchIntentMatch: "Search Intent Match",
  topicalDepth: "Topical Depth",
  clarityReadability: "Clarity & Readability",
  metadataQuality: "Metadata Quality",
  trustSignals: "Trust Signals",
};

interface RawAuditDimension {
  score: number;
  explanation: string;
}

interface RawAuditResponse {
  pageType: string;
  industry: string;
  primaryAudience: string;
  primaryIntent: string;
  overallScore: number;
  verdict: string;
  scores: Record<ScoreDimensionKey, RawAuditDimension>;
  strengths: string[];
  weaknesses: string[];
  missingSubtopics: string[];
  priorityActions: string[];
}

const SCORE_ALIASES: Record<ScoreDimensionKey, string[]> = {
  topicalRelevance: [
    "topicalRelevance",
    "topical_relevance",
    "relevance",
    "topicRelevance",
  ],
  searchIntentMatch: [
    "searchIntentMatch",
    "search_intent_match",
    "intentMatch",
    "searchIntent",
  ],
  topicalDepth: ["topicalDepth", "topical_depth", "contentDepth", "depth"],
  clarityReadability: [
    "clarityReadability",
    "clarity_readability",
    "readability",
    "clarity",
  ],
  metadataQuality: [
    "metadataQuality",
    "metadata_quality",
    "metaQuality",
    "metadata",
  ],
  trustSignals: ["trustSignals", "trust_signals", "trust", "authoritySignals"],
};

function getObjectValue(
  record: Record<string, unknown> | null | undefined,
  aliases: string[],
): unknown {
  if (!record) return undefined;
  for (const alias of aliases) {
    if (alias in record) return record[alias];
  }
  return undefined;
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampScore(value);
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match) return clampScore(Number(match[0]));
  }

  if (value && typeof value === "object" && "score" in value) {
    return parseScore((value as { score?: unknown }).score);
  }

  return null;
}

function parseExplanation(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "explanation" in value) {
    const explanation = (value as { explanation?: unknown }).explanation;
    return typeof explanation === "string" ? explanation.trim() : "";
  }
  return "";
}

function toDimensions(raw: RawAuditResponse): ScoreDimension[] {
  const topLevelRecord = raw as unknown as Record<string, unknown>;
  const scoresRecord =
    raw.scores && typeof raw.scores === "object"
      ? (raw.scores as unknown as Record<string, unknown>)
      : null;

  return (Object.keys(DIMENSION_LABELS) as ScoreDimensionKey[])
    .map((key) => {
      const aliases = SCORE_ALIASES[key];
      const scoreSource =
        getObjectValue(scoresRecord, aliases) ??
        getObjectValue(topLevelRecord, aliases);
      const score = parseScore(scoreSource);
      const explanation = parseExplanation(scoreSource);

      return {
        key,
        label: DIMENSION_LABELS[key],
        score: score ?? 0,
        explanation,
      };
    })
    .filter(
      (dimension) => dimension.score > 0 || dimension.explanation.length > 0,
    );
}

function normalizeList(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback];
  const items = value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
  return items.length > 0 ? items : [fallback];
}

function normalizeAudit(raw: RawAuditResponse | null): PageAudit | null {
  if (!raw || typeof raw !== "object") return null;

  const dimensions = toDimensions(raw);
  if (dimensions.length === 0) return null;

  const parsedOverallScore = parseScore(raw.overallScore);
  const fallbackOverallScore = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.score, 0) /
      dimensions.length,
  );

  return {
    pageType: String(raw.pageType ?? "Unknown page type"),
    industry: String(raw.industry ?? "Unknown niche"),
    primaryAudience: String(raw.primaryAudience ?? "General audience"),
    primaryIntent: String(raw.primaryIntent ?? "Informational"),
    overallScore: parsedOverallScore ?? fallbackOverallScore,
    verdict: String(raw.verdict ?? "No summary available."),
    dimensions,
    strengths: normalizeList(raw.strengths, "No clear strengths identified."),
    weaknesses: normalizeList(
      raw.weaknesses,
      "No major weaknesses identified.",
    ),
    missingSubtopics: normalizeList(
      raw.missingSubtopics,
      "No missing subtopics identified.",
    ),
    priorityActions: normalizeList(
      raw.priorityActions,
      "No priority actions suggested.",
    ),
  };
}

export async function POST(request: Request) {
  try {
    const key = getGeminiApiKey();
    const { scrapedContent, model } = await request.json();

    if (!scrapedContent || !model) {
      return Response.json(
        { error: "scrapedContent and model are required" },
        { status: 400 },
      );
    }

    const { title, description, headings, bodyText, url } = scrapedContent;
    const contentSummary = [
      `URL: ${url}`,
      `Title: ${title}`,
      `Meta Description: ${description}`,
      `H1 Headings: ${headings.h1.join(", ")}`,
      `H2 Headings: ${headings.h2.slice(0, 10).join(", ")}`,
      `H3 Headings: ${headings.h3.slice(0, 10).join(", ")}`,
      `Body Content: ${bodyText.slice(0, 3500)}`,
    ].join("\n");

    const prompt = `You are an expert SEO content auditor. Be extremely concise — no unnecessary elaboration. Read the page content, determine the page type, niche, audience, and search intent.

Analyze the following page:
${contentSummary}

Return ONLY valid JSON using this exact structure:
{
  "pageType": "blog post | landing page | service page | social page | firm page | product page | other",
  "industry": "short niche or field name",
  "primaryAudience": "who this page targets (under 10 words)",
  "primaryIntent": "informational | commercial investigation | transactional | navigational | lead generation | brand awareness | mixed",
  "overallScore": 0,
  "verdict": "1-2 sentence summary of the page's SEO quality and content fit",
  "scores": {
    "topicalRelevance": { "score": 0, "explanation": "1 sentence, under 15 words" },
    "searchIntentMatch": { "score": 0, "explanation": "1 sentence, under 15 words" },
    "topicalDepth": { "score": 0, "explanation": "1 sentence, under 15 words" },
    "clarityReadability": { "score": 0, "explanation": "1 sentence, under 15 words" },
    "metadataQuality": { "score": 0, "explanation": "1 sentence, under 15 words" },
    "trustSignals": { "score": 0, "explanation": "1 sentence, under 15 words" }
  },
  "strengths": ["3 strengths, max 10 words each"],
  "weaknesses": ["3 weaknesses, max 10 words each"],
  "missingSubtopics": ["up to 4 short phrases only"],
  "priorityActions": ["up to 4 actions, 1 sentence each"]
}

Scoring guidance:
- Score each category from 0 to 100
- Be strict but fair
- Infer trust signals from the content structure and on-page cues only
- If the page is not a blog post, still score it based on how well it serves its likely SEO purpose`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.35,
      maxOutputTokens: 2048,
    });

    const parsed = parseJsonSafely<RawAuditResponse>(rawText);
    const audit = normalizeAudit(parsed);

    if (!audit) {
      return Response.json(
        { error: "Failed to parse a valid audit response from AI" },
        { status: 500 },
      );
    }

    return Response.json({ audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
