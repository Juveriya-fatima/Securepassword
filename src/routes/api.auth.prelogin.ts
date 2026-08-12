import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { preloginSchema } from "@/server/validation";

// A fixed fallback salt/params so responses for unknown emails take the same
// shape and (roughly) the same time as real ones — reduces, though doesn't
// eliminate, the ability to enumerate registered emails via this endpoint.
const FALLBACK = {
  kdfSalt: "AAAAAAAAAAAAAAAAAAAAAA==",
  kdfAlgorithm: "argon2id",
  kdfIterations: 3,
  kdfMemoryKib: 65536,
  kdfParallelism: 1,
};

export const Route = createFileRoute("/api/auth/prelogin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          rateLimit(request, "prelogin", 20, 60_000);
          const body = preloginSchema.parse(await request.json());

          const result = await query<{
            kdf_salt: string;
            kdf_algorithm: string;
            kdf_iterations: number;
            kdf_memory_kib: number;
            kdf_parallelism: number;
          }>(
            `SELECT kdf_salt, kdf_algorithm, kdf_iterations, kdf_memory_kib, kdf_parallelism
         FROM users WHERE email_lower = $1`,
            [body.email.toLowerCase()],
          );

          const row = result.rows[0];
          if (!row) return json(FALLBACK);

          return json({
            kdfSalt: row.kdf_salt,
            kdfAlgorithm: row.kdf_algorithm,
            kdfIterations: row.kdf_iterations,
            kdfMemoryKib: row.kdf_memory_kib,
            kdfParallelism: row.kdf_parallelism,
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
