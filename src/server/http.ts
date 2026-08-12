import { ZodError } from "zod";
import { getSessionTokenFromRequest } from "./cookies";
import { resolveSession } from "./session";

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      // Defense-in-depth security headers on every API response.
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
      ...init?.headers,
    },
  });
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Never leak internals (stack traces, DB errors) to the client. */
export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return json({ error: first?.message ?? "Invalid request." }, { status: 400 });
  }
  if (err instanceof Response) {
    // parseUuidParam-style pre-built error responses.
    return err;
  }
  // Log full detail server-side only. Never log request bodies containing
  // secrets — callers are responsible for not passing those here.
  console.error("Unhandled API error:", err);
  return json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/**
 * Resolves the authenticated user for this request, or throws a 401.
 * Every vault/account route must call this before touching any data.
 */
export async function requireAuth(request: Request): Promise<{ userId: string }> {
  const token = getSessionTokenFromRequest(request);
  if (!token) throw new ApiError(401, "Not authenticated.");
  const session = await resolveSession(token);
  if (!session) throw new ApiError(401, "Session expired or invalid.");
  return { userId: session.userId };
}
