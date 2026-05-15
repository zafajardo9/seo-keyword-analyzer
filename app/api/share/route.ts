import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateShareKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 10; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { tool, label, payload } = body;

    if (!tool || typeof tool !== "string") {
      return NextResponse.json({ error: "Missing tool" }, { status: 400 });
    }
    if (!label || typeof label !== "string") {
      return NextResponse.json({ error: "Missing label" }, { status: 400 });
    }
    if (!payload) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const shareKey = generateShareKey();

    await sql`
      INSERT INTO shared_reports (share_key, tool, label, payload, view_count, created_at)
      VALUES (${shareKey}, ${tool}, ${label}, ${JSON.stringify(payload)}::jsonb, 0, NOW())
    `;

    return NextResponse.json({ shareKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const shareKey = new URL(req.url).searchParams.get("key");

    if (!shareKey) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const rows = await sql`
      SELECT share_key, tool, label, payload, view_count, created_at
      FROM shared_reports
      WHERE share_key = ${shareKey}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Increment view count asynchronously (don't await)
    sql`
      UPDATE shared_reports SET view_count = view_count + 1 WHERE share_key = ${shareKey}
    `.catch(() => {});

    const row = rows[0];
    return NextResponse.json({
      shareKey: row.share_key,
      tool: row.tool,
      label: row.label,
      payload: row.payload,
      viewCount: row.view_count,
      createdAt: row.created_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
