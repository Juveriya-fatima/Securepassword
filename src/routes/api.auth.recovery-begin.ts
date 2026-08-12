import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { preloginSchema } from "@/server/validation";

export const Route = createFileRoute("/api/auth/recovery-begin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          rateLimit(request, "recovery-begin", 10, 60_000);
          const body = preloginSchema.parse(await request.json());

          const result = await query<{
            recovery_key_wrapped: string;
            recovery_key_wrap_iv: string;
          }>(
            `SELECT recovery_key_wrapped, recovery_key_wrap_iv FROM users WHERE email_lower = $1`,
            [body.email.toLowerCase()],
          );
          const row = result.rows[0];

          if (!row) return json({ found: false });

          // The wrapped blob is useless without the user's actual Recovery Key,
          // so it's safe to hand back here — unwrapping happens entirely client-side.
          return json({
            found: true,
            recoveryKeyWrapped: row.recovery_key_wrapped,
            recoveryKeyWrapIv: row.recovery_key_wrap_iv,
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
