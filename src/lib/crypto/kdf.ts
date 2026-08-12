import { argon2id } from "hash-wasm";
import { base64ToBytes, bytesToBase64, utf8ToBytes } from "./encoding";

export type KdfParams = {
  kdfSalt: string; // base64
  kdfIterations: number;
  kdfMemoryKib: number;
  kdfParallelism: number;
};

export const DEFAULT_KDF_PARAMS = {
  kdfIterations: 3,
  kdfMemoryKib: 65536, // 64 MiB — chosen to stay reasonable on-device (mobile browsers included)
  kdfParallelism: 1,
};

/**
 * Derives the Master Key from the user's password. This runs entirely in the
 * browser (WASM Argon2id — the Web Crypto API itself has no Argon2 support).
 * The password never leaves this function; only the resulting key material
 * is used downstream, and only ever to wrap/unwrap the Vault Key locally.
 */
export async function deriveMasterKeyBits(
  password: string,
  params: KdfParams,
): Promise<Uint8Array> {
  const bytes = await argon2id({
    password,
    salt: base64ToBytes(params.kdfSalt),
    iterations: params.kdfIterations,
    memorySize: params.kdfMemoryKib,
    parallelism: params.kdfParallelism,
    hashLength: 32,
    outputType: "binary",
  });
  return bytes;
}

export function generateKdfSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToBase64(salt);
}

/**
 * Imports raw key bytes as an AES-GCM key. By default the key is
 * non-extractable, meaning the browser will refuse to ever hand the raw
 * bytes back out via the SubtleCrypto API once imported. This is used for
 * the Master Key (derived from the password), which never needs to be
 * exported — it only ever wraps/unwraps the Vault Key locally.
 *
 * Pass `extractable: true` for keys that legitimately need to be exported
 * later (e.g. the Vault Key, which must be re-wrapped under a new Master Key
 * during password change / recovery reset).
 */
export async function importAesKey(
  rawKeyBytes: Uint8Array,
  extractable = false,
): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", rawKeyBytes, { name: "AES-GCM" }, extractable, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Derives a value to send to the server for authentication (authKey), kept
 * cryptographically separate from the Master Key via HKDF with a fixed,
 * public "info" label. Knowing authKey (e.g. from a server compromise)
 * cannot be used to reconstruct the Master Key, and so cannot be used to
 * decrypt the Vault Key or vault entries.
 */
export async function deriveAuthKey(masterKeyBits: Uint8Array): Promise<string> {
  const hkdfKey = await crypto.subtle.importKey("raw", masterKeyBits, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: utf8ToBytes("securepass-auth-key-v1"),
    },
    hkdfKey,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}
