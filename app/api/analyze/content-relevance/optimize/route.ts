import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
import { ContentOptimizerResult } from "@/lib/types";

interface RawOptimizerResult {
  optimizedContent: string;
  optimizedTitle: string;
  optimizedMetaDescription: string;
  keyChanges: string[];
  improvedRelevanceScore: number;
  improvedIntentMatchScore: number;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeScores(value: unknown, fallback: number): number {
  const n = Number(value);
  return clampScore(Number.isFinite(n) ? n : fallback);
}

function normalizeResult(
  raw: RawOptimizerResult | null,
): ContentOptimizerResult | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    optimizedContent: String(raw.optimizedContent ?? ""),
    optimizedTitle: String(raw.optimizedTitle ?? ""),
    optimizedMetaDescription: String(raw.optimizedMetaDescription ?? ""),
    keyChanges: normalizeList(raw.keyChanges),
    improvedScores: {
      estimatedRelevanceScore: normalizeScores(raw.improvedRelevanceScore, 0),
      estimatedIntentMatchScore: normalizeScores(
        raw.improvedIntentMatchScore,
        0,
      ),
    },
  };
}

export async function POST(request: Request) {
  try {
    const { keyword, originalContent, audit, model, apiKey } =
      await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!keyword || !model) {
      return Response.json(
        { error: "keyword and model are required" },
        { status: 400 },
      );
    }

    const trimmedContent = String(originalContent ?? "").trim();
    if (trimmedContent.length < 120) {
      return Response.json(
        {
          error:
            "Content is too short to optimize. Please provide more content.",
        },
        { status: 400 },
      );
    }

    const contentSlice = trimmedContent.slice(0, 9000);
    const auditJson = JSON.stringify(audit ?? {}, null, 2);

    const prompt = `You are an expert SEO content strategist and editor. Rewrite the provided content to address the gaps identified in the relevance audit.

Target keyword: ${String(keyword).trim()}

Original content:
${contentSlice}

Relevance audit (use this to guide improvements):
${auditJson}

Return ONLY valid JSON using this exact structure:
{
  "optimizedContent": "Full rewritten content incorporating the missing subtopics, improved structure, and addressing off-topic areas. Keep the same general length and intent.",
  "optimizedTitle": "SEO-optimized title that includes the target keyword naturally",
  "optimizedMetaDescription": "Compelling meta description under 160 characters with the target keyword",
  "keyChanges": ["up to 6 specific changes made, 1 sentence each"],
  "improvedRelevanceScore": 0,
  "improvedIntentMatchScore": 0
}

Scoring guidance:
- Score from 0 to 100
- The improved scores should reflect how much better this version is vs the original
- Be honest — don't inflate scores, only improve them meaningfully
- Penalize if the content is still thin, vague, or off-topic`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.5,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonSafely<RawOptimizerResult>(rawText);
    const result = normalizeResult(parsed);

    if (!result || !result.optimizedContent) {
      return Response.json(
        { error: "Failed to generate optimized content" },
        { status: 500 },
      );
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
