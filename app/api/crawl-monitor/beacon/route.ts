import { sql, ensureSchema } from "@/lib/db";
import { detectAIBot } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

async function logVisit(token: string, path: string, userAgent: string) {
  await ensureSchema();

  const sites = await sql`
    SELECT id FROM connected_sites WHERE token = ${token} LIMIT 1
  `;
  if (!sites.length) return;

  const siteId = sites[0].id as string;
  const bot = detectAIBot(userAgent);

  await sql`
    INSERT INTO crawl_logs (site_id, path, user_agent, bot_name, bot_company, is_ai_bot, ts)
    VALUES (
      ${siteId},
      ${path.slice(0, 500)},
      ${userAgent.slice(0, 500)},
      ${bot?.name ?? null},
      ${bot?.company ?? null},
      ${bot !== null},
      NOW()
    )
  `;
}

// GET — fired by the JS pixel snippet
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const token = params.get("t") ?? "";
  const path = params.get("p") ?? "/";
  const ua = req.headers.get("user-agent") ?? "";

  if (token) {
    logVisit(token, path, ua).catch(() => {});
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// POST — fired by server-side integrations
export async function POST(req: Request) {
  try {
    const { token, path, userAgent } = await req.json();
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Missing token" }, { status: 400 });
    }
    await logVisit(token, path ?? "/", userAgent ?? "");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
