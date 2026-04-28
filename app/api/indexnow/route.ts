import { NextResponse } from "next/server";

const ENDPOINTS: Record<string, string> = {
  indexnow: "https://api.indexnow.org/IndexNow",
  bing: "https://www.bing.com/indexnow",
  yandex: "https://yandex.com/indexnow",
  naver: "https://searchadvisor.naver.com/indexnow",
  seznam: "https://search.seznam.cz/indexnow",
  yep: "https://indexnow.yep.com/indexnow",
};

interface IndexNowBody {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
  engine?: keyof typeof ENDPOINTS;
}

function isValidKey(key: string): boolean {
  // 8–128 hex chars only
  return /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: IndexNowBody;
  try {
    body = (await request.json()) as IndexNowBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const host = body.host?.trim();
  const key = body.key?.trim();
  const keyLocation = body.keyLocation?.trim();
  const urlList = Array.isArray(body.urlList)
    ? body.urlList.map((u) => u.trim()).filter(Boolean)
    : [];
  const engine = (body.engine ?? "indexnow") as keyof typeof ENDPOINTS;

  if (!host) {
    return NextResponse.json({ error: "Host is required." }, { status: 400 });
  }
  if (!key || !isValidKey(key)) {
    return NextResponse.json(
      { error: "Key must be 8–128 alphanumeric characters." },
      { status: 400 },
    );
  }
  if (urlList.length === 0) {
    return NextResponse.json(
      { error: "At least one URL is required." },
      { status: 400 },
    );
  }
  if (urlList.length > 10000) {
    return NextResponse.json(
      { error: "IndexNow accepts at most 10,000 URLs per request." },
      { status: 400 },
    );
  }

  const invalidUrl = urlList.find((u) => !isValidUrl(u));
  if (invalidUrl) {
    return NextResponse.json(
      { error: `Invalid URL in list: ${invalidUrl}` },
      { status: 400 },
    );
  }

  // Verify all URLs share the same host as the declared host
  const hostMismatch = urlList.find((u) => {
    try {
      return new URL(u).host !== host;
    } catch {
      return true;
    }
  });
  if (hostMismatch) {
    return NextResponse.json(
      {
        error: `URL host does not match declared host (${host}): ${hostMismatch}`,
      },
      { status: 400 },
    );
  }

  if (keyLocation && !isValidUrl(keyLocation)) {
    return NextResponse.json(
      { error: "keyLocation must be a valid http(s) URL." },
      { status: 400 },
    );
  }

  const endpoint = ENDPOINTS[engine] ?? ENDPOINTS.indexnow;

  const payload: Record<string, unknown> = {
    host,
    key,
    urlList,
  };
  if (keyLocation) payload.keyLocation = keyLocation;

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to reach IndexNow endpoint.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();

  // IndexNow status codes:
  // 200 OK, 202 Accepted (key validation pending), 400, 403, 422, 429
  return NextResponse.json(
    {
      ok: upstream.ok,
      status: upstream.status,
      statusText: upstream.statusText,
      endpoint,
      response: text || null,
      submitted: urlList.length,
    },
    { status: upstream.ok ? 200 : upstream.status },
  );
}
