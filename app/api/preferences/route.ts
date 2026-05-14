import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`SELECT model_id, indexnow_state FROM user_preferences WHERE id = 1`;
    const row = rows[0] ?? {};
    return NextResponse.json({
      model: row.model_id ?? "",
      indexnow: row.indexnow_state ?? null,
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
    const model: string | undefined = body?.model;
    const indexnow: unknown = body?.indexnow;

    // Read current to allow partial update
    const rows = await sql`SELECT model_id, indexnow_state FROM user_preferences WHERE id = 1`;
    const current = rows[0] ?? {};

    const nextModel = model !== undefined ? model : current.model_id ?? null;
    const nextIndexnow =
      indexnow !== undefined ? indexnow : current.indexnow_state ?? null;

    await sql`
      INSERT INTO user_preferences (id, model_id, indexnow_state, updated_at)
      VALUES (1, ${nextModel}, ${nextIndexnow ? JSON.stringify(nextIndexnow) : null}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        model_id = EXCLUDED.model_id,
        indexnow_state = EXCLUDED.indexnow_state,
        updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
