export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

import { sql, ensureSchema } from "@/lib/db";

let cachedDbGeminiKey: string | null = null;
let cachedDbFirecrawlKey: string | null = null;
let dbKeysLoadedAt = 0;
const DB_KEYS_TTL_MS = 30_000;

async function loadDbKeys(): Promise<void> {
  if (Date.now() - dbKeysLoadedAt < DB_KEYS_TTL_MS) return;
  try {
    await ensureSchema();
    const rows =
      await sql`SELECT gemini_key, firecrawl_key FROM api_keys WHERE id = 1`;
    const row = rows[0];
    cachedDbGeminiKey = (row?.gemini_key as string) || null;
    cachedDbFirecrawlKey = (row?.firecrawl_key as string) || null;
    dbKeysLoadedAt = Date.now();
  } catch {
    // DB unreachable — leave previous cache values alone, fall back to env
  }
}

export async function getGeminiApiKey(override?: string): Promise<string> {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;

  await loadDbKeys();
  if (cachedDbGeminiKey && cachedDbGeminiKey.trim()) {
    return cachedDbGeminiKey.trim();
  }

  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey) return envKey;

  throw new Error("GEMINI_API_KEY is not configured");
}

export async function getFirecrawlApiKeyFromDbOrEnv(
  override?: string,
): Promise<string | null> {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;

  await loadDbKeys();
  if (cachedDbFirecrawlKey && cachedDbFirecrawlKey.trim()) {
    return cachedDbFirecrawlKey.trim();
  }

  const envKey = process.env.FIRECRAWL_API_KEY?.trim();
  return envKey || null;
}

/** Force a refresh of the DB-cached keys (call after the user updates them). */
export function invalidateDbKeyCache(): void {
  dbKeysLoadedAt = 0;
}

export async function generateGeminiText(
  model: string,
  prompt: string,
  key: string | undefined,
  generationConfig: GeminiGenerationConfig,
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
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export interface GeminiSearchResult {
  text: string;
  searchQueries: string[];
}

/**
 * Calls Gemini with Google Search grounding enabled.
 * Gemini will automatically run Google searches to ground its response
 * in real, current web data before answering.
 *
 * Note: `google_search_retrieval` has been deprecated by Google.
 * All models now use the `google_search` tool exclusively.
 */
export async function generateGeminiTextWithSearch(
  model: string,
  prompt: string,
  key: string | undefined,
  generationConfig: GeminiGenerationConfig,
): Promise<GeminiSearchResult> {
  const modelId = model.replace("models/", "");

  // All Gemini models now use the unified google_search tool
  const searchTool = { google_search: {} };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [searchTool],
        generationConfig,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (search): ${err}`);
  }

  const data = await res.json();

  // Extract the text — when grounding is active the response may have multiple parts
  const parts: Array<{ text?: string }> =
    data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");

  // Extract the queries Gemini actually ran against Google
  const searchQueries: string[] =
    data?.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];

  return { text, searchQueries };
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
