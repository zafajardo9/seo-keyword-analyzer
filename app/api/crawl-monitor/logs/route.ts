import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const params = new URL(req.url).searchParams;
    const siteId = params.get("siteId");
    const filter = params.get("filter"); // "ai" | "all"
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
    const offset = (page - 1) * PAGE_SIZE;

    if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });

    const rows =
      filter === "ai"
        ? await sql`
            SELECT id, site_id, path, user_agent, bot_name, bot_company, is_ai_bot, ts
            FROM crawl_logs
            WHERE site_id = ${siteId} AND is_ai_bot = TRUE
            ORDER BY ts DESC
            LIMIT ${PAGE_SIZE} OFFSET ${offset}
          `
        : await sql`
            SELECT id, site_id, path, user_agent, bot_name, bot_company, is_ai_bot, ts
            FROM crawl_logs
            WHERE site_id = ${siteId}
            ORDER BY ts DESC
            LIMIT ${PAGE_SIZE} OFFSET ${offset}
          `;

    const countRows =
      filter === "ai"
        ? await sql`SELECT COUNT(*)::int AS n FROM crawl_logs WHERE site_id = ${siteId} AND is_ai_bot = TRUE`
        : await sql`SELECT COUNT(*)::int AS n FROM crawl_logs WHERE site_id = ${siteId}`;

    const total = (countRows[0]?.n as number) ?? 0;

    return NextResponse.json({
      logs: rows.map((r) => ({
        id: Number(r.id),
        siteId: r.site_id,
        path: r.path,
        userAgent: r.user_agent,
        botName: r.bot_name,
        botCompany: r.bot_company,
        isAiBot: r.is_ai_bot,
        ts: r.ts,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSchema();
    const siteId = new URL(req.url).searchParams.get("siteId");
    if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
    await sql`DELETE FROM crawl_logs WHERE site_id = ${siteId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
