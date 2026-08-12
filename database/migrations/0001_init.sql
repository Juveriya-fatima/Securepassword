-- SecurePass initial schema
-- All vault secrets are stored as ciphertext produced client-side.
-- The server never stores a plaintext password, Master Key, Vault Key, or Recovery Key.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  email_lower         TEXT GENERATED ALWAYS AS (lower(email)) STORED,

  -- Key-derivation parameters the client needs to re-derive the Master Key.
  -- Not secret: a salt and iteration counts, not a key or password.
  kdf_salt            TEXT NOT NULL,          -- base64, random, generated at signup
  kdf_algorithm       TEXT NOT NULL DEFAULT 'argon2id',
  kdf_iterations      INTEGER NOT NULL DEFAULT 3,
  kdf_memory_kib      INTEGER NOT NULL DEFAULT 65536,
  kdf_parallelism     INTEGER NOT NULL DEFAULT 1,

  -- Authentication: the client derives authKey = HKDF(masterKey), sends only authKey.
  -- The server re-hashes authKey with Argon2id before storing it (defense in depth:
  -- a DB leak alone does not hand over a value usable to log in without redoing the hash).
  auth_hash           TEXT NOT NULL,

  -- Vault Key (VK), wrapped (AES-256-GCM) by the Master Key. Opaque ciphertext to the server.
  vault_key_wrapped     TEXT NOT NULL,        -- base64 ciphertext
  vault_key_wrap_iv      TEXT NOT NULL,       -- base64 IV/nonce used for this wrap

  -- Same Vault Key, wrapped a second time by the user's independent Recovery Key.
  -- Lets the user regain access if they forget their master password.
  recovery_key_wrapped     TEXT NOT NULL,     -- base64 ciphertext (VK wrapped by Recovery Key)
  recovery_key_wrap_iv     TEXT NOT NULL,     -- base64 IV/nonce
  -- Verifier so the server can confirm a supplied Recovery Key is *shaped* correctly
  -- before the client attempts to unwrap (not required for security, just UX).
  recovery_key_verifier    TEXT NOT NULL,     -- Argon2id hash of a value derived from the Recovery Key

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email_lower ON users (email_lower);

CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- We never store the raw session token — only a SHA-256 hash of it, so a DB
  -- leak alone does not hand over usable session cookies.
  token_hash          TEXT NOT NULL UNIQUE,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE vault_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Website/service and username are stored in plaintext (needed for search/display
  -- and are not secret in the same way the password is). Only the password is
  -- end-to-end encrypted client-side with the Vault Key.
  website_or_service    TEXT NOT NULL,
  username_or_email     TEXT NOT NULL,

  encrypted_password     TEXT NOT NULL,       -- base64 AES-256-GCM ciphertext
  encryption_iv           TEXT NOT NULL,      -- base64 IV/nonce, unique per encryption
  encryption_version      INTEGER NOT NULL DEFAULT 1,

  -- A 0-4 strength score, computed client-side from the plaintext at the
  -- moment it's known (create/edit) and stored unencrypted so the vault list
  -- can render strength badges without decrypting every password on load.
  -- The score alone does not make the password recoverable.
  strength_score         SMALLINT NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every vault query is expected to filter by user_id; this index makes that cheap
-- and, combined with app-layer checks, keeps one user's records out of another's reach.
CREATE INDEX idx_vault_entries_user_id ON vault_entries (user_id);
CREATE INDEX idx_vault_entries_user_search ON vault_entries (user_id, website_or_service, username_or_email);
