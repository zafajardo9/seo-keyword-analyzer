import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { invalidateDbKeyCache } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`SELECT gemini_key, firecrawl_key FROM api_keys WHERE id = 1`;
    const row = rows[0] ?? {};
    return NextResponse.json({
      geminiKey: row.gemini_key ?? "",
      firecrawlKey: row.firecrawl_key ?? "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const geminiKey: string | null = body?.geminiKey ?? null;
    const firecrawlKey: string | null = body?.firecrawlKey ?? null;

    await sql`
      INSERT INTO api_keys (id, gemini_key, firecrawl_key, updated_at)
      VALUES (1, ${geminiKey || null}, ${firecrawlKey || null}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        gemini_key = EXCLUDED.gemini_key,
        firecrawl_key = EXCLUDED.firecrawl_key,
        updated_at = NOW()
    `;
    invalidateDbKeyCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
