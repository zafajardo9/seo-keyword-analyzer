import * as cheerio from "cheerio";
import {
  clampScore,
  getGeminiApiKey,
  parseJsonSafely,
} from "@/lib/gemini";
import { MarketResearchReport } from "@/lib/types";

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

    const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 2000);

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

  const industryContext = industry ? `Known industry/business type: ${industry}\n` : "";

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
      return results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet }));
    },
  );

  const report =
    parseJsonSafely<MarketResearchReport>(rawText) ??
    ({} as Partial<MarketResearchReport>);

  const sources = Array.from(
    new Set([
      ...(report.sources ?? []),
      ...searchResults.map((r) => r.url),
    ]),
  );

  return {
    companyName: String(report.companyName ?? companyName),
    industry: String(report.industry ?? "Unknown Industry"),
    summary: String(report.summary ?? homepage.description ?? "No summary available."),
    trends: Array.isArray(report.trends) ? report.trends.filter((t): t is string => typeof t === "string") : [],
    competitorInsights: Array.isArray(report.competitorInsights)
      ? report.competitorInsights.filter((i): i is string => typeof i === "string")
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
  };
}
