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

export interface ApiErrorResponse {
  error: string;
  detail?: string;
  status: number;
}

/**
 * Classify a raw error message into a user-friendly API error response.
 * Returns { error, detail, status } suitable for Response.json.
 */
export function classifyApiError(message: string): ApiErrorResponse {
  // API key not configured at all
  if (message.includes("GEMINI_API_KEY is not configured")) {
    return {
      error:
        "No Gemini API key found. Please add one in the Settings panel (top-right key icon) or set the GEMINI_API_KEY environment variable.",
      detail: message,
      status: 401,
    };
  }

  // Invalid / disabled model
  if (
    /model|not found|not supported|not found for|not enabled/i.test(message) &&
    !/valid url|enough body/i.test(message)
  ) {
    return {
      error:
        "The selected AI model is not available or not enabled for your API key. Try selecting a different model from the dropdown.",
      detail: message,
      status: 400,
    };
  }

  // Invalid API key
  if (
    message.includes("API_KEY_INVALID") ||
    message.includes("API key not valid") ||
    /403/.test(message)
  ) {
    return {
      error:
        "Your Gemini API key is invalid or expired. Go to the Settings panel and update it with a valid key from Google AI Studio.",
      detail: message,
      status: 401,
    };
  }

  // Rate limit / quota exhausted
  if (
    /429|RATE_LIMIT|quota|RESOURCE_EXHAUSTED|too many requests/i.test(message)
  ) {
    return {
      error:
        "You've hit a Gemini API rate limit or quota. Wait a moment and try again. If this persists, check your billing at Google AI Studio.",
      detail: message,
      status: 429,
    };
  }

  // Content / URL issues (user-fixable)
  if (
    /valid URL|HTTP and HTTPS|Failed to fetch page|Invalid URL|enough body content|too short/i.test(
      message,
    )
  ) {
    return { error: message, status: 400 };
  }

  // Network / timeout
  if (
    /timeout|timed out|aborted|fetch failed|ENOTFOUND|ECONNREFUSED|network|econnreset|econnrefused|enotfound/i.test(
      message,
    )
  ) {
    return {
      error:
        "The request timed out or could not reach the Gemini API. Check your internet connection and try again. If your content is very long, try a shorter version.",
      detail: message,
      status: 504,
    };
  }

  // Failed to parse Gemini's response
  if (message.includes("Failed to parse")) {
    return {
      error:
        "The AI returned an unexpected response. This sometimes happens — just try again, or switch to a different model.",
      detail: message,
      status: 500,
    };
  }

  // Gemini returned empty content
  if (message.includes("empty") || message.includes("returned empty")) {
    return {
      error:
        "The AI returned an empty response. Try again with a different model or shorter content.",
      detail: message,
      status: 500,
    };
  }

  // Default fallback
  return {
    error: "Something went wrong. Please try again.",
    detail: message,
    status: 500,
  };
}
