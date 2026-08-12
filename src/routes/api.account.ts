import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { errorResponse, json, requireAuth } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { accountUpdateSchema } from "@/server/validation";
import { buildExpiredSessionCookie } from "@/server/cookies";
import { destroyAllSessionsForUser } from "@/server/session";

export const Route = createFileRoute("/api/account")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        try {
          const { userId } = await requireAuth(request);
          rateLimit(request, "account-update", 20, 60_000);

          const body = accountUpdateSchema.parse(await request.json());
          const result = await query<{ id: string; name: string; email: string }>(
            `UPDATE users SET name = $1, updated_at = now() WHERE id = $2
         RETURNING id, name, email`,
            [body.name, userId],
          );
          return json({ user: result.rows[0] });
        } catch (err) {
          return errorResponse(err);
        }
      },

      DELETE: async ({ request }) => {
        try {
          const { userId } = await requireAuth(request);
          rateLimit(request, "account-delete", 5, 60_000);

          // ON DELETE CASCADE on sessions/vault_entries removes everything that
          // belongs to this user; no separate row belongs to anyone else, so
          // there is nothing here that could reach another user's data.
          await query(`DELETE FROM users WHERE id = $1`, [userId]);
          await destroyAllSessionsForUser(userId);

          return json({ ok: true }, { headers: { "set-cookie": buildExpiredSessionCookie() } });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
