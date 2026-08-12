import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/server/http";
import { buildExpiredSessionCookie, getSessionTokenFromRequest } from "@/server/cookies";
import { destroySession } from "@/server/session";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = getSessionTokenFromRequest(request);
          if (token) await destroySession(token);
          return json({ ok: true }, { headers: { "set-cookie": buildExpiredSessionCookie() } });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
