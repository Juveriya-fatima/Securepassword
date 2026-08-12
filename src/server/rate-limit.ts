import { ApiError } from "./http";

/**
 * Simple in-memory fixed-window rate limiter, keyed by IP + bucket name.
 *
 * Limitation: this state lives in a single Node process's memory. It's
 * sufficient for a single-instance deployment; if you run multiple server
 * instances behind a load balancer, replace this with a shared store
 * (e.g. Redis) so limits are enforced across all of them.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: Request, name: string, limit: number, windowMs: number) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const key = `${name}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new ApiError(429, "Too many attempts. Please wait a moment and try again.");
  }
}
