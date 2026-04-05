export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const { scrapedContent, model } = await request.json();

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
      `H3 Headings: ${headings.h3.slice(0, 10).join(", ")}`,
      `Body Content: ${bodyText.slice(0, 3000)}`,
    ].join("\n");

    const prompt = `You are an expert SEO analyst. Analyze the following web page content and extract a comprehensive list of keywords and key phrases that are relevant for SEO research.

Web Page Content:
${contentSummary}

Instructions:
- Extract both short-tail (1-2 words) and long-tail (3-5 words) keywords
- Include topic clusters and semantic variations
- Focus on terms with clear search intent
- Include industry-specific terminology found on the page
- Return ONLY a valid JSON array of strings, no explanation, no markdown, no code blocks

Example output format:
["keyword one", "long tail keyword phrase", "another keyword"]`;

    const modelId = model.replace("models/", "");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
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

    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        keywords = parsed.filter((k) => typeof k === "string");
      }
    } catch {
      const matches = cleaned.match(/"([^"]+)"/g);
      if (matches) {
        keywords = matches.map((m) => m.replace(/"/g, ""));
      }
    }

    return Response.json({ keywords });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
