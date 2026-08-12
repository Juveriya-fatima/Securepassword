import { base64ToBytes, bytesToBase64, bytesToUtf8, randomBytes, utf8ToBytes } from "./encoding";

export type Ciphertext = { ciphertext: string; iv: string };

/**
 * Encrypts UTF-8 text with AES-256-GCM under the given key. A fresh random
 * 12-byte IV/nonce is generated for every single call — required for GCM
 * security, and explicitly required by this project's spec.
 */
export async function encryptString(plaintext: string, key: CryptoKey): Promise<Ciphertext> {
  const iv = randomBytes(12);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8ToBytes(plaintext),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptString(payload: Ciphertext, key: CryptoKey): Promise<string> {
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  );
  return bytesToUtf8(new Uint8Array(plaintextBuffer));
}

/** Encrypts raw key bytes (used to wrap the Vault Key under another key). */
export async function encryptBytes(plainBytes: Uint8Array, key: CryptoKey): Promise<Ciphertext> {
  const iv = randomBytes(12);
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptBytes(payload: Ciphertext, key: CryptoKey): Promise<Uint8Array> {
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  );
  return new Uint8Array(plaintextBuffer);
}
