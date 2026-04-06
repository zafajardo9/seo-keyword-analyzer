import * as cheerio from "cheerio";
import { ScrapedContent } from "@/lib/types";

export async function scrapePage(url: string): Promise<ScrapedContent> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
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
    throw new Error(`Failed to fetch page: HTTP ${res.status}`);
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
    const text = $(el).text().trim();
    if (text) h1s.push(text);
  });

  const h2s: string[] = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });

  const h3s: string[] = [];
  $("h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h3s.push(text);
  });

  const paragraphs: string[] = [];
  $("p, li, td, th").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 30) paragraphs.push(text);
  });

  return {
    url,
    title,
    description,
    headings: { h1: h1s, h2: h2s, h3: h3s },
    bodyText: paragraphs.slice(0, 40).join(" "),
  };
}
