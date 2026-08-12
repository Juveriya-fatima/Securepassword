import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { errorResponse, json, requireAuth } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { vaultCreateSchema } from "@/server/validation";

type VaultRow = {
  id: string;
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

export const Route = createFileRoute("/api/vault")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Every request is scoped with `WHERE user_id = $1` using the
          // authenticated user's ID resolved server-side from the session —
          // never from anything the client claims — so this query can only ever
          // return rows the caller owns.
          const { userId } = await requireAuth(request);

          const url = new URL(request.url);
          const q = url.searchParams.get("q")?.trim() ?? "";

          const result = q
            ? await query<VaultRow>(
                `SELECT id, website_or_service, username_or_email, encrypted_password,
                    encryption_iv, encryption_version, strength_score, created_at, updated_at
             FROM vault_entries
             WHERE user_id = $1
               AND (website_or_service ILIKE '%' || $2 || '%'
                    OR username_or_email ILIKE '%' || $2 || '%')
             ORDER BY created_at DESC`,
                [userId, q],
              )
            : await query<VaultRow>(
                `SELECT id, website_or_service, username_or_email, encrypted_password,
                    encryption_iv, encryption_version, strength_score, created_at, updated_at
             FROM vault_entries WHERE user_id = $1
             ORDER BY created_at DESC`,
                [userId],
              );

          return json({ entries: result.rows.map(toDto) });
        } catch (err) {
          return errorResponse(err);
        }
      },

      POST: async ({ request }) => {
        try {
          const { userId } = await requireAuth(request);
          rateLimit(request, "vault-create", 60, 60_000);

          const body = vaultCreateSchema.parse(await request.json());

          const result = await query<VaultRow>(
            `INSERT INTO vault_entries
           (user_id, website_or_service, username_or_email, encrypted_password, encryption_iv, strength_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, website_or_service, username_or_email, encrypted_password,
                   encryption_iv, encryption_version, strength_score, created_at, updated_at`,
            [
              userId,
              body.service,
              body.username,
              body.encryptedPassword,
              body.encryptionIv,
              body.strengthScore,
            ],
          );

          return json({ entry: toDto(result.rows[0]!) }, { status: 201 });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
