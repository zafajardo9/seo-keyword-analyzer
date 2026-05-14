import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 30 * 60 * 1000;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return (u.origin + u.pathname).replace(/\/$/, "") + u.search;
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const params = new URL(req.url).searchParams;
    const url = params.get("url");
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    const key = normalizeUrl(url);
    const rows = await sql`
      SELECT entry_data, timestamp FROM analysis_cache WHERE url = ${key}
    `;
    const row = rows[0];
    if (!row) return NextResponse.json({ entry: null });

    const ts = Number(row.timestamp);
    if (Date.now() - ts > TTL_MS) {
      await sql`DELETE FROM analysis_cache WHERE url = ${key}`;
      return NextResponse.json({ entry: null });
    }
    return NextResponse.json({ entry: row.entry_data });
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
    const entry = body?.entry;
    if (!entry?.url) {
      return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
    }
    const key = normalizeUrl(entry.url);
    const ts = typeof entry.timestamp === "number" ? entry.timestamp : Date.now();

    await sql`
      INSERT INTO analysis_cache (url, entry_data, timestamp, created_at)
      VALUES (${key}, ${JSON.stringify(entry)}::jsonb, ${ts}, NOW())
      ON CONFLICT (url) DO UPDATE SET
        entry_data = EXCLUDED.entry_data,
        timestamp = EXCLUDED.timestamp
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSchema();
    const params = new URL(req.url).searchParams;
    const url = params.get("url");
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
    await sql`DELETE FROM analysis_cache WHERE url = ${normalizeUrl(url)}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
