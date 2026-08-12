import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { errorResponse, json, requireAuth } from "@/server/http";

// Returns only ciphertext + public KDF parameters — never anything that lets
// the server (or a network observer) derive the Vault Key itself. This is
// what lets an already-valid session re-derive the Vault Key locally after a
// full page reload, without re-submitting the password to the server.
export const Route = createFileRoute("/api/auth/vault-key-material")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { userId } = await requireAuth(request);
          const result = await query<{
            kdf_salt: string;
            kdf_iterations: number;
            kdf_memory_kib: number;
            kdf_parallelism: number;
            vault_key_wrapped: string;
            vault_key_wrap_iv: string;
          }>(
            `SELECT kdf_salt, kdf_iterations, kdf_memory_kib, kdf_parallelism,
                vault_key_wrapped, vault_key_wrap_iv
         FROM users WHERE id = $1`,
            [userId],
          );
          const row = result.rows[0];
          if (!row) return json({ error: "Not authenticated." }, { status: 401 });

          return json({
            kdfSalt: row.kdf_salt,
            kdfIterations: row.kdf_iterations,
            kdfMemoryKib: row.kdf_memory_kib,
            kdfParallelism: row.kdf_parallelism,
            vaultKeyWrapped: row.vault_key_wrapped,
            vaultKeyWrapIv: row.vault_key_wrap_iv,
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
