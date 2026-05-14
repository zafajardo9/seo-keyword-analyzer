import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HISTORY = 8;

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT run_data FROM company_research_runs
      ORDER BY updated_at DESC
      LIMIT ${MAX_HISTORY}
    `;
    return NextResponse.json({
      runs: rows.map((r) => r.run_data),
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
    const run = body?.run;
    if (!run || typeof run.id !== "string") {
      return NextResponse.json({ error: "Invalid run payload" }, { status: 400 });
    }

    await sql`
      INSERT INTO company_research_runs (id, run_data, created_at, updated_at)
      VALUES (${run.id}, ${JSON.stringify(run)}::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        run_data = EXCLUDED.run_data,
        updated_at = NOW()
    `;

    // Trim history to MAX_HISTORY
    await sql`
      DELETE FROM company_research_runs
      WHERE id NOT IN (
        SELECT id FROM company_research_runs
        ORDER BY updated_at DESC
        LIMIT ${MAX_HISTORY}
      )
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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await sql`DELETE FROM company_research_runs WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
