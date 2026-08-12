import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/server/db";
import { hashSecret, verifySecret } from "@/server/argon2";
import { ApiError, errorResponse, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { recoveryCompleteSchema } from "@/server/validation";
import { destroyAllSessionsForUser } from "@/server/session";

export const Route = createFileRoute("/api/auth/recovery-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          rateLimit(request, "recovery-complete", 6, 60_000);
          const body = recoveryCompleteSchema.parse(await request.json());

          const result = await query<{ id: string; recovery_key_verifier: string }>(
            `SELECT id, recovery_key_verifier FROM users WHERE email_lower = $1`,
            [body.email.toLowerCase()],
          );
          const user = result.rows[0];
          if (!user) throw new ApiError(400, "Recovery could not be completed.");

          // Proves the client actually possessed the correct Recovery Key (it
          // could only have derived a matching verifier by successfully
          // unwrapping the Vault Key) before we let it overwrite login material.
          const validRecovery = await verifySecret(
            body.recoveryKeyVerifier,
            user.recovery_key_verifier,
          );
          if (!validRecovery) throw new ApiError(400, "Recovery could not be completed.");

          const newAuthHash = await hashSecret(body.newAuthKey);
          const newRecoveryVerifierHash = await hashSecret(body.newRecoveryKeyVerifier);

          await query(
            `UPDATE users
         SET kdf_salt = $1, auth_hash = $2,
             vault_key_wrapped = $3, vault_key_wrap_iv = $4,
             recovery_key_wrapped = $5, recovery_key_wrap_iv = $6,
             recovery_key_verifier = $7,
             updated_at = now()
         WHERE id = $8`,
            [
              body.newKdfSalt,
              newAuthHash,
              body.newVaultKeyWrapped,
              body.newVaultKeyWrapIv,
              body.newRecoveryKeyWrapped,
              body.newRecoveryKeyWrapIv,
              newRecoveryVerifierHash,
              user.id,
            ],
          );

          // A password/recovery reset is a good moment to invalidate any other
          // active sessions, in case the original password was compromised.
          await destroyAllSessionsForUser(user.id);

          return json({ ok: true });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
