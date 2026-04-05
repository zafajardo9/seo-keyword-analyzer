export async function GET() {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Gemini API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();

    const models = (data.models ?? [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string; displayName?: string }) => ({
        id: m.name,
        displayName: m.displayName ?? m.name,
      }));

    return Response.json({ models });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
