import { clampScore, generateGeminiText, getGeminiApiKey, parseJsonSafely } from "@/lib/gemini";
import { BlogBattleResult, BattleMetricKey, BattleMetricScore } from "@/lib/types";
import { scrapePage } from "@/lib/scrape-page";

const METRIC_LABELS: Record<BattleMetricKey, string> = {
  topicalCoverage: "Topical Coverage",
  searchIntentFit: "Search Intent Fit",
  clarityReadability: "Clarity & Readability",
  metadataQuality: "Metadata Quality",
  trustSignals: "Trust Signals",
  keywordOpportunity: "Keyword Opportunity",
};

interface RawBattleSide {
  url: string;
  title: string;
  nickname: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
}

interface RawBattleMetric {
  leftScore: number;
  rightScore: number;
  explanation: string;
}

interface RawBattleResult {
  left: RawBattleSide;
  right: RawBattleSide;
  winner: "left" | "right" | "tie";
  verdict: string;
  quickTakeaways: string[];
  metrics: Record<BattleMetricKey, RawBattleMetric>;
}

function normalizeList(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback];
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : [fallback];
}

function normalizeMetric(key: BattleMetricKey, value: RawBattleMetric | undefined): BattleMetricScore {
  return {
    key,
    label: METRIC_LABELS[key],
    leftScore: clampScore(value?.leftScore ?? 0),
    rightScore: clampScore(value?.rightScore ?? 0),
    explanation: typeof value?.explanation === "string" ? value.explanation : "",
  };
}

function normalizeSide(side: RawBattleSide | undefined, fallbackUrl: string, fallbackTitle: string, nickname: string) {
  return {
    url: typeof side?.url === "string" ? side.url : fallbackUrl,
    title: typeof side?.title === "string" ? side.title : fallbackTitle,
    nickname: typeof side?.nickname === "string" ? side.nickname : nickname,
    overallScore: clampScore(side?.overallScore ?? 0),
    strengths: normalizeList(side?.strengths, "No clear strengths returned."),
    weaknesses: normalizeList(side?.weaknesses, "No clear weaknesses returned."),
  };
}

function normalizeBattle(
  raw: RawBattleResult | null,
  leftUrl: string,
  leftTitle: string,
  rightUrl: string,
  rightTitle: string
): BlogBattleResult | null {
  if (!raw || typeof raw !== "object" || !raw.metrics) return null;

  const metrics = (Object.keys(METRIC_LABELS) as BattleMetricKey[]).map((key) =>
    normalizeMetric(key, raw.metrics?.[key])
  );

  if (metrics.every((metric) => metric.leftScore === 0 && metric.rightScore === 0)) {
    return null;
  }

  return {
    left: normalizeSide(raw.left, leftUrl, leftTitle, "Page A"),
    right: normalizeSide(raw.right, rightUrl, rightTitle, "Page B"),
    winner: raw.winner === "left" || raw.winner === "right" || raw.winner === "tie" ? raw.winner : "tie",
    verdict: typeof raw.verdict === "string" ? raw.verdict : "No verdict returned.",
    quickTakeaways: normalizeList(raw.quickTakeaways, "No key takeaways returned."),
    metrics,
  };
}

export async function POST(request: Request) {
  try {
    const key = getGeminiApiKey();
    const { leftUrl, rightUrl, model } = await request.json();

    if (!leftUrl || !rightUrl || !model) {
      return Response.json({ error: "leftUrl, rightUrl, and model are required" }, { status: 400 });
    }

    const [leftPage, rightPage] = await Promise.all([
      scrapePage(String(leftUrl).trim()).catch((err) => {
        throw new Error(`Left page is not parseable: ${err.message}`);
      }),
      scrapePage(String(rightUrl).trim()).catch((err) => {
        throw new Error(`Right page is not parseable: ${err.message}`);
      }),
    ]);

    const prompt = `You are an expert SEO strategist comparing two blog or content pages head-to-head. Be extremely concise — no unnecessary elaboration.

Page A
URL: ${leftPage.url}
Title: ${leftPage.title}
Description: ${leftPage.description}
H1: ${leftPage.headings.h1.join(" | ")}
H2: ${leftPage.headings.h2.slice(0, 8).join(" | ")}
Body: ${leftPage.bodyText.slice(0, 3000)}

Page B
URL: ${rightPage.url}
Title: ${rightPage.title}
Description: ${rightPage.description}
H1: ${rightPage.headings.h1.join(" | ")}
H2: ${rightPage.headings.h2.slice(0, 8).join(" | ")}
Body: ${rightPage.bodyText.slice(0, 3000)}

Return ONLY valid JSON in this exact shape:
{
  "left": {
    "url": "page A url",
    "title": "page A title",
    "nickname": "Page A",
    "overallScore": 0,
    "strengths": ["3 strengths, max 10 words each"],
    "weaknesses": ["3 weaknesses, max 10 words each"]
  },
  "right": {
    "url": "page B url",
    "title": "page B title",
    "nickname": "Page B",
    "overallScore": 0,
    "strengths": ["3 strengths, max 10 words each"],
    "weaknesses": ["3 weaknesses, max 10 words each"]
  },
  "winner": "left | right | tie",
  "verdict": "1-2 sentence summary explaining who wins and why",
  "quickTakeaways": ["up to 4 takeaways, 1 sentence each"],
  "metrics": {
    "topicalCoverage": { "leftScore": 0, "rightScore": 0, "explanation": "1 sentence, under 15 words" },
    "searchIntentFit": { "leftScore": 0, "rightScore": 0, "explanation": "1 sentence, under 15 words" },
    "clarityReadability": { "leftScore": 0, "rightScore": 0, "explanation": "1 sentence, under 15 words" },
    "metadataQuality": { "leftScore": 0, "rightScore": 0, "explanation": "1 sentence, under 15 words" },
    "trustSignals": { "leftScore": 0, "rightScore": 0, "explanation": "1 sentence, under 15 words" },
    "keywordOpportunity": { "leftScore": 0, "rightScore": 0, "explanation": "1 sentence, under 15 words" }
  }
}

Guidance:
- Scores must be 0 to 100
- Be comparative, not generic
- Judge from the content shown only
- Focus on which page is stronger for SEO and content usefulness`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.4,
      maxOutputTokens: 2048,
    });

    const parsed = parseJsonSafely<RawBattleResult>(rawText);
    const battle = normalizeBattle(parsed, leftPage.url, leftPage.title, rightPage.url, rightPage.title);

    if (!battle) {
      return Response.json({ error: "Failed to parse a valid battle response from AI" }, { status: 500 });
    }

    return Response.json({ battle });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /valid URL|HTTP and HTTPS|Failed to fetch page|Invalid URL/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
