# SecurePass — Password Generator & Password Vault

A password generator and end-to-end encrypted password vault. Built on the
existing **TanStack Start** frontend (React 19 + TanStack Router), with a
PostgreSQL-backed API implemented as TanStack Start server routes in the same
application — no separate backend process.

## Features

- Email/password accounts with Argon2id-based authentication
- Client-side password generator (`crypto.getRandomValues`, never `Math.random`)
- A personal vault: add, search, show/hide, copy, edit, and delete saved credentials
- **Zero-knowledge vault encryption** — the server only ever stores ciphertext
  it cannot decrypt (see "Encryption architecture" below)
- Recovery Key flow for regaining vault access after a forgotten password,
  without ever giving the server the ability to decrypt your vault
- Change-password flow that preserves your Vault Key (no data loss, no
  re-encryption of existing entries)
- Per-user data isolation enforced at the database/query layer, not just the UI

## Technology stack

- **Frontend**: React 19, TanStack Router/Start, Tailwind CSS, shadcn/ui (unchanged from the original UI)
- **Backend**: TanStack Start server routes (Node.js/TypeScript), running in the same process as the frontend
- **Database**: PostgreSQL (via `pg`, parameterized queries only)
- **Auth**: Argon2id (server-side, via `@node-rs/argon2`), DB-backed sessions, httpOnly `SameSite=Strict` cookies
- **Client crypto**: Argon2id (WASM, via `hash-wasm`), HKDF + AES-256-GCM (Web Crypto API / `SubtleCrypto`)

## Project structure

```
src/
  routes/
    api.auth.*.ts          # auth API routes (register, login, logout, me, ...)
    api.vault.ts            # vault list/create
    api.vault.$id.ts         # vault get/update/delete (single record, ownership-checked)
    api.account.ts           # profile update / account deletion
    login.tsx, signup.tsx, forgot-password.tsx, app.*.tsx   # existing UI, now wired to the API
  server/                    # server-only modules: db, sessions, argon2, validation, rate limiting
  lib/
    crypto/                  # client-side crypto: KDF, AES-GCM, Vault Key orchestration
    auth/auth-context.tsx    # session + Vault Key state (React context)
    vault-store.tsx           # vault CRUD backed by the real API, decrypt-on-demand
database/
  migrations/0001_init.sql
  migrate.ts
.env.example
```

## Installation

```bash
npm install
# or: bun install
```

## Database setup

1. Create a PostgreSQL database (locally or hosted):
   ```bash
   createdb securepass
   ```
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `SESSION_SECRET`:
   ```bash
   cp .env.example .env
   # DATABASE_URL=postgresql://user:password@localhost:5432/securepass
   # SESSION_SECRET=$(openssl rand -base64 48)
   ```
3. Run migrations:
   ```bash
   npm run db:migrate
   ```

## Running the app

```bash
npm run dev
```

This starts the single TanStack Start server (frontend + API) — there is
nothing separate to run. Visit the printed local URL, e.g. `http://localhost:3000`.

For production:
```bash
npm run build
npm run preview   # or your Node hosting target's start command
```
Set `NODE_ENV=production` so session cookies are marked `Secure` (requires HTTPS).

## Environment variables

See `.env.example`. In short:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — random secret used to HMAC session tokens before they're stored (generate with `openssl rand -base64 48`)
- `NODE_ENV` — `development` or `production`

Never commit `.env`. No secret values ship in this repo.

## Authentication

- Passwords are never sent to the server in any form. The client derives a
  **Master Key** locally (Argon2id) and, from that, a separate **auth key**
  (via HKDF) that's sent for login — knowledge of the auth key alone cannot
  reconstruct the Master Key.
- The server re-hashes the received auth key with Argon2id before storing it.
- Sessions are opaque random tokens; only an HMAC of the token is stored in
  PostgreSQL, in a `sessions` table, so a database leak alone doesn't yield
  usable session cookies. Logout deletes the session row — a real revocation,
  not just clearing a client-side cookie.
- Cookies are `httpOnly`, `SameSite=Strict`, and `Secure` in production.
- Auth endpoints (`register`, `login`, `change-password`, `recovery-*`) are
  rate-limited per IP.

## Encryption architecture (zero-knowledge vault)

- **Vault Key (VK)**: a random 256-bit AES key, generated once per account
  with `crypto.getRandomValues()`. This is what actually encrypts/decrypts
  your saved passwords (AES-256-GCM, a fresh random IV per encryption).
- **Master Key (MK)**: derived client-side from your password via Argon2id
  (WASM). Used only to *wrap* (encrypt) VK — never to encrypt vault data directly.
- **Recovery Key**: a second, independently-random 256-bit key, shown to you
  once at signup. It also wraps VK, completely independently of your
  password, so you can recover access if you forget your password.
- The server stores: `kdf_salt` + KDF parameters (not secret — needed to
  re-derive MK), an Argon2id hash of your auth key, VK wrapped by MK, and VK
  wrapped by the Recovery Key. All of that is either non-secret metadata or
  ciphertext the server cannot open.
- **Changing your password** re-derives MK from the new password and
  re-wraps the *same* VK — your existing vault entries are untouched, no
  re-encryption, no data loss.
- **Forgetting your password**: enter your Recovery Key on the "Recover Your
  Vault" page. The client uses it to unwrap VK locally, then re-wraps VK
  under a newly-derived MK (from your new password) *and* issues you a new
  Recovery Key (the old one is retired). If you lose both your password and
  your Recovery Key, the vault is unrecoverable by design — the server
  cannot decrypt it for you, and there is intentionally no email-based reset
  that would require that capability.
- **The Vault Key lives only in browser memory** for the duration of an
  unlocked session — never in localStorage, sessionStorage, or a cookie. A
  full page reload clears it; you'll see an "Unlock Your Vault" screen and
  need to re-enter your password (your session/login stays valid — this is
  purely about re-deriving VK, not re-authenticating).
- Vault entries are decrypted **only** when you click Show, Copy, or open
  Edit on that specific entry — never in bulk when the vault list loads.

## Security considerations

- All SQL uses parameterized queries (`pg` placeholders) — no string-built SQL.
- Every vault operation resolves the user from the session (never from
  anything the client claims) and both scopes the query by `user_id` and
  explicitly checks record ownership before returning/mutating a record —
  cross-user access attempts get a 404, not the data.
- Input is validated server-side with Zod on every endpoint.
- API responses never include stack traces; unexpected errors are logged
  server-side only and returned to the client as a generic message.
- Nothing secret (passwords, keys, auth material) is ever logged.
- CSRF: session cookies are `SameSite=Strict`, so browsers won't attach them
  to cross-site requests — the primary CSRF defense here, given the app is a
  single same-origin deployment.

### Known limitations / things to harden further for production

- Rate limiting is in-memory and per-process; behind multiple server
  instances you'd want a shared store (e.g. Redis).
- There's no email verification or transactional email sending in this
  build (no email provider was configured) — accounts are created and
  usable immediately.
- The KDF parameters (Argon2id memory/iterations) are tuned for reasonable
  performance on typical devices, including mobile; consider benchmarking
  and adjusting for your expected user hardware.
- This code has been written carefully but **has not been run** in this
  environment (no network access to install dependencies). Treat
  `npm install && npm run dev` as your first real build/typecheck pass, and
  see "A note on verification" below.

## Testing checklist

Manual test plan (run against a local PostgreSQL instance):

**Authentication**
- [ ] Sign up with a new email → recovery key shown, must acknowledge to continue
- [ ] Log out, log back in with the same credentials
- [ ] Log in with a wrong password → generic "incorrect email or password"
- [ ] Visiting `/app/*` while logged out redirects to `/login`
- [ ] Reloading `/app/vault` while logged in shows the "Unlock Your Vault" screen, and the correct password unlocks it

**Generator**
- [ ] Length slider from 6–32 produces passwords of exactly that length
- [ ] Toggling character types changes the generated password's composition
- [ ] With multiple types selected, generated passwords contain at least one of each (when length allows)
- [ ] Strength meter updates as you type/generate

**Vault**
- [ ] Save a generated password to the vault with a service + username
- [ ] Vault list loads without any password being decrypted (check Network tab: only ciphertext is transferred)
- [ ] Show reveals the correct password; Hide re-masks it
- [ ] Copy places the correct password on the clipboard
- [ ] Search filters by service/username
- [ ] Edit pre-fills the decrypted password, and saves changes correctly
- [ ] Delete removes the entry after confirmation

**Security / cross-user isolation**
- [ ] Create two accounts (User A, User B); confirm User B's vault is empty of A's data
- [ ] Copy a vault entry ID from User A's account, log in as User B, and attempt `GET/PATCH/DELETE /api/vault/<A's-id>` — expect `404`
- [ ] Hit any `/api/vault*` or `/api/account` endpoint without a session cookie — expect `401`
- [ ] Confirm (via `psql`) that `vault_entries.encrypted_password` is ciphertext, not plaintext, for every row
- [ ] Confirm no password/key ever appears in server console output or the browser console

**Change password / recovery**
- [ ] Change password with the correct current password → still logged in, vault entries still decrypt correctly
- [ ] Change password with the wrong current password → rejected
- [ ] Use "Forgot password" with a valid Recovery Key → vault recovers, new Recovery Key issued
- [ ] Use "Forgot password" with an invalid Recovery Key → rejected, no data changed

## Deployment

Any Node.js hosting target that can run the TanStack Start server works.
Provide `DATABASE_URL`, `SESSION_SECRET`, and set `NODE_ENV=production`
(required for `Secure` cookies — deploy behind HTTPS). Run `npm run db:migrate`
against your production database before first boot.

## A note on verification

This implementation was built in a sandboxed environment without package
registry access, so `npm install`, a full TypeScript build, and an actual
end-to-end run were not possible here. The API routes follow TanStack
Start's file-based server-route convention (`createServerFileRoute` from
`@tanstack/react-start/server`) for the installed version (`1.168.x`) as
accurately as I could without being able to compile against it. Please run
`npm install && npm run dev` as your first step, work through the testing
checklist above, and treat any compiler or runtime errors you hit as the
real first pass of feedback — I was not able to catch those myself.
