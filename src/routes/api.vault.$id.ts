import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { ApiError, errorResponse, json, requireAuth } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { parseUuidParam, vaultUpdateSchema } from "@/server/validation";

type VaultRow = {
  id: string;
  user_id: string;
  website_or_service: string;
  username_or_email: string;
  encrypted_password: string;
  encryption_iv: string;
  encryption_version: number;
  strength_score: number;
  created_at: string;
  updated_at: string;
};

function toDto(row: VaultRow) {
  return {
    id: row.id,
    service: row.website_or_service,
    username: row.username_or_email,
    encryptedPassword: row.encrypted_password,
    encryptionIv: row.encryption_iv,
    encryptionVersion: row.encryption_version,
    strengthScore: row.strength_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Loads a vault row by ID and explicitly checks it belongs to `userId`.
 * This check is separate from (in addition to) scoping every query by
 * user_id: even if an ID for another user's record is guessed or edited in
 * a request, the ownership check below rejects it with a 404 (not a 403,
 * to avoid confirming the record exists at all) rather than ever touching it.
 */
async function loadOwnedEntry(id: string, userId: string): Promise<VaultRow> {
  const result = await query<VaultRow>(`SELECT * FROM vault_entries WHERE id = $1`, [id]);
  const row = result.rows[0];
  if (!row || row.user_id !== userId) {
    throw new ApiError(404, "Password not found.");
  }
  return row;
}

export const Route = createFileRoute("/api/vault/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { userId } = await requireAuth(request);
          const id = parseUuidParam(params.id);
          const row = await loadOwnedEntry(id, userId);
          return json({ entry: toDto(row) });
        } catch (err) {
          return errorResponse(err);
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const { userId } = await requireAuth(request);
          rateLimit(request, "vault-update", 60, 60_000);
          const id = parseUuidParam(params.id);
          await loadOwnedEntry(id, userId); // throws 404 if not this user's record

          const body = vaultUpdateSchema.parse(await request.json());
          if (Object.keys(body).length === 0) {
            throw new ApiError(400, "No changes provided.");
          }

          // Both encryptedPassword and encryptionIv must be updated together
          // (a new ciphertext always comes with a fresh IV) or neither.
          const passwordChanged = body.encryptedPassword !== undefined;
          if (passwordChanged !== (body.encryptionIv !== undefined)) {
            throw new ApiError(400, "encryptedPassword and encryptionIv must be updated together.");
          }

          const result = await query<VaultRow>(
            `UPDATE vault_entries SET
           website_or_service = COALESCE($1, website_or_service),
           username_or_email = COALESCE($2, username_or_email),
           encrypted_password = COALESCE($3, encrypted_password),
           encryption_iv = COALESCE($4, encryption_iv),
           updated_at = now()
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
            [
              body.service ?? null,
              body.username ?? null,
              body.encryptedPassword ?? null,
              body.encryptionIv ?? null,
              id,
              userId, // belt-and-suspenders: ownership enforced again at the SQL layer
            ],
          );

          const updated = result.rows[0];
          if (!updated) throw new ApiError(404, "Password not found.");
          return json({ entry: toDto(updated) });
        } catch (err) {
          return errorResponse(err);
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const { userId } = await requireAuth(request);
          rateLimit(request, "vault-delete", 60, 60_000);
          const id = parseUuidParam(params.id);
          await loadOwnedEntry(id, userId);

          await query(`DELETE FROM vault_entries WHERE id = $1 AND user_id = $2`, [id, userId]);
          return json({ ok: true });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
