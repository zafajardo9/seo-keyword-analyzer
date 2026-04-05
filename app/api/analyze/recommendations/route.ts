export interface Recommendation {
  topic: string;
  reasoning: string;
  targetKeywords: string[];
  sampleContent: string;
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
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

    const modelId = model.replace("models/", "");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Gemini API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const cleaned = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let recommendations: Recommendation[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        recommendations = parsed.filter(
          (r) =>
            typeof r.topic === "string" &&
            typeof r.reasoning === "string" &&
            Array.isArray(r.targetKeywords) &&
            typeof r.sampleContent === "string"
        );
      }
    } catch {
      recommendations = [];
    }

    return Response.json({ recommendations });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
