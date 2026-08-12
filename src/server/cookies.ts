import { env } from "./env";

export const SESSION_COOKIE_NAME = "sp_session";

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie");
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function getSessionTokenFromRequest(request: Request): string | null {
  return parseCookies(request)[SESSION_COOKIE_NAME] ?? null;
}

/**
 * Builds a Set-Cookie header value for the session cookie.
 * - httpOnly: not readable from JavaScript (mitigates XSS token theft).
 * - Secure: only sent over HTTPS in production.
 * - SameSite=Strict: browsers withhold the cookie on any cross-site request,
 *   which is the primary CSRF defense for this app (no separate CSRF token
 *   needed since every state-changing request must originate same-site).
 */
export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (env.isProduction) attrs.push("Secure");
  return attrs.join("; ");
}

export function buildExpiredSessionCookie(): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (env.isProduction) attrs.push("Secure");
  return attrs.join("; ");
}
