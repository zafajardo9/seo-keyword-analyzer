import { getGeminiApiKey } from "@/lib/gemini";

export async function GET() {
  try {
    const key = getGeminiApiKey();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Gemini API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();

    const models = (data.models ?? [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string; displayName?: string }) => ({
        id: m.name,
        displayName: m.displayName ?? m.name,
      }));

    return Response.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
