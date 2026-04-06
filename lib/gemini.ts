export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return key;
}

export async function generateGeminiText(
  model: string,
  prompt: string,
  key: string,
  generationConfig: GeminiGenerationConfig
): Promise<string> {
  const modelId = model.replace("models/", "");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export function cleanJsonText(rawText: string): string {
  return rawText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

export function parseJsonSafely<T>(rawText: string): T | null {
  const cleaned = cleanJsonText(rawText);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
