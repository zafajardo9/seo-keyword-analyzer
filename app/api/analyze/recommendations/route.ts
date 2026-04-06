import { generateGeminiText, getGeminiApiKey, parseJsonSafely } from "@/lib/gemini";

export interface Recommendation {
  topic: string;
  reasoning: string;
  targetKeywords: string[];
  sampleContent: string;
}

export async function POST(request: Request) {
  try {
    const key = getGeminiApiKey();
    const { scrapedContent, keywords, model } = await request.json();

    if (!scrapedContent || !model) {
      return Response.json({ error: "scrapedContent and model are required" }, { status: 400 });
    }

    const { title, description, headings, bodyText, url } = scrapedContent;

    const contentSummary = [
      `URL: ${url}`,
      `Title: ${title}`,
      `Meta Description: ${description}`,
      `H1 Headings: ${headings.h1.join(", ")}`,
      `H2 Headings: ${headings.h2.slice(0, 8).join(", ")}`,
      `Body Content: ${bodyText.slice(0, 2000)}`,
    ].join("\n");

    const keywordList = Array.isArray(keywords) ? keywords.slice(0, 30).join(", ") : "";

    const prompt = `You are an expert SEO content strategist. Based on the following web page content and extracted keywords, provide 6 detailed blog content recommendations.

Web Page Content:
${contentSummary}

Extracted Keywords: ${keywordList}

For each recommendation, provide:
1. A compelling blog topic title
2. Why this topic is valuable for SEO (reasoning)
3. 3-5 target keywords to focus on
4. A sample blog introduction paragraph (2-3 sentences, ready to use)

Return ONLY a valid JSON array with this exact structure, no markdown, no explanation:
[
  {
    "topic": "Blog Topic Title Here",
    "reasoning": "Why this topic is valuable for SEO and audience",
    "targetKeywords": ["keyword1", "keyword2", "keyword3"],
    "sampleContent": "Sample introduction paragraph for the blog post..."
  }
]`;

    const rawText = await generateGeminiText(model, prompt, key, {
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonSafely<Recommendation[]>(rawText);
    const recommendations = Array.isArray(parsed)
      ? parsed.filter(
          (r) =>
            typeof r.topic === "string" &&
            typeof r.reasoning === "string" &&
            Array.isArray(r.targetKeywords) &&
            typeof r.sampleContent === "string"
        )
      : [];

    return Response.json({ recommendations });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
