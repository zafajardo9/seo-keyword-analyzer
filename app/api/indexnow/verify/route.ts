import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { host?: string; key?: string; keyLocation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const host = body.host?.trim();
  const key = body.key?.trim();
  const keyLocation =
    body.keyLocation?.trim() || (host && key ? `https://${host}/${key}.txt` : "");

  if (!host || !key || !keyLocation) {
    return NextResponse.json(
      { error: "host, key, and keyLocation are required." },
      { status: 400 },
    );
  }

  const result = {
    url: keyLocation,
    reachable: false,
    statusCode: null as number | null,
    contentMatch: false,
    contentFound: null as string | null,
    error: null as string | null,
  };

  try {
    const res = await fetch(keyLocation, {
      method: "GET",
      headers: { "User-Agent": "IndexNowVerifier/1.0" },
      // 8-second timeout
      signal: AbortSignal.timeout(8000),
    });

    result.statusCode = res.status;
    result.reachable = res.status === 200;

    if (res.status === 200) {
      const text = (await res.text()).trim();
      result.contentFound = text.slice(0, 200); // don't expose full file
      result.contentMatch = text === key;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
