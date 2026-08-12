import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { hashSecret } from "@/server/argon2";
import { ApiError, errorResponse, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { registerSchema } from "@/server/validation";
import { createSession, SESSION_TTL_SECONDS } from "@/server/session";
import { buildSessionCookie } from "@/server/cookies";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          rateLimit(request, "register", 10, 60_000);

          const body = registerSchema.parse(await request.json());

          const existing = await query(`SELECT id FROM users WHERE email_lower = $1`, [
            body.email.toLowerCase(),
          ]);
          if (existing.rows.length > 0) {
            // Same generic message as any other validation failure — avoid
            // confirming exact reason to reduce account-enumeration signal.
            throw new ApiError(409, "Could not create account with those details.");
          }

          // authKey never reveals the password or Master Key; hashing it again
          // server-side means even a stolen DB doesn't yield a directly-usable
          // login credential.
          const authHash = await hashSecret(body.authKey);
          const recoveryVerifierHash = await hashSecret(body.recoveryKeyVerifier);

          const result = await query<{ id: string }>(
            `INSERT INTO users (
           name, email, kdf_salt, auth_hash,
           vault_key_wrapped, vault_key_wrap_iv,
           recovery_key_wrapped, recovery_key_wrap_iv, recovery_key_verifier
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
            [
              body.name,
              body.email,
              body.kdfSalt,
              authHash,
              body.vaultKeyWrapped,
              body.vaultKeyWrapIv,
              body.recoveryKeyWrapped,
              body.recoveryKeyWrapIv,
              recoveryVerifierHash,
            ],
          );

          const userId = result.rows[0]!.id;
          const { token } = await createSession(userId, request.headers.get("user-agent"));

          return json(
            { id: userId, name: body.name, email: body.email },
            {
              status: 201,
              headers: { "set-cookie": buildSessionCookie(token, SESSION_TTL_SECONDS) },
            },
          );
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
