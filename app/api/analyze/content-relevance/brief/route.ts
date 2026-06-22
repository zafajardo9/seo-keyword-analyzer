import {
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
import { ContentBriefResult, BriefOutlineItem } from "@/lib/types";

interface RawBriefResult {
  workingTitle: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  relatedKeywords: string[];
  searchIntent: string;
  outline: Array<{
    heading: string;
    hLevel: string;
    keyPoints: string[];
    targetKeywords?: string[];
    estimatedWordCount?: number;
  }>;
  writingGuidelines: string[];
  suggestedMedia: string[];
  estimatedReadingTime: string;
  seoRecommendations: string[];
  questionsToAnswer?: string[];
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeOutline(value: unknown): BriefOutlineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      heading: String(item.heading ?? ""),
      hLevel: (item.hLevel === "h2" ||
      item.hLevel === "h3" ||
      item.hLevel === "h4"
        ? item.hLevel
        : "h2") as BriefOutlineItem["hLevel"],
      keyPoints: normalizeList(item.keyPoints),
      targetKeywords: Array.isArray(item.targetKeywords)
        ? item.targetKeywords.map(String)
        : undefined,
      estimatedWordCount: Number.isFinite(Number(item.estimatedWordCount))
        ? Number(item.estimatedWordCount)
        : undefined,
    }))
    .filter((s) => s.heading.length > 0);
}

function normalizeBrief(raw: RawBriefResult | null): ContentBriefResult | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    workingTitle: String(raw.workingTitle ?? ""),
    targetKeywords: {
      primary: String(raw.primaryKeyword ?? ""),
      secondary: normalizeList(raw.secondaryKeywords),
      related: normalizeList(raw.relatedKeywords),
    },
    searchIntent: String(raw.searchIntent ?? ""),
    outline: normalizeOutline(raw.outline),
    writingGuidelines: normalizeList(raw.writingGuidelines),
    suggestedMedia: normalizeList(raw.suggestedMedia),
    estimatedReadingTime: String(raw.estimatedReadingTime ?? ""),
    seoRecommendations: normalizeList(raw.seoRecommendations),
    questionsToAnswer: raw.questionsToAnswer
      ? normalizeList(raw.questionsToAnswer)
      : undefined,
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
            "Content is too short to generate a brief. Please provide more content.",
        },
        { status: 400 },
      );
    }

    const contentSlice = trimmedContent.slice(0, 9000);
    const auditJson = JSON.stringify(audit ?? {}, null, 2);

    const prompt = `You are an expert SEO content brief writer. Create a detailed content brief based on the target keyword, existing content, and relevance audit findings.

Target keyword: ${String(keyword).trim()}

Existing content (use this to understand what's already covered):
${contentSlice}

Relevance audit findings (use this to address gaps):
${auditJson}

Return ONLY valid JSON using this exact structure:
{
  "workingTitle": "SEO-optimized working title for the article",
  "primaryKeyword": "The primary target keyword",
  "secondaryKeywords": ["secondary keyword 1", "secondary keyword 2"],
  "relatedKeywords": ["related keyword 1", "related keyword 2", "related keyword 3"],
  "searchIntent": "The primary search intent (informational, commercial, transactional, navigational, or mixed) with a brief explanation",
  "outline": [
    {
      "heading": "H2 heading title",
      "hLevel": "h2",
      "keyPoints": ["key point to cover", "key point to cover"],
      "targetKeywords": ["keyword to use in this section"],
      "estimatedWordCount": 300
    }
  ],
  "writingGuidelines": ["guideline 1", "guideline 2", "guideline 3"],
  "suggestedMedia": ["type of media 1 (e.g., Comparison table)", "type of media 2 (e.g., Flowchart)"],
  "estimatedReadingTime": "X min",
  "seoRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "questionsToAnswer": ["Question the content should answer 1", "Question 2"]
}

Requirements:
- Outline should have 4-8 sections depending on topic complexity
- Include a mix of H2 and H3 sections
- estimatedWordCount per section should total to a realistic article length (1500-3000 words)
- Be specific and actionable — avoid generic placeholder text
- Base the brief on actual gaps found in the relevance audit`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.5,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonSafely<RawBriefResult>(rawText);
    const result = normalizeBrief(parsed);

    if (!result || !result.workingTitle || result.outline.length === 0) {
      return Response.json(
        { error: "Failed to generate content brief" },
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
