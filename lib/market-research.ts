import * as cheerio from "cheerio";
import {
  clampScore,
  getGeminiApiKey,
  parseJsonSafely,
  generateGeminiTextWithSearch,
} from "@/lib/gemini";
import {
  MarketResearchReport,
  CompetitorProfile,
  MarketVisibilityRow,
} from "@/lib/types";

const MAX_SEARCHES = 5;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SEOAnalyzerBot/1.0; +https://seo-analyzer.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: HTTP ${res.status}`);
  }
  return res.text();
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    const html = await fetchHtml(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    );
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result").each((_, el) => {
      const title = $(el).find(".result__title").text().trim();
      const url = $(el).find(".result__url").text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      if (title && url) {
        results.push({ title, url, snippet });
      }
    });

    return results.slice(0, 8);
  } catch {
    return [];
  }
}

function normalizeWebsite(input: string): URL {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    url.hash = "";
    return url;
  } catch {
    throw new Error("Invalid URL format");
  }
}

async function scrapeHomepage(url: string): Promise<{
  title: string;
  description: string;
  h1: string[];
  bodyText: string;
}> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    $("script, style, noscript, iframe, svg, canvas").remove();

    const title = $("title").first().text().trim();
    const description =
      $('meta[name="description"]').attr("content")?.trim() ??
      $('meta[property="og:description"]').attr("content")?.trim() ??
      "";

    const h1: string[] = [];
    $("h1").each((_, el) => {
      const text = $(el).text().trim();
      if (text) h1.push(text);
    });

    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    return { title, description, h1, bodyText };
  } catch {
    return { title: "", description: "", h1: [], bodyText: "" };
  }
}

interface GeminiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

async function callGeminiWithTools(
  modelId: string,
  prompt: string,
  apiKey: string,
  tools: GeminiTool[],
  functionHandler: (call: GeminiFunctionCall) => Promise<unknown>,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  let contents: Array<Record<string, unknown>> = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  for (let i = 0; i < MAX_SEARCHES + 1; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        tools: [{ functionDeclarations }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter(
      (p: Record<string, unknown>) => p.functionCall,
    );

    if (!functionCalls || functionCalls.length === 0) {
      return candidate?.content?.parts?.[0]?.text ?? "";
    }

    const functionResults: Array<Record<string, unknown>> = [];
    for (const part of functionCalls) {
      const call = part.functionCall as {
        name: string;
        args: Record<string, unknown>;
      };
      const result = await functionHandler(call);
      functionResults.push({
        name: call.name,
        response: { result },
      });
    }

    // Preserve all candidate parts (including thoughtSignature) for the model turn
    contents.push({
      role: "model",
      parts: candidate.content.parts,
    });

    contents.push({
      role: "user",
      parts: functionResults.map((fr) => ({
        functionResponse: { name: fr.name, response: fr.response },
      })),
    });
  }

  return "";
}

export async function conductMarketResearch(
  inputUrl: string,
  model: string,
  apiKey?: string,
  industry?: string,
): Promise<MarketResearchReport> {
  const root = normalizeWebsite(inputUrl);
  const normalizedRoot = `${root.protocol}//${root.hostname}${root.pathname === "/" ? "" : root.pathname}`;
  const key = await getGeminiApiKey(apiKey);
  const modelId = model.replace("models/", "");

  const homepage = await scrapeHomepage(root.toString());
  const companyName = homepage.h1[0] ?? homepage.title ?? root.hostname;

  const searchResults: SearchResult[] = [];
  const allQueries: string[] = [];

  const industryContext = industry
    ? `Known industry/business type: ${industry}\n`
    : "";

  const prompt = `You are an expert market research analyst. Your task is to research the market landscape for a given company website.

Company website: ${normalizedRoot}
Homepage title: ${homepage.title}
Description: ${homepage.description}
H1 headings: ${homepage.h1.join(", ")}
Body preview: ${homepage.bodyText.slice(0, 800)}
${industryContext}
Use the web_search tool to gather current market intelligence. You may call it up to ${MAX_SEARCHES} times.
Suggested searches:
- "${companyName} company overview industry"
- "${companyName} competitors market share"
- "${companyName} recent news funding"
- "${homepage.title} market trends 2024 2025"
- "${homepage.title} industry opportunities risks"
${industry ? `- "${industry} market trends 2024 2025"` : ""}

After gathering data, synthesize everything into a structured market research report.

Return ONLY valid JSON matching this exact structure:
{
  "companyName": "Company Name",
  "industry": "Primary Industry",
  "summary": "2-3 sentence market overview",
  "trends": ["trend 1", "trend 2", "trend 3"],
  "competitorInsights": ["insight 1", "insight 2"],
  "recentNews": ["news item 1", "news item 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"],
  "confidenceScore": 75,
  "sources": ["https://..."]
}`;

  const rawText = await callGeminiWithTools(
    modelId,
    prompt,
    key,
    [
      {
        name: "web_search",
        description:
          "Search the web for current information about a topic, company, or market. Returns a list of search results with titles, URLs, and snippets.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to run",
            },
          },
          required: ["query"],
        },
      },
    ],
    async (call) => {
      if (call.name !== "web_search") return [];
      const query = String(call.args.query ?? "");
      if (!query) return [];
      allQueries.push(query);
      const results = await searchWeb(query);
      searchResults.push(...results);
      return results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
      }));
    },
  );

  const report =
    parseJsonSafely<MarketResearchReport>(rawText) ??
    ({} as Partial<MarketResearchReport>);

  const sources = Array.from(
    new Set([...(report.sources ?? []), ...searchResults.map((r) => r.url)]),
  );

  // Phase 2: Deep competitive analysis using Google Search grounding
  let similarCompanies: CompetitorProfile[] = [];
  let marketVisibility: MarketVisibilityRow[] = [];
  let googleFavoredFactors: string[] = [];
  let userFavoredFactors: string[] = [];
  let overallPositioning = "";

  try {
    const compPrompt = `You are an expert competitive analyst with access to Google Search. Research the competitive landscape for the company below.

Company: ${report.companyName || companyName}
Industry: ${report.industry || "Unknown"}
Website: ${root.hostname}

Search Google for similar companies, competitors, and market positioning. Then return ONLY valid JSON using this exact structure:
{
  "similarCompanies": [
    {
      "name": "Competitor name",
      "website": "https://...",
      "description": "Brief description of their offering",
      "strengths": ["strength 1", "strength 2", "strength 3"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "googleVisibility": 75,
      "userPreference": 65,
      "positioning": "How they position themselves in the market"
    }
  ],
  "marketVisibility": [
    {
      "competitor": "Competitor name",
      "googleRanking": "stronger | similar | weaker",
      "userTrust": "stronger | similar | weaker",
      "contentQuality": "better | similar | worse",
      "keyDifference": "What sets them apart from the target company"
    }
  ],
  "googleFavoredFactors": ["What Google seems to favor about top competitors"],
  "userFavoredFactors": ["What users/clients seem to prefer"],
  "overallPositioning": "1-2 sentence summary of where the company stands vs competitors"
}

Requirements:
- Find 3-5 similar companies / direct competitors
- googleVisibility: 0-100 score estimating how well they rank in Google search
- userPreference: 0-100 score estimating user/client preference
- Use real search data to inform your analysis, not generic assumptions
- Be specific about each competitor's positioning and key differences`;

    const { text: compText } = await generateGeminiTextWithSearch(
      modelId,
      compPrompt,
      key,
      { temperature: 0.4, maxOutputTokens: 4096 },
    );

    const compData = parseJsonSafely<{
      similarCompanies: CompetitorProfile[];
      marketVisibility: MarketVisibilityRow[];
      googleFavoredFactors: string[];
      userFavoredFactors: string[];
      overallPositioning: string;
    }>(compText);

    if (compData) {
      if (Array.isArray(compData.similarCompanies)) {
        similarCompanies = compData.similarCompanies.filter(
          (c) => c.name && c.name.length > 0,
        );
      }
      if (Array.isArray(compData.marketVisibility)) {
        marketVisibility = compData.marketVisibility.filter(
          (r) => r.competitor && r.competitor.length > 0,
        );
      }
      googleFavoredFactors = Array.isArray(compData.googleFavoredFactors)
        ? compData.googleFavoredFactors.filter(
            (f): f is string => typeof f === "string",
          )
        : [];
      userFavoredFactors = Array.isArray(compData.userFavoredFactors)
        ? compData.userFavoredFactors.filter(
            (f): f is string => typeof f === "string",
          )
        : [];
      overallPositioning = String(compData.overallPositioning ?? "");
    }
  } catch {
    // Competitive analysis failed silently — report still works without it
  }

  return {
    companyName: String(report.companyName ?? companyName),
    industry: String(report.industry ?? "Unknown Industry"),
    summary: String(
      report.summary ?? homepage.description ?? "No summary available.",
    ),
    trends: Array.isArray(report.trends)
      ? report.trends.filter((t): t is string => typeof t === "string")
      : [],
    competitorInsights: Array.isArray(report.competitorInsights)
      ? report.competitorInsights.filter(
          (i): i is string => typeof i === "string",
        )
      : [],
    recentNews: Array.isArray(report.recentNews)
      ? report.recentNews.filter((n): n is string => typeof n === "string")
      : [],
    opportunities: Array.isArray(report.opportunities)
      ? report.opportunities.filter((o): o is string => typeof o === "string")
      : [],
    risks: Array.isArray(report.risks)
      ? report.risks.filter((r): r is string => typeof r === "string")
      : [],
    confidenceScore: clampScore(report.confidenceScore ?? 50),
    sources: sources.slice(0, 20),
    similarCompanies,
    marketVisibility,
    googleFavoredFactors,
    userFavoredFactors,
    overallPositioning,
  };
}
