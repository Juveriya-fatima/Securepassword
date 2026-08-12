import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { verifySecret } from "@/server/argon2";
import { ApiError, errorResponse, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/server/validation";
import { createSession, SESSION_TTL_SECONDS } from "@/server/session";
import { buildSessionCookie } from "@/server/cookies";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Tight limit: this is the endpoint an offline/online guesser would hit.
          rateLimit(request, "login", 8, 60_000);

          const body = loginSchema.parse(await request.json());

          const result = await query<{
            id: string;
            name: string;
            email: string;
            auth_hash: string;
            vault_key_wrapped: string;
            vault_key_wrap_iv: string;
          }>(
            `SELECT id, name, email, auth_hash, vault_key_wrapped, vault_key_wrap_iv
         FROM users WHERE email_lower = $1`,
            [body.email.toLowerCase()],
          );
          const user = result.rows[0];

          // Same generic error whether the email doesn't exist or the key is
          // wrong — never reveal which one it was.
          const genericError = () => new ApiError(401, "Incorrect email or password.");

          if (!user) throw genericError();

          const valid = await verifySecret(body.authKey, user.auth_hash);
          if (!valid) throw genericError();

          const { token } = await createSession(user.id, request.headers.get("user-agent"));

          return json(
            {
              user: { id: user.id, name: user.name, email: user.email },
              vaultKeyWrapped: user.vault_key_wrapped,
              vaultKeyWrapIv: user.vault_key_wrap_iv,
            },
            { headers: { "set-cookie": buildSessionCookie(token, SESSION_TTL_SECONDS) } },
          );
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
