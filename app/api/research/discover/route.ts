import { discoverCompanies } from "@/lib/company-discovery";

export async function POST(request: Request) {
  try {
    const {
      market,
      location,
      industry,
      ageMix = "both",
      contactPreference,
      limit = 25,
      model,
    } = await request.json();

    if (!market || typeof market !== "string") {
      return Response.json({ error: "market is required" }, { status: 400 });
    }

    if (!location || typeof location !== "string") {
      return Response.json({ error: "location is required" }, { status: 400 });
    }

    if (!model || typeof model !== "string") {
      return Response.json({ error: "model is required" }, { status: 400 });
    }

    if (!["both", "emerging", "established"].includes(String(ageMix))) {
      return Response.json(
        { error: "ageMix must be both, emerging, or established" },
        { status: 400 },
      );
    }

    const companies = await discoverCompanies({
      market,
      location,
      industry,
      ageMix,
      contactPreference,
      limit: Number(limit),
      model,
    });

    return Response.json({ companies });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /required|Firecrawl API key|ageMix/.test(message)
      ? 400
      : 500;
    return Response.json({ error: message }, { status });
  }
}
