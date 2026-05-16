import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, name, domain, token, created_at
      FROM connected_sites
      ORDER BY created_at DESC
    `;
    return NextResponse.json({
      sites: rows.map((r) => ({
        id: r.id,
        name: r.name,
        domain: r.domain,
        token: r.token,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const { name, domain } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    const id = `site-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const token = randomBytes(16).toString("hex");

    await sql`
      INSERT INTO connected_sites (id, name, domain, token, created_at)
      VALUES (${id}, ${name.trim()}, ${cleanDomain}, ${token}, NOW())
    `;

    return NextResponse.json({ id, name: name.trim(), domain: cleanDomain, token, createdAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSchema();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await sql`DELETE FROM crawl_logs WHERE site_id = ${id}`;
    await sql`DELETE FROM connected_sites WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
