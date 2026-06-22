import {
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
import {
  ContentStrategyResult,
  ClusterTopic,
  CompetitorInsight,
} from "@/lib/types";

interface RawStrategyResult {
  pillarTopic: string;
  clusterTopics: Array<{
    topic: string;
    type: string;
    targetKeywords?: string[];
    rationale?: string;
  }>;
  internalLinkingStrategy: string;
  primaryAudience: string;
  personaDetails: string;
  contentPreferences: string[];
  searchBehavior: string;
  painPoints: string[];
  topCompetitors: Array<{
    name: string;
    angle: string;
    gapToExploit: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  marketPositioning: string;
  contentDifferentiation: string[];
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeClusterTopics(value: unknown): ClusterTopic[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      topic: String(item.topic ?? ""),
      type: (item.type === "pillar" ||
      item.type === "supporting" ||
      item.type === "cluster"
        ? item.type
        : "supporting") as ClusterTopic["type"],
      targetKeywords: Array.isArray(item.targetKeywords)
        ? item.targetKeywords.map(String)
        : undefined,
      rationale: item.rationale ? String(item.rationale) : undefined,
    }))
    .filter((c) => c.topic.length > 0);
}

function normalizeCompetitors(value: unknown): CompetitorInsight[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      name: String(item.name ?? ""),
      angle: String(item.angle ?? ""),
      gapToExploit: String(item.gapToExploit ?? ""),
      strengths: normalizeList(item.strengths),
      weaknesses: normalizeList(item.weaknesses),
    }))
    .filter((c) => c.name.length > 0);
}

function normalizeStrategy(
  raw: RawStrategyResult | null,
): ContentStrategyResult | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    topicCluster: {
      pillarTopic: String(raw.pillarTopic ?? ""),
      clusterTopics: normalizeClusterTopics(raw.clusterTopics),
      internalLinkingStrategy: String(raw.internalLinkingStrategy ?? ""),
    },
    audienceMapping: {
      primaryAudience: String(raw.primaryAudience ?? ""),
      personaDetails: String(raw.personaDetails ?? ""),
      contentPreferences: normalizeList(raw.contentPreferences),
      searchBehavior: String(raw.searchBehavior ?? ""),
      painPoints: normalizeList(raw.painPoints),
    },
    competitiveLandscape: {
      topCompetitors: normalizeCompetitors(raw.topCompetitors),
      marketPositioning: String(raw.marketPositioning ?? ""),
      contentDifferentiation: normalizeList(raw.contentDifferentiation),
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
            "Content is too short to analyze. Please provide more content.",
        },
        { status: 400 },
      );
    }

    const contentSlice = trimmedContent.slice(0, 9000);
    const auditJson = JSON.stringify(audit ?? {}, null, 2);

    const prompt = `You are an expert content strategist and SEO consultant. Analyze the provided content and its relevance audit to build a comprehensive content strategy.

Target keyword: ${String(keyword).trim()}

Content:
${contentSlice}

Relevance audit:
${auditJson}

Return ONLY valid JSON using this exact structure:
{
  "pillarTopic": "The main pillar topic this content belongs to",
  "clusterTopics": [
    {
      "topic": "A specific subtopic or cluster topic",
      "type": "pillar | supporting | cluster",
      "targetKeywords": ["keyword1", "keyword2"],
      "rationale": "Why this subtopic is important"
    }
  ],
  "internalLinkingStrategy": "1-2 sentence strategy for how to internally link these topics together",
  "primaryAudience": "Description of the primary audience",
  "personaDetails": "Detailed persona description with demographics and role",
  "contentPreferences": ["preference1", "preference2", "preference3"],
  "searchBehavior": "What this audience typically searches for",
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "topCompetitors": [
    {
      "name": "Competitor name",
      "angle": "Their content angle or approach",
      "gapToExploit": "What they're missing that we can cover",
      "strengths": ["their strength 1", "their strength 2"],
      "weaknesses": ["their weakness 1", "their weakness 2"]
    }
  ],
  "marketPositioning": "1-2 sentence recommendation on positioning this content in the market",
  "contentDifferentiation": ["way to differentiate 1", "way to differentiate 2", "way to differentiate 3"]
}

Be specific and actionable. Base the analysis on the actual content provided, not generic templates.`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.5,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonSafely<RawStrategyResult>(rawText);
    const result = normalizeStrategy(parsed);

    if (!result || !result.topicCluster.pillarTopic) {
      return Response.json(
        { error: "Failed to generate content strategy" },
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
