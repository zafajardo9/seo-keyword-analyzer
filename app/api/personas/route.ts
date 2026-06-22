import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, name, description, tone, audience, guidelines, created_at
      FROM personas
      ORDER BY created_at DESC
    `;
    return NextResponse.json({
      personas: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        tone: r.tone,
        audience: r.audience,
        guidelines: r.guidelines ?? [],
        createdAt: r.created_at,
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
    const { name, description, tone, audience, guidelines } = await req.json();

    if (!name || !tone) {
      return NextResponse.json(
        { error: "Name and tone are required" },
        { status: 400 },
      );
    }

    const id = `persona-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO personas (id, name, description, tone, audience, guidelines, created_at)
      VALUES (${id}, ${name}, ${description ?? ""}, ${tone}, ${audience ?? ""}, ${JSON.stringify(guidelines ?? [])}::jsonb, NOW())
    `;

    return NextResponse.json({
      persona: {
        id,
        name,
        description: description ?? "",
        tone,
        audience: audience ?? "",
        guidelines: guidelines ?? [],
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSchema();
    const { id, name, description, tone, audience, guidelines } =
      await req.json();

    if (!id || !name || !tone) {
      return NextResponse.json(
        { error: "id, name, and tone are required" },
        { status: 400 },
      );
    }

    await sql`
      UPDATE personas
      SET name = ${name},
          description = ${description ?? ""},
          tone = ${tone},
          audience = ${audience ?? ""},
          guidelines = ${JSON.stringify(guidelines ?? [])}::jsonb
      WHERE id = ${id}
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
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await sql`DELETE FROM personas WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
