import { conductMarketResearch } from "@/lib/market-research";

export async function POST(request: Request) {
  try {
    const { url, model, apiKey, industry } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "url is required" },
        { status: 400 },
      );
    }

    if (!model || typeof model !== "string") {
      return Response.json(
        { error: "model is required" },
        { status: 400 },
      );
    }

    const report = await conductMarketResearch(url, model, apiKey, industry);
    return Response.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /Invalid URL|Failed to fetch page/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
