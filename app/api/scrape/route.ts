import { scrapePage } from "@/lib/scrape-page";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "A valid URL is required" }, { status: 400 });
    }

    const content = await scrapePage(url);
    return Response.json(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /valid URL|HTTP and HTTPS|Failed to fetch page|Invalid URL/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
