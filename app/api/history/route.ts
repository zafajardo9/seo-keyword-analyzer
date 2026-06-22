import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PER_TOOL = 50;

const ALLOWED_TOOLS = new Set([
  "relevance",
  "battle",
  "market-research",
  "indexnow",
  "company-research",
  "geo-aeo",
  "google-indexing",
  "prompt-analyzer",
  "content-optimizer",
  "content-strategy",
  "content-brief",
  "seo-validation",
]);

function validateTool(tool: string | null): string | null {
  if (!tool || !ALLOWED_TOOLS.has(tool)) return null;
  return tool;
}

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const params = new URL(req.url).searchParams;
    const tool = validateTool(params.get("tool"));
    if (!tool) {
      return NextResponse.json(
        { error: "Invalid or missing tool" },
        { status: 400 },
      );
    }

    const rows = await sql`
      SELECT id, tool, label, payload, created_at, updated_at
      FROM tool_history
      WHERE tool = ${tool}
      ORDER BY updated_at DESC
      LIMIT ${MAX_PER_TOOL}
    `;

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        tool: r.tool,
        label: r.label,
        payload: r.payload,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
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
    const tool = validateTool(body?.tool);
    const label: string | undefined = body?.label;
    const payload: unknown = body?.payload;
    const providedId: string | undefined = body?.id;

    if (!tool) {
      return NextResponse.json(
        { error: "Invalid or missing tool" },
        { status: 400 },
      );
    }
    if (!label || typeof label !== "string") {
      return NextResponse.json({ error: "Missing label" }, { status: 400 });
    }
    if (payload === undefined || payload === null) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const id =
      providedId ||
      `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await sql`
      INSERT INTO tool_history (id, tool, label, payload, created_at, updated_at)
      VALUES (${id}, ${tool}, ${label}, ${JSON.stringify(payload)}::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        payload = EXCLUDED.payload,
        updated_at = NOW()
    `;

    // Trim to MAX_PER_TOOL
    await sql`
      DELETE FROM tool_history
      WHERE tool = ${tool}
        AND id NOT IN (
          SELECT id FROM tool_history
          WHERE tool = ${tool}
          ORDER BY updated_at DESC
          LIMIT ${MAX_PER_TOOL}
        )
    `;

    return NextResponse.json({ ok: true, id });
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
    const id = params.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await sql`DELETE FROM tool_history WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
