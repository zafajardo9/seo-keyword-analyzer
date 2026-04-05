import * as cheerio from "cheerio";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "A valid URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json({ error: "Only HTTP and HTTPS URLs are supported" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOAnalyzerBot/1.0; +https://seo-analyzer.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch page: HTTP ${res.status}` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, iframe, nav, footer, aside").remove();

    const title = $("title").first().text().trim();
    const description =
      $('meta[name="description"]').attr("content")?.trim() ??
      $('meta[property="og:description"]').attr("content")?.trim() ??
      "";

    const h1s: string[] = [];
    $("h1").each((_, el) => {
      const t = $(el).text().trim();
      if (t) h1s.push(t);
    });

    const h2s: string[] = [];
    $("h2").each((_, el) => {
      const t = $(el).text().trim();
      if (t) h2s.push(t);
    });

    const h3s: string[] = [];
    $("h3").each((_, el) => {
      const t = $(el).text().trim();
      if (t) h3s.push(t);
    });

    const paragraphs: string[] = [];
    $("p, li, td, th").each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 30) paragraphs.push(t);
    });

    const bodyText = paragraphs.slice(0, 40).join(" ");

    return Response.json({
      url,
      title,
      description,
      headings: { h1: h1s, h2: h2s, h3: h3s },
      bodyText,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
