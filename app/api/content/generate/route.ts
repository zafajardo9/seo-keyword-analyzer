import {
  generateGeminiTextWithSearch,
  getGeminiApiKey,
  parseJsonSafely,
  classifyApiError,
} from "@/lib/gemini";
import { GeneratedContent } from "@/lib/types";

interface RawGeneratedContent {
  title: string;
  metaDescription: string;
  content: string;
}

function normalizeContent(
  raw: RawGeneratedContent | null,
  personaName: string,
  topic: string,
): GeneratedContent | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    title: String(raw.title ?? ""),
    metaDescription: String(raw.metaDescription ?? ""),
    content: String(raw.content ?? ""),
    personaName,
    topic,
  };
}

export async function POST(request: Request) {
  try {
    const { topic, persona, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!topic || !persona || !model) {
      return Response.json(
        { error: "topic, persona, and model are required" },
        { status: 400 },
      );
    }

    const personaJson = JSON.stringify(persona, null, 2);

    const prompt = `You are an expert content writer with access to Google Search. Write a complete, well-researched blog post using the following persona's voice and guidelines.

  First, use Google Search to find current data, statistics, recent news, expert opinions, and real-world examples related to the topic. Cite sources inline where relevant (e.g., "According to a 2025 Gartner study...", "The DOJ reported in April 2025...").

  PERSONA:
  ${personaJson}

  TOPIC TO WRITE ABOUT:
  ${String(topic).trim()}

  Return ONLY valid JSON using this exact structure:
  {
    "title": "SEO-optimized blog post title that matches the persona's voice",
    "metaDescription": "Compelling meta description under 160 characters that includes the topic",
    "content": "Full blog post content with HTML formatting (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>) written in the persona's unique voice and style, following all their guidelines. Include an introduction, 3-5 body sections with subheadings, and a conclusion. Reference real sources, data, and examples where applicable."
  }

  Guidelines:
  - Write naturally in the persona's voice, tone, and style
  - Follow all persona guidelines
  - Aim for 1000-2000 words
  - Use proper HTML tags for structure
  - Include the target topic naturally throughout
  - Write for the persona's specified audience
  - Ground claims in real search results — include statistics, dates, study names, and expert quotes with context
  - If you cite a source, make it specific (e.g. "a March 2025 McKinsey report" rather than "research shows")`;

    const { text: rawText } = await generateGeminiTextWithSearch(
      model,
      prompt,
      key,
      {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    );

    const parsed = parseJsonSafely<RawGeneratedContent>(rawText);
    const result = normalizeContent(parsed, persona.name, topic);

    if (!result || !result.content) {
      return Response.json(
        { error: "Failed to generate content" },
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
