import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
import {
  SeoValidationResult,
  SeoCategory,
  SeoCheckItem,
  SeoValidationStatus,
  PlatformFix,
} from "@/lib/types";
import { scrapePage } from "@/lib/scrape-page";

interface RawPlatformFix {
  platform: string;
  steps: string[];
}

interface RawCheckItem {
  label: string;
  status: string;
  value?: string;
  recommendation?: string;
  platformFixes?: RawPlatformFix[];
}

interface RawCategory {
  id: string;
  label: string;
  icon: string;
  checks: RawCheckItem[];
}

interface RawValidationResult {
  overallScore: number;
  passCount: number;
  totalCount: number;
  categories: RawCategory[];
  criticalIssues: string[];
  summary: string;
}

function normalizeStatus(value: unknown): SeoValidationStatus {
  if (value === "pass" || value === "fail" || value === "warning") return value;
  return "warning";
}

function normalizePlatformFixes(value: unknown): PlatformFix[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      platform: String(item.platform ?? ""),
      steps: Array.isArray(item.steps)
        ? item.steps.filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0,
          )
        : [],
    }))
    .filter((f) => f.platform.length > 0 && f.steps.length > 0);
}

function normalizeCheckItems(value: unknown): SeoCheckItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      label: String(item.label ?? ""),
      status: normalizeStatus(item.status),
      value: item.value ? String(item.value) : undefined,
      recommendation: item.recommendation
        ? String(item.recommendation)
        : undefined,
      platformFixes: item.platformFixes
        ? normalizePlatformFixes(item.platformFixes)
        : undefined,
    }))
    .filter((c) => c.label.length > 0);
}

function normalizeCategories(value: unknown): SeoCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      id: String(item.id ?? ""),
      label: String(item.label ?? ""),
      icon: String(item.icon ?? ""),
      checks: normalizeCheckItems(item.checks),
    }))
    .filter((c) => c.id.length > 0);
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeResult(
  raw: RawValidationResult | null,
): SeoValidationResult | null {
  if (!raw || typeof raw !== "object") return null;

  const categories = normalizeCategories(raw.categories);
  const totalCount = categories.reduce((sum, c) => sum + c.checks.length, 0);
  const passCount = categories.reduce(
    (sum, c) => sum + c.checks.filter((ch) => ch.status === "pass").length,
    0,
  );

  return {
    overallScore: clampScore(raw.overallScore ?? 0),
    passCount: raw.passCount ?? passCount,
    totalCount: raw.totalCount ?? totalCount,
    categories,
    criticalIssues: normalizeList(raw.criticalIssues),
    summary: String(raw.summary ?? ""),
  };
}

export async function POST(request: Request) {
  try {
    const { url, draft, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!model) {
      return Response.json({ error: "model is required" }, { status: 400 });
    }

    const trimmedDraft = String(draft ?? "").trim();
    const trimmedUrl = String(url ?? "").trim();

    if (!trimmedDraft && !trimmedUrl) {
      return Response.json(
        { error: "Provide either page content or a public URL to validate." },
        { status: 400 },
      );
    }

    let contentForAudit = "";
    let sourceUrl: string | undefined;

    if (trimmedUrl) {
      const scraped = await scrapePage(trimmedUrl);
      const bodySummary = scraped.bodyText.trim();
      if (bodySummary.length < 120) {
        return Response.json(
          { error: "The page did not contain enough content to validate." },
          { status: 400 },
        );
      }
      sourceUrl = scraped.url;
      contentForAudit = `URL: ${scraped.url}
Title: ${scraped.title}
Meta Description: ${scraped.description}
H1: ${scraped.headings.h1.join(" | ")}
H2: ${scraped.headings.h2.join(" | ")}
H3: ${scraped.headings.h3.join(" | ")}

Body content:
${bodySummary.slice(0, 9000)}`;
    } else {
      if (trimmedDraft.length < 120) {
        return Response.json(
          {
            error:
              "Content is too short. Paste the full page content for a complete validation.",
          },
          { status: 400 },
        );
      }
      contentForAudit = trimmedDraft.slice(0, 9000);
    }

    const prompt = `You are an expert SEO auditor. Perform a rigorous on-page SEO validation on the provided content. Be strict — this is a PASS/FAIL checklist, no guessing. Every check must have a clear, objective basis.

Content to validate:
${contentForAudit}

Return ONLY valid JSON using this exact structure:
{
  "overallScore": 0,
  "passCount": 0,
  "totalCount": 0,
  "categories": [
    {
      "id": "title-meta",
      "label": "01 · Title and Meta",
      "icon": "tag",
      "checks": [
        {
          "label": "Title tag is under 60 characters",
          "status": "pass | fail | warning",
          "value": "actual title length or content",
          "recommendation": "Trim title to 55 characters for optimal display",
          "platformFixes": [
            {
              "platform": "WordPress",
              "steps": ["Go to Settings > General or use an SEO plugin like Yoast", "Edit the site title or post title"]
            },
            {
              "platform": "Framer",
              "steps": ["Open the page settings panel", "Update the page title field under SEO settings"]
            },
            {
              "platform": "Custom Code",
              "steps": ["Edit the <title> tag in the <head> section of your HTML", "Keep it under 60 characters including spaces"]
            }
          ]
        }
      ]
    }
  ],
  "criticalIssues": ["Description of any critical failure"],
  "summary": "1-2 sentence overall assessment"
}

IMPORTANT: For every FAIL or WARNING check, include a "platformFixes" array with specific step-by-step instructions for at least 3 platforms: WordPress (with plugin references like Yoast/SEOPress), Framer (exact UI paths), and Custom Code (direct HTML/CSS/JS edits). Each step must be an actionable instruction, not vague advice.

CATEGORIES AND CHECKS (validate every item):

CATEGORY 1: title-meta "01 · Title and Meta"
- Title tag is under 60 characters (measure actual length)
- Meta description is between 120-160 characters
- Target keyword appears in the title tag
- Meta description includes a call to action or value prop
- Title is unique and specific (not generic like "Home" or "Blog")

CATEGORY 2: heading-hierarchy "02 · Heading Hierarchy"
- Page has exactly one H1 tag
- H2 and H3 follow logical nesting (no skipped levels like H1→H3)
- Target keyword appears in at least one heading
- H1 is under 70 characters for featured snippet eligibility
- Headings provide a clear content outline on their own

CATEGORY 3: link-audit "03 · Link Audit"
- Page contains at least 3 internal links
- No broken or empty links (href="#" or href="")
- External links open in new tab (infer from context)
- Links use descriptive anchor text (not "click here" or "read more")
- Link density is reasonable (not excessive or sparse)

CATEGORY 4: og-schema "04 · OG and Schema"
- Open Graph title is present and optimized
- Open Graph description is between 100-200 characters
- Open Graph image is specified (look for og:image)
- Twitter Card markup is present
- Canonical URL is specified
- JSON-LD or structured data is present (look for schema.org)

Scoring:
- Score from 0 to 100
- FAIL any check where the element is missing, too short/long, or doesn't follow best practices
- PASS only when the element clearly meets the standard
- WARNING when you can't fully verify but it appears acceptable
- Be honest — this is meant to catch issues before publishing`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.3,
      maxOutputTokens: 8192,
    });

    const parsed = parseJsonSafely<RawValidationResult>(rawText);
    const result = normalizeResult(parsed);

    if (!result || result.categories.length === 0) {
      return Response.json(
        { error: "Failed to parse validation results" },
        { status: 500 },
      );
    }

    result.url = sourceUrl;

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
