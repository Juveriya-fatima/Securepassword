import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { query } from "./db";
import { env } from "./env";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

// The raw token lives only in the user's browser cookie. We store an HMAC of
// it (keyed by SESSION_SECRET) so a stolen/leaked database alone doesn't hand
// an attacker a usable session token.
function hashToken(token: string): string {
  return createHmac("sha256", env.sessionSecret).update(token).digest("hex");
}

export async function createSession(
  userId: string,
  userAgent: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, userAgent, expiresAt],
  );

  return { token, expiresAt };
}

export async function resolveSession(token: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);
  const result = await query<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM sessions WHERE token_hash = $1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Expired — clean it up lazily and treat as unauthenticated.
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
    return null;
  }
  return { userId: row.user_id };
}

export async function destroySession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

/** Constant-time string compare, used for the recovery-key verifier check. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
