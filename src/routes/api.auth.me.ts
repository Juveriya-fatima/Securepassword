import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { errorResponse, json, requireAuth } from "@/server/http";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { userId } = await requireAuth(request);
          const result = await query<{ id: string; name: string; email: string }>(
            `SELECT id, name, email FROM users WHERE id = $1`,
            [userId],
          );
          const user = result.rows[0];
          if (!user) return json({ error: "Not authenticated." }, { status: 401 });
          return json({ user });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
