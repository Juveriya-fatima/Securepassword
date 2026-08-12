import { z } from "zod";

// Base64 (standard or url-safe) sanity check for opaque crypto material.
// We validate shape/length, never meaning — the server can't and shouldn't
// know what these bytes decrypt to.
const b64 = z.string().min(1).max(4096);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Full name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  kdfSalt: b64,
  authKey: z.string().min(1).max(1024),
  vaultKeyWrapped: b64,
  vaultKeyWrapIv: b64,
  recoveryKeyWrapped: b64,
  recoveryKeyWrapIv: b64,
  recoveryKeyVerifier: z.string().min(1).max(1024),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  authKey: z.string().min(1).max(1024),
});

export const preloginSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const changePasswordSchema = z.object({
  newKdfSalt: b64,
  newAuthKey: z.string().min(1).max(1024),
  newVaultKeyWrapped: b64,
  newVaultKeyWrapIv: b64,
});

export const recoveryCompleteSchema = z.object({
  email: z.string().trim().email().max(320),
  recoveryKeyVerifier: z.string().min(1).max(1024),
  newKdfSalt: b64,
  newAuthKey: z.string().min(1).max(1024),
  newVaultKeyWrapped: b64,
  newVaultKeyWrapIv: b64,
  // Re-wrap the (unchanged) Vault Key under a freshly-derived Recovery Key too,
  // so recovery remains usable after a recovery-based reset.
  newRecoveryKeyWrapped: b64,
  newRecoveryKeyWrapIv: b64,
  newRecoveryKeyVerifier: z.string().min(1).max(1024),
});

export const vaultCreateSchema = z.object({
  service: z.string().trim().min(1, "Website or service is required.").max(200),
  username: z.string().trim().min(1, "Username or email is required.").max(320),
  encryptedPassword: b64,
  encryptionIv: b64,
  strengthScore: z.number().int().min(0).max(4),
});

export const vaultUpdateSchema = z.object({
  service: z.string().trim().min(1).max(200).optional(),
  username: z.string().trim().min(1).max(320).optional(),
  encryptedPassword: b64.optional(),
  encryptionIv: b64.optional(),
  strengthScore: z.number().int().min(0).max(4).optional(),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

const uuid = z.string().uuid();
export function parseUuidParam(value: string | undefined): string {
  const result = uuid.safeParse(value);
  if (!result.success) {
    throw new Response(JSON.stringify({ error: "Invalid ID." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  return result.data;
}
