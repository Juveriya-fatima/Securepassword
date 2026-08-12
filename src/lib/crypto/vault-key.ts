import { decryptBytes, encryptBytes, type Ciphertext } from "./aes";
import { bytesToBase64, randomBytes } from "./encoding";
import { deriveAuthKey, deriveMasterKeyBits, importAesKey, type KdfParams } from "./kdf";

/** A human-typeable recovery key: 32 random bytes, shown as base64. */
export function generateRecoveryKey(): string {
  return bytesToBase64(randomBytes(32));
}

async function importRecoveryKeyAsAes(recoveryKey: string): Promise<CryptoKey> {
  // The Recovery Key string IS the key material (unlike the password, it's
  // already high-entropy, so no slow KDF is needed — just import it).
  const raw = base64UrlSafeDecode(recoveryKey);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function base64UrlSafeDecode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * A verifier the server can check *before* accepting a recovery-based reset,
 * proving the client holds the real Recovery Key — without the server ever
 * learning the Recovery Key itself. Derived independently of the wrapping
 * key via HKDF-style domain separation (a fixed public label).
 */
async function deriveRecoveryVerifier(recoveryKey: string): Promise<string> {
  const raw = base64UrlSafeDecode(recoveryKey);
  const hkdfKey = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode("securepass-recovery-verifier-v1"),
    },
    hkdfKey,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export type NewAccountCrypto = {
  kdfSalt: string;
  authKey: string;
  vaultKeyWrapped: string;
  vaultKeyWrapIv: string;
  recoveryKeyWrapped: string;
  recoveryKeyWrapIv: string;
  recoveryKeyVerifier: string;
  recoveryKeyToShowUser: string;
  vaultKeyRaw: Uint8Array;
};

/**
 * Everything needed to create a new account: generates a brand-new random
 * Vault Key and a brand-new random Recovery Key, then wraps the Vault Key
 * under both the (password-derived) Master Key and the Recovery Key.
 */
export async function setupNewAccountCrypto(
  password: string,
  kdfSalt: string,
  kdfParams: Omit<KdfParams, "kdfSalt">,
): Promise<NewAccountCrypto> {
  const vaultKeyRaw = randomBytes(32); // crypto.getRandomValues, never Math.random()
  const masterKeyBits = await deriveMasterKeyBits(password, { kdfSalt, ...kdfParams });
  const masterAesKey = await importAesKey(masterKeyBits);
  const authKey = await deriveAuthKey(masterKeyBits);

  const recoveryKeyToShowUser = generateRecoveryKey();
  const recoveryAesKey = await importRecoveryKeyAsAes(recoveryKeyToShowUser);
  const recoveryKeyVerifier = await deriveRecoveryVerifier(recoveryKeyToShowUser);

  const vaultWrap = await encryptBytes(vaultKeyRaw, masterAesKey);
  const recoveryWrap = await encryptBytes(vaultKeyRaw, recoveryAesKey);

  return {
    kdfSalt,
    authKey,
    vaultKeyWrapped: vaultWrap.ciphertext,
    vaultKeyWrapIv: vaultWrap.iv,
    recoveryKeyWrapped: recoveryWrap.ciphertext,
    recoveryKeyWrapIv: recoveryWrap.iv,
    recoveryKeyVerifier,
    recoveryKeyToShowUser,
    vaultKeyRaw,
  };
}

/** Login: derive Master Key from password, use it to unwrap the stored Vault Key. */
export async function unlockWithPassword(
  password: string,
  kdfParams: KdfParams,
  wrapped: Ciphertext,
): Promise<{ vaultKeyRaw: Uint8Array; authKey: string }> {
  const masterKeyBits = await deriveMasterKeyBits(password, kdfParams);
  const masterAesKey = await importAesKey(masterKeyBits);
  const authKey = await deriveAuthKey(masterKeyBits);
  const vaultKeyRaw = await decryptBytes(wrapped, masterAesKey);
  return { vaultKeyRaw, authKey };
}

/** Recovery: unwrap the Vault Key using the Recovery Key instead of the password. */
export async function unlockWithRecoveryKey(
  recoveryKey: string,
  wrapped: Ciphertext,
): Promise<Uint8Array> {
  const recoveryAesKey = await importRecoveryKeyAsAes(recoveryKey);
  return decryptBytes(wrapped, recoveryAesKey);
}

export { deriveRecoveryVerifier };

/** Re-wrap an existing Vault Key under a newly-derived Master Key (password change / recovery reset). */
export async function rewrapVaultKeyForNewPassword(
  vaultKeyRaw: Uint8Array,
  newPassword: string,
  newKdfSalt: string,
  kdfParams: Omit<KdfParams, "kdfSalt">,
): Promise<{
  newKdfSalt: string;
  newAuthKey: string;
  newVaultKeyWrapped: string;
  newVaultKeyWrapIv: string;
}> {
  const masterKeyBits = await deriveMasterKeyBits(newPassword, {
    kdfSalt: newKdfSalt,
    ...kdfParams,
  });
  const masterAesKey = await importAesKey(masterKeyBits);
  const newAuthKey = await deriveAuthKey(masterKeyBits);
  const wrap = await encryptBytes(vaultKeyRaw, masterAesKey);
  return {
    newKdfSalt,
    newAuthKey,
    newVaultKeyWrapped: wrap.ciphertext,
    newVaultKeyWrapIv: wrap.iv,
  };
}

/** Re-wrap an existing Vault Key under a brand-new Recovery Key (used after any reset, so recovery keeps working). */
export async function rewrapVaultKeyWithNewRecoveryKey(vaultKeyRaw: Uint8Array): Promise<{
  recoveryKeyToShowUser: string;
  newRecoveryKeyWrapped: string;
  newRecoveryKeyWrapIv: string;
  newRecoveryKeyVerifier: string;
}> {
  const recoveryKeyToShowUser = generateRecoveryKey();
  const recoveryAesKey = await importRecoveryKeyAsAes(recoveryKeyToShowUser);
  const newRecoveryKeyVerifier = await deriveRecoveryVerifier(recoveryKeyToShowUser);
  const wrap = await encryptBytes(vaultKeyRaw, recoveryAesKey);
  return {
    recoveryKeyToShowUser,
    newRecoveryKeyWrapped: wrap.ciphertext,
    newRecoveryKeyWrapIv: wrap.iv,
    newRecoveryKeyVerifier,
  };
}

/**
 * Imports the Vault Key as an *extractable* CryptoKey. Unlike the Master
 * Key, the Vault Key must be exportable: changePassword() and recovery
 * reset both need to pull the raw bytes back out (via crypto.subtle.
 * exportKey) to re-wrap the same Vault Key under a newly-derived Master Key
 * or Recovery Key. This doesn't weaken anything — the raw bytes already
 * pass through plain JS memory immediately before this import.
 */
export async function importVaultKey(vaultKeyRaw: Uint8Array): Promise<CryptoKey> {
  return importAesKey(vaultKeyRaw, true);
}
