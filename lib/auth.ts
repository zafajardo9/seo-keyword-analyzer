import { createHash, timingSafeEqual } from "crypto";

const AUTH_COOKIE = "seo_auth_token";

function getSecret(): string {
  return process.env.AUTH_SECRET || "default-secret-change-me";
}

export function signToken(username: string): string {
  const secret = getSecret();
  const payload = `${username}:${Date.now()}`;
  const hash = createHash("sha256")
    .update(`${payload}:${secret}`)
    .digest("hex");
  return `${payload}:${hash}`;
}

export function verifyToken(token: string): string | null {
  try {
    const secret = getSecret();
    const parts = token.split(":");
    if (parts.length < 3) return null;
    const hash = parts.pop()!;
    const payload = parts.join(":");
    const expectedHash = createHash("sha256")
      .update(`${payload}:${secret}`)
      .digest("hex");
    const actual = Buffer.from(hash);
    const expected = Buffer.from(expectedHash);
    if (actual.length !== expected.length) return null;
    if (!timingSafeEqual(actual, expected)) return null;
    return parts[0]; // username
  } catch {
    return null;
  }
}

export function validateCredentials(
  username: string,
  password: string,
): boolean {
  const envUser = process.env.AUTH_USERNAME;
  const envPass = process.env.AUTH_PASSWORD;
  if (!envUser || !envPass) return false;
  return username === envUser && password === envPass;
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE;
}
