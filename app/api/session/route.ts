import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const id = generateId();
    await sql`
      INSERT INTO sessions (id, payload, created_at)
      VALUES (${id}, ${JSON.stringify(payload)}::jsonb, NOW())
    `;

    // Clean up sessions older than 1 hour
    sql`
      DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '1 hour'
    `.catch(() => {});

    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const id = new URL(req.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const rows = await sql`
      SELECT payload FROM sessions WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Session not found or expired." },
        { status: 404 },
      );
    }

    return NextResponse.json({ payload: rows[0].payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
