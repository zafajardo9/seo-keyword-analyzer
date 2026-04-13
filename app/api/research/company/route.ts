import { researchCompanyWebsite } from "@/lib/company-research";

export async function POST(request: Request) {
  try {
    const { url, model } = await request.json();

    if (!url || typeof url !== "string" || !model || typeof model !== "string") {
      return Response.json(
        { error: "url and model are required" },
        { status: 400 },
      );
    }

    const company = await researchCompanyWebsite(url, model);
    return Response.json({ company });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /valid URL|HTTP and HTTPS|Failed to fetch page|Invalid URL|HTML page/.test(
      message,
    )
      ? 400
      : 500;

    return Response.json({ error: message }, { status });
  }
}

