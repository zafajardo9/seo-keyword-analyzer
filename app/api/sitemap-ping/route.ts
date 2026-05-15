import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Engines that support sitemap ping
const PING_ENGINES: Record<string, string> = {
  google: "https://www.google.com/ping?sitemap=",
  bing: "https://www.bing.com/ping?sitemap=",
};

export async function POST(request: Request) {
  let body: { sitemapUrl?: string; engines?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sitemapUrl = body.sitemapUrl?.trim();
  const engines = body.engines ?? ["google", "bing"];

  if (!sitemapUrl) {
    return NextResponse.json({ error: "sitemapUrl is required." }, { status: 400 });
  }

  try {
    new URL(sitemapUrl);
  } catch {
    return NextResponse.json({ error: "sitemapUrl must be a valid URL." }, { status: 400 });
  }

  const results: Record<string, { status: number | null; ok: boolean; error?: string }> = {};

  await Promise.all(
    engines.map(async (engine) => {
      const base = PING_ENGINES[engine];
      if (!base) {
        results[engine] = { status: null, ok: false, error: "Unknown engine." };
        return;
      }
      const pingUrl = `${base}${encodeURIComponent(sitemapUrl)}`;
      try {
        const res = await fetch(pingUrl, {
          method: "GET",
          headers: { "User-Agent": "SitemapPinger/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        results[engine] = { status: res.status, ok: res.status === 200 };
      } catch (err) {
        results[engine] = {
          status: null,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return NextResponse.json({ sitemapUrl, results });
}
