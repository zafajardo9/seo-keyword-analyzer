import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
} from "@/lib/gemini";
import {
  AeoDimensionKey,
  GeoDimensionKey,
  GeoAeoAudit,
  GeoAeoDimension,
  LlmCitationPotential,
} from "@/lib/types";

interface RawDimension {
  score: number;
  explanation: string;
}

interface RawGeoAeoResponse {
  overallScore: number;
  geoScore: number;
  aeoScore: number;
  verdict: string;
  llmCitationPotential: string;
  llmCitationReasoning: string;
  scores: {
    eeatSignals: RawDimension;
    factDataDensity: RawDimension;
    sourceCitationQuality: RawDimension;
    brandEntityClarity: RawDimension;
    topicalAuthorityDepth: RawDimension;
    directAnswerFormat: RawDimension;
    questionCoverage: RawDimension;
    structuredAnswerQuality: RawDimension;
    faqOptimization: RawDimension;
    passageLevelClarity: RawDimension;
  };
  topQuestionsAnswered: string[];
  missingQuestionsToAdd: string[];
  schemaMarkupOpportunities: string[];
  geoRecommendations: string[];
  aeoRecommendations: string[];
}

const GEO_DIMENSION_META: Record<GeoDimensionKey, { label: string; aliases: string[] }> = {
  eeatSignals:           { label: "E-E-A-T Signals",           aliases: ["eeatSignals", "eeat_signals", "eeat"] },
  factDataDensity:       { label: "Fact & Data Density",        aliases: ["factDataDensity", "fact_data_density", "factDensity"] },
  sourceCitationQuality: { label: "Source Citation Quality",    aliases: ["sourceCitationQuality", "source_citation_quality", "citationQuality"] },
  brandEntityClarity:    { label: "Brand Entity Clarity",       aliases: ["brandEntityClarity", "brand_entity_clarity", "entityClarity"] },
  topicalAuthorityDepth: { label: "Topical Authority Depth",    aliases: ["topicalAuthorityDepth", "topical_authority_depth", "authorityDepth"] },
};

const AEO_DIMENSION_META: Record<AeoDimensionKey, { label: string; aliases: string[] }> = {
  directAnswerFormat:      { label: "Direct Answer Format",       aliases: ["directAnswerFormat", "direct_answer_format", "answerFormat"] },
  questionCoverage:        { label: "Question Coverage",          aliases: ["questionCoverage", "question_coverage", "qCoverage"] },
  structuredAnswerQuality: { label: "Structured Answer Quality",  aliases: ["structuredAnswerQuality", "structured_answer_quality", "answerStructure"] },
  faqOptimization:         { label: "FAQ / Q&A Optimization",     aliases: ["faqOptimization", "faq_optimization", "faqQa"] },
  passageLevelClarity:     { label: "Passage-Level Clarity",      aliases: ["passageLevelClarity", "passage_level_clarity", "passageClarity"] },
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
  if (typeof value === "number" && Number.isFinite(value)) return clampScore(value);
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
    const e = (value as { explanation?: unknown }).explanation;
    return typeof e === "string" ? e.trim() : "";
  }
  return "";
}

function normalizeList(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback];
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return items.length > 0 ? items : [fallback];
}

function normalizeCitationPotential(raw: string): LlmCitationPotential {
  const lower = String(raw ?? "").toLowerCase();
  if (lower === "high") return "High";
  if (lower === "medium") return "Medium";
  return "Low";
}

function toDimensions(raw: RawGeoAeoResponse): GeoAeoDimension[] {
  const scoresRecord = raw.scores && typeof raw.scores === "object"
    ? (raw.scores as unknown as Record<string, unknown>)
    : null;
  const topLevel = raw as unknown as Record<string, unknown>;

  const geoDims: GeoAeoDimension[] = (Object.keys(GEO_DIMENSION_META) as GeoDimensionKey[]).map((key) => {
    const meta = GEO_DIMENSION_META[key];
    const src = getObjectValue(scoresRecord, meta.aliases) ?? getObjectValue(topLevel, meta.aliases);
    return {
      key,
      label: meta.label,
      score: parseScore(src) ?? 0,
      explanation: parseExplanation(src),
      group: "geo" as const,
    };
  });

  const aeoDims: GeoAeoDimension[] = (Object.keys(AEO_DIMENSION_META) as AeoDimensionKey[]).map((key) => {
    const meta = AEO_DIMENSION_META[key];
    const src = getObjectValue(scoresRecord, meta.aliases) ?? getObjectValue(topLevel, meta.aliases);
    return {
      key,
      label: meta.label,
      score: parseScore(src) ?? 0,
      explanation: parseExplanation(src),
      group: "aeo" as const,
    };
  });

  return [...geoDims, ...aeoDims];
}

function normalizeGeoAeoAudit(raw: RawGeoAeoResponse | null): GeoAeoAudit | null {
  if (!raw || typeof raw !== "object") return null;

  const dimensions = toDimensions(raw);
  // Accept partial results — only bail if no scores at all came through
  if (dimensions.every((d) => d.score === 0 && d.explanation === "")) return null;

  const geoDims = dimensions.filter((d) => d.group === "geo");
  const aeoDims = dimensions.filter((d) => d.group === "aeo");

  const geoScore = Math.round(geoDims.reduce((s, d) => s + d.score, 0) / Math.max(geoDims.length, 1));
  const aeoScore = Math.round(aeoDims.reduce((s, d) => s + d.score, 0) / Math.max(aeoDims.length, 1));
  const overallScore = Math.round((geoScore + aeoScore) / 2);

  return {
    overallScore,
    geoScore,
    aeoScore,
    verdict: String(raw.verdict ?? "No assessment available."),
    llmCitationPotential: normalizeCitationPotential(raw.llmCitationPotential),
    llmCitationReasoning: String(raw.llmCitationReasoning ?? ""),
    dimensions,
    topQuestionsAnswered: normalizeList(raw.topQuestionsAnswered, "No questions identified."),
    missingQuestionsToAdd: normalizeList(raw.missingQuestionsToAdd, "No gaps identified."),
    schemaMarkupOpportunities: normalizeList(raw.schemaMarkupOpportunities, "No schema opportunities identified."),
    geoRecommendations: normalizeList(raw.geoRecommendations, "No GEO recommendations available."),
    aeoRecommendations: normalizeList(raw.aeoRecommendations, "No AEO recommendations available."),
  };
}

export async function POST(request: Request) {
  try {
    const { scrapedContent, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

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

    const prompt = `You are an expert in Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO). Your task is to evaluate how well a page is positioned to be cited by AI assistants (ChatGPT, Gemini, Perplexity) and to appear in AI-generated answers and featured snippets.

Be concise and specific. Do not elaborate beyond what the content supports.

Analyze the following page:
${contentSummary}

Score the page on two sets of dimensions. All scores are 0–100. Be strict but fair.

GEO (Generative Engine Optimization) — signals that make AI models trust and cite this page:
- eeatSignals: Presence of author bios, credentials, first-hand experience, publication dates, trust badges, and authoritative institutional markers.
- factDataDensity: Density of verifiable statistics, named studies, original data, percentages, and specific facts that AI can cite.
- sourceCitationQuality: Quality and quantity of outbound links to authoritative external sources (.gov, .edu, major publications, peer-reviewed).
- brandEntityClarity: How clearly the brand/author is identified as a known entity — consistent name, About page, social proof, and structured identity signals.
- topicalAuthorityDepth: How comprehensively the page covers its topic — breadth of subtopics, expert terminology, and absence of vague generalities.

AEO (Answer Engine Optimization) — signals that help AI surface this page as a direct answer:
- directAnswerFormat: Does the page open with a direct, concise answer to the main question before elaborating?
- questionCoverage: How many relevant sub-questions and follow-up queries the page explicitly addresses.
- structuredAnswerQuality: Use of numbered lists, bullet points, comparison tables, or step-by-step formats that AI can extract directly.
- faqOptimization: Presence of explicit FAQ sections or Q&A pairs, and whether FAQPage schema is implemented or implied.
- passageLevelClarity: Whether individual sections or paragraphs can stand alone as self-contained answers — without needing surrounding context.

Return ONLY valid JSON using this exact structure:
{
  "overallScore": 0,
  "geoScore": 0,
  "aeoScore": 0,
  "verdict": "2-sentence assessment of the page's AI discoverability and citation potential",
  "llmCitationPotential": "High",
  "llmCitationReasoning": "1 sentence explaining why, under 20 words",
  "scores": {
    "eeatSignals":            { "score": 0, "explanation": "1 sentence, under 15 words" },
    "factDataDensity":        { "score": 0, "explanation": "1 sentence, under 15 words" },
    "sourceCitationQuality":  { "score": 0, "explanation": "1 sentence, under 15 words" },
    "brandEntityClarity":     { "score": 0, "explanation": "1 sentence, under 15 words" },
    "topicalAuthorityDepth":  { "score": 0, "explanation": "1 sentence, under 15 words" },
    "directAnswerFormat":     { "score": 0, "explanation": "1 sentence, under 15 words" },
    "questionCoverage":       { "score": 0, "explanation": "1 sentence, under 15 words" },
    "structuredAnswerQuality":{ "score": 0, "explanation": "1 sentence, under 15 words" },
    "faqOptimization":        { "score": 0, "explanation": "1 sentence, under 15 words" },
    "passageLevelClarity":    { "score": 0, "explanation": "1 sentence, under 15 words" }
  },
  "topQuestionsAnswered": ["up to 4 questions this page answers well, phrased as user questions"],
  "missingQuestionsToAdd": ["up to 4 high-value questions this page should answer but does not"],
  "schemaMarkupOpportunities": ["up to 3 schema types — use official schema.org names, e.g. FAQPage, HowTo, Article"],
  "geoRecommendations": ["3 specific actionable steps to improve GEO score, each under 20 words"],
  "aeoRecommendations": ["3 specific actionable steps to improve AEO score, each under 20 words"]
}

Scoring guidance:
- llmCitationPotential must be exactly one of: "High", "Medium", or "Low"
- High if overallScore >= 70, Medium if 45-69, Low if < 45
- A page with no author info, no statistics, and no structured answers should score below 35
- A page with clear authorship, cited data, and FAQ-style sections should score above 65`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.35,
      maxOutputTokens: 2048,
    });

    // Try standard parse first, then fall back to extracting the outermost {...}
    let parsed = parseJsonSafely<RawGeoAeoResponse>(rawText);
    if (!parsed) {
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start !== -1 && end > start) {
        parsed = parseJsonSafely<RawGeoAeoResponse>(rawText.slice(start, end + 1));
      }
    }

    if (!parsed) {
      console.error("[geo-aeo] Raw Gemini response (first 500 chars):", rawText.slice(0, 500));
      return Response.json(
        { error: "Failed to parse a valid GEO/AEO audit from AI" },
        { status: 500 },
      );
    }

    const audit = normalizeGeoAeoAudit(parsed);

    if (!audit) {
      console.error("[geo-aeo] normalizeGeoAeoAudit returned null. Parsed keys:", Object.keys(parsed));
      return Response.json(
        { error: "Failed to parse a valid GEO/AEO audit from AI" },
        { status: 500 },
      );
    }

    return Response.json({ audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
