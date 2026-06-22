import { generateGeminiTextWithSearch, getGeminiApiKey, classifyApiError } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { query, model, apiKey } = await request.json();
    const key = await getGeminiApiKey(apiKey);

    if (!query || !model) {
      return Response.json({ error: "query and model are required" }, { status: 400 });
    }

    const prompt = `You are a helpful research assistant with access to Google Search. Answer the following question thoroughly using current web search results.

Question: ${String(query).trim()}

Guidelines:
- Search Google for the most current and relevant information
- Synthesize information from multiple sources
- Cite specific sources, dates, and studies where possible
- If there are conflicting viewpoints, present them fairly
- Keep the answer well-structured but conversational
- Be honest if a question can't be fully answered from search results`;

    const { text, searchQueries } = await generateGeminiTextWithSearch(model, prompt, key, {
      temperature: 0.4,
      maxOutputTokens: 4096,
    });

    return Response.json({ result: text, searchQueries });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const classified = classifyApiError(message);
    return Response.json(
      { error: classified.error, detail: classified.detail },
      { status: classified.status },
    );
  }
}
