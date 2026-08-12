import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { hashSecret, verifySecret } from "@/server/argon2";
import { ApiError, errorResponse, json, requireAuth } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { changePasswordSchema } from "@/server/validation";
import { z } from "zod";

// The client must prove it knows the *current* password (by sending the
// current authKey) before we accept a re-wrap — otherwise a hijacked session
// alone would let someone lock the real owner out by "changing" the password.
const bodySchema = changePasswordSchema.extend({
  currentAuthKey: z.string().min(1).max(1024),
});

export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { userId } = await requireAuth(request);
          rateLimit(request, "change-password", 6, 60_000);

          const body = bodySchema.parse(await request.json());

          const result = await query<{ auth_hash: string }>(
            `SELECT auth_hash FROM users WHERE id = $1`,
            [userId],
          );
          const user = result.rows[0];
          if (!user) throw new ApiError(401, "Not authenticated.");

          const valid = await verifySecret(body.currentAuthKey, user.auth_hash);
          if (!valid) throw new ApiError(401, "Current password is incorrect.");

          const newAuthHash = await hashSecret(body.newAuthKey);

          // Note what does NOT change: vault_key_wrapped's underlying Vault Key,
          // and the recovery wrapping — only the Master-Key wrapper is replaced.
          // Every existing vault_entries row stays encrypted with the same VK.
          await query(
            `UPDATE users
         SET kdf_salt = $1, auth_hash = $2, vault_key_wrapped = $3, vault_key_wrap_iv = $4,
             updated_at = now()
         WHERE id = $5`,
            [body.newKdfSalt, newAuthHash, body.newVaultKeyWrapped, body.newVaultKeyWrapIv, userId],
          );

          return json({ ok: true });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
