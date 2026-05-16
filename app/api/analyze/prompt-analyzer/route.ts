import {
  clampScore,
  generateGeminiTextWithSearch,
  getGeminiApiKey,
  parseJsonSafely,
} from "@/lib/gemini";
import {
  ContentCheck,
  ContentCheckKey,
  PromptAnalysis,
  PromptCategory,
  PromptGrade,
  PromptLikelihood,
  PromptResult,
} from "@/lib/types";

const VALID_GRADES = new Set<PromptGrade>(["A", "B", "C", "D", "F"]);
const VALID_LIKELIHOODS = new Set<PromptLikelihood>(["High", "Medium", "Low"]);
const VALID_CATEGORIES = new Set<PromptCategory>([
  "Informational",
  "Commercial",
  "Navigational",
  "Transactional",
  "Investigational",
]);

function toGrade(score: number): PromptGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function normalizeGrade(raw: unknown): PromptGrade {
  const s = String(raw ?? "").trim().toUpperCase() as PromptGrade;
  return VALID_GRADES.has(s) ? s : "C";
}

function normalizeLikelihood(raw: unknown): PromptLikelihood {
  const lower = String(raw ?? "").toLowerCase();
  if (lower === "high") return "High";
  if (lower === "medium") return "Medium";
  return "Low";
}

function normalizeCategory(raw: unknown): PromptCategory {
  const s = String(raw ?? "").trim() as PromptCategory;
  return VALID_CATEGORIES.has(s) ? s : "Informational";
}

function normalizePrompt(raw: Record<string, unknown>): PromptResult {
  const score = clampScore(
    typeof raw.score === "number" ? raw.score : parseInt(String(raw.score ?? "50"), 10),
  );
  const suggestions = Array.isArray(raw.suggestions)
    ? (raw.suggestions as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];

  return {
    prompt: String(raw.prompt ?? ""),
    grade: typeof raw.grade === "string" ? normalizeGrade(raw.grade) : toGrade(score),
    score,
    likelihood: normalizeLikelihood(raw.likelihood),
    category: normalizeCategory(raw.category),
    reasoning: String(raw.reasoning ?? ""),
    suggestions,
  };
}

function normalizeList(raw: unknown, fallback: string): string[] {
  if (!Array.isArray(raw)) return [fallback];
  const items = (raw as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  return items.length > 0 ? items : [fallback];
}

const VALID_CHECK_KEYS = new Set<ContentCheckKey>([
  "semanticHtml",
  "semanticCoverage",
  "atomicSections",
  "examplesAndFaqs",
  "internalLinking",
]);

const CHECK_LABELS: Record<ContentCheckKey, string> = {
  semanticHtml: "Semantic HTML",
  semanticCoverage: "Semantic Coverage",
  atomicSections: "Atomic Sections",
  examplesAndFaqs: "Examples & FAQs",
  internalLinking: "Internal Linking",
};

function normalizeContentCheck(raw: Record<string, unknown>): ContentCheck | null {
  const key = String(raw.key ?? "") as ContentCheckKey;
  if (!VALID_CHECK_KEYS.has(key)) return null;
  const score = clampScore(
    typeof raw.score === "number" ? raw.score : parseInt(String(raw.score ?? "50"), 10),
  );
  const suggestions = Array.isArray(raw.suggestions)
    ? (raw.suggestions as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];
  return {
    key,
    label: CHECK_LABELS[key],
    grade: typeof raw.grade === "string" ? normalizeGrade(raw.grade) : toGrade(score),
    score,
    verdict: String(raw.verdict ?? ""),
    suggestions,
  };
}

interface RawResponse {
  pageTitle?: unknown;
  overallScore?: unknown;
  overallGrade?: unknown;
  aiVisibilityVerdict?: unknown;
  prompts?: unknown[];
  topStrengths?: unknown;
  criticalGaps?: unknown;
  contentChecks?: unknown[];
}

function normalizeAnalysis(raw: RawResponse, url: string): PromptAnalysis {
  const overallScore = clampScore(
    typeof raw.overallScore === "number"
      ? raw.overallScore
      : parseInt(String(raw.overallScore ?? "50"), 10),
  );

  const prompts: PromptResult[] = Array.isArray(raw.prompts)
    ? (raw.prompts as Record<string, unknown>[]).map(normalizePrompt)
    : [];

  const contentChecks: ContentCheck[] = Array.isArray(raw.contentChecks)
    ? (raw.contentChecks as Record<string, unknown>[])
        .map(normalizeContentCheck)
        .filter((c): c is ContentCheck => c !== null)
    : [];

  return {
    url,
    pageTitle: String(raw.pageTitle ?? url),
    overallScore,
    overallGrade: typeof raw.overallGrade === "string" ? normalizeGrade(raw.overallGrade) : toGrade(overallScore),
    aiVisibilityVerdict: String(raw.aiVisibilityVerdict ?? "No assessment available."),
    prompts,
    topStrengths: normalizeList(raw.topStrengths, "No strengths identified."),
    criticalGaps: normalizeList(raw.criticalGaps, "No gaps identified."),
    contentChecks,
  };
}

export async function POST(request: Request) {
  try {
    const { scrapedContent, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!scrapedContent || !model) {
      return Response.json({ error: "scrapedContent and model are required" }, { status: 400 });
    }

    const { title, description, headings, bodyText, url } = scrapedContent;
    const contentSummary = [
      `URL: ${url}`,
      `Title: ${title}`,
      `Meta Description: ${description}`,
      `H1 Headings: ${headings.h1.join(", ")}`,
      `H2 Headings: ${headings.h2.slice(0, 10).join(", ")}`,
      `H3 Headings: ${headings.h3.slice(0, 12).join(", ")}`,
      `Body Content: ${bodyText.slice(0, 4000)}`,
    ].join("\n");

    const prompt = `You are an expert in AI search optimization (GEO/AEO/SGE). You have access to Google Search — use it to look up the topics, keywords, and questions covered in the page below so you can evaluate what real users are searching for and how this page compares to currently-ranking content.

Your task: identify the most likely natural language prompts a user would type into Google AI Overview, Perplexity, ChatGPT, or similar AI search engines that would cause THIS SPECIFIC PAGE to be cited or recommended.

Use your Google Search access to:
1. Verify what queries currently surface similar content
2. Check what competing pages rank for the same topics
3. Identify search intent patterns around this page's subject matter

Page content:
${contentSummary}

Return ONLY valid JSON with this exact structure:
{
  "pageTitle": "the actual title of the page",
  "overallScore": 0,
  "overallGrade": "C",
  "aiVisibilityVerdict": "2-sentence verdict on overall AI prompt visibility",
  "prompts": [
    {
      "prompt": "natural language user query someone would type into an AI search engine",
      "grade": "B",
      "score": 75,
      "likelihood": "High",
      "category": "Informational",
      "reasoning": "1-2 sentences: why this page does or does not satisfy this prompt",
      "suggestions": ["specific actionable suggestion 1", "specific actionable suggestion 2"]
    }
  ],
  "topStrengths": ["3 specific things this page does well for AI search visibility"],
  "criticalGaps": ["3 most critical missing elements limiting AI prompt visibility"],
  "contentChecks": [
    {
      "key": "semanticHtml",
      "grade": "B",
      "score": 75,
      "verdict": "1-2 sentences assessing use of semantic HTML elements (article, section, nav, aside, header, footer, figure, etc.)",
      "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
    },
    {
      "key": "semanticCoverage",
      "grade": "B",
      "score": 70,
      "verdict": "1-2 sentences assessing how thoroughly the page covers its topic — breadth of subtopics, depth of explanation, and entity completeness",
      "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
    },
    {
      "key": "atomicSections",
      "grade": "C",
      "score": 60,
      "verdict": "1-2 sentences assessing whether content is split into small, focused, self-contained sections that AI can extract cleanly",
      "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
    },
    {
      "key": "examplesAndFaqs",
      "grade": "C",
      "score": 55,
      "verdict": "1-2 sentences assessing presence of concrete examples, code samples, use-cases, and FAQ-style Q&A blocks that AI loves to cite",
      "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
    },
    {
      "key": "internalLinking",
      "grade": "D",
      "score": 40,
      "verdict": "1-2 sentences assessing quality and quantity of internal links to related pages — important for AI to understand site context",
      "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
    }
  ]
}

Rules:
- Generate exactly 9 prompts covering diverse user intents
- Prompts must be realistic queries someone would actually type, based on the page's actual content
- Distribution: 3 High likelihood, 4 Medium likelihood, 2 Low likelihood
- Grade mapping: A = 85-100, B = 70-84, C = 50-69, D = 30-49, F < 30
- overallScore reflects average AI searchability across all prompts (weighted by likelihood)
- overallGrade must match overallScore using the grade mapping
- likelihood must be exactly "High", "Medium", or "Low"
- category must be exactly one of: "Informational", "Commercial", "Navigational", "Transactional", "Investigational"
- Each prompt must have exactly 2 suggestions, each under 20 words and specific to that prompt
- topStrengths and criticalGaps must be specific to THIS page, not generic advice
- contentChecks must include all 5 keys: semanticHtml, semanticCoverage, atomicSections, examplesAndFaqs, internalLinking
- Each contentCheck must have exactly 2 suggestions, specific to the page's actual content`;

    const { text: rawText, searchQueries } = await generateGeminiTextWithSearch(
      model,
      prompt,
      key,
      { temperature: 0.35, maxOutputTokens: 3000 },
    );

    let parsed = parseJsonSafely<RawResponse>(rawText);
    if (!parsed) {
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start !== -1 && end > start) {
        parsed = parseJsonSafely<RawResponse>(rawText.slice(start, end + 1));
      }
    }

    if (!parsed) {
      console.error("[prompt-analyzer] Raw Gemini response:", rawText.slice(0, 500));
      return Response.json({ error: "Failed to parse a valid prompt analysis from AI" }, { status: 500 });
    }

    const analysis = normalizeAnalysis(parsed, url);
    analysis.searchQueries = searchQueries;
    return Response.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
