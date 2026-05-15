import { NextResponse } from "next/server";
import { createSign } from "crypto";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ServiceAccountKey {
  type: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

export interface UrlResult {
  url: string;
  ok: boolean;
  status: number | null;
  notifyTime?: string;
  error?: string;
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(sa.private_key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await tokenRes.json();
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to obtain access token from Google.");
  }
  return data.access_token as string;
}

async function notifyUrl(url: string, accessToken: string, type: "URL_UPDATED" | "URL_DELETED"): Promise<UrlResult> {
  try {
    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url, type }),
    });

    const body = await res.json();

    if (!res.ok) {
      const msg = body?.error?.message || body?.error?.status || `HTTP ${res.status}`;
      return { url, ok: false, status: res.status, error: msg };
    }

    return {
      url,
      ok: true,
      status: res.status,
      notifyTime: body?.urlNotificationMetadata?.latestUpdate?.notifyTime,
    };
  } catch (err) {
    return { url, ok: false, status: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getSaJson(override?: string): Promise<string> {
  if (override?.trim()) return override.trim();
  await ensureSchema();
  const rows = await sql`SELECT google_sa_json FROM api_keys WHERE id = 1`;
  const val = rows[0]?.google_sa_json as string | null;
  if (!val) throw new Error("No Google Service Account key configured. Paste it in Settings first.");
  return val;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const urlList: string[] = Array.isArray(body.urlList)
      ? body.urlList.map((u: string) => u.trim()).filter(Boolean)
      : [];
    const type: "URL_UPDATED" | "URL_DELETED" = body.type === "URL_DELETED" ? "URL_DELETED" : "URL_UPDATED";
    const saJsonOverride: string | undefined = body.saJson;

    if (urlList.length === 0) {
      return NextResponse.json({ error: "At least one URL is required." }, { status: 400 });
    }
    if (urlList.length > 200) {
      return NextResponse.json({ error: "Google Indexing API allows up to 200 URLs per request batch." }, { status: 400 });
    }

    const rawJson = await getSaJson(saJsonOverride);
    let sa: ServiceAccountKey;
    try {
      sa = JSON.parse(rawJson) as ServiceAccountKey;
    } catch {
      return NextResponse.json({ error: "Service account JSON is invalid. Paste the full JSON key file." }, { status: 400 });
    }

    if (!sa.private_key || !sa.client_email) {
      return NextResponse.json({ error: "Service account JSON is missing private_key or client_email." }, { status: 400 });
    }

    const accessToken = await getAccessToken(sa);

    // Process sequentially with a small pause to avoid hammering the API
    const results: UrlResult[] = [];
    for (const url of urlList) {
      results.push(await notifyUrl(url, accessToken, type));
      if (urlList.length > 1) {
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return NextResponse.json({ results, succeeded, total: urlList.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Save service account JSON
export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const saJson: string = body.saJson?.trim() ?? "";

    if (!saJson) {
      await sql`UPDATE api_keys SET google_sa_json = NULL, updated_at = NOW() WHERE id = 1`;
      return NextResponse.json({ ok: true, cleared: true });
    }

    // Validate it parses
    let parsed: ServiceAccountKey;
    try {
      parsed = JSON.parse(saJson);
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    if (!parsed.private_key || !parsed.client_email) {
      return NextResponse.json({ error: "JSON is missing private_key or client_email." }, { status: 400 });
    }

    await sql`
      INSERT INTO api_keys (id, google_sa_json, updated_at)
      VALUES (1, ${saJson}, NOW())
      ON CONFLICT (id) DO UPDATE SET google_sa_json = EXCLUDED.google_sa_json, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true, email: parsed.client_email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// Load saved service account (email only, never expose private key)
export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`SELECT google_sa_json FROM api_keys WHERE id = 1`;
    const raw = rows[0]?.google_sa_json as string | null;
    if (!raw) return NextResponse.json({ configured: false, email: null });
    try {
      const parsed = JSON.parse(raw) as Partial<ServiceAccountKey>;
      return NextResponse.json({ configured: true, email: parsed.client_email ?? null });
    } catch {
      return NextResponse.json({ configured: false, email: null });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
