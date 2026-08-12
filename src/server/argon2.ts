import { hash, verify } from "@node-rs/argon2";

// These parameters hash a value the server receives (the client's authKey,
// or a value derived from the Recovery Key) — NOT the user's raw password,
// which never reaches the server. Argon2id, OWASP-reasonable defaults.
const ARGON2_OPTIONS = {
  memoryCost: 19456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashSecret(secret: string): Promise<string> {
  return hash(secret, ARGON2_OPTIONS);
}

export async function verifySecret(secret: string, hashValue: string): Promise<boolean> {
  try {
    return await verify(hashValue, secret);
  } catch {
    return false;
  }
}
