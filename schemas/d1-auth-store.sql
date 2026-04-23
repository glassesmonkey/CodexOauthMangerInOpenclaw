-- D1 schema for shared Codex auth store.
--
-- Applied via:
--   wrangler d1 execute codex-auth-dashboard --remote \
--     --file schemas/d1-auth-store.sql
--
-- All blobs holding OAuth material (`credential_blob`, `credential_blob_aux`,
-- `meta_value`) are opaque JSON strings. When the dashboard is configured with
-- a store passphrase, they are AES-GCM encrypted with PBKDF2(SHA-256) before
-- being written; see src/store-crypto.js. `credential_blob_iv` /
-- `credential_blob_salt` are populated only for encrypted payloads.
--
-- Plaintext columns (email / chatgpt_user_id / expires_at) exist purely for
-- diagnostics / queries and never hold refresh tokens.

CREATE TABLE IF NOT EXISTS profiles (
  profile_id        TEXT PRIMARY KEY,
  provider          TEXT NOT NULL,
  email             TEXT,
  chatgpt_user_id   TEXT,
  account_id        TEXT,
  expires_at        INTEGER,
  credential_blob   TEXT NOT NULL,          -- JSON (plaintext) or ciphertext
  credential_blob_iv TEXT,                  -- base64 when encrypted
  credential_blob_salt TEXT,                -- base64 when encrypted
  is_encrypted      INTEGER NOT NULL DEFAULT 0,
  version           INTEGER NOT NULL DEFAULT 1,
  updated_at        INTEGER NOT NULL,
  updated_by        TEXT                    -- device id that last wrote
);

CREATE INDEX IF NOT EXISTS profiles_by_email ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_by_chatgpt_user_id ON profiles(chatgpt_user_id);
CREATE INDEX IF NOT EXISTS profiles_by_expires_at ON profiles(expires_at);

CREATE TABLE IF NOT EXISTS store_meta (
  meta_key          TEXT PRIMARY KEY,       -- 'order' | 'lastGood' | 'usageStats' | 'maintenance'
  meta_value        TEXT NOT NULL,          -- JSON (plaintext; no secrets)
  version           INTEGER NOT NULL DEFAULT 1,
  updated_at        INTEGER NOT NULL,
  updated_by        TEXT
);

-- Per-profile short TTL advisory lock used by cloud-mode keepalive so two
-- devices cannot both call /oauth/token with the same refresh_token.
CREATE TABLE IF NOT EXISTS refresh_leases (
  profile_id        TEXT PRIMARY KEY,
  holder            TEXT NOT NULL,          -- device id
  acquired_at       INTEGER NOT NULL,
  expires_at        INTEGER NOT NULL        -- unix ms
);

CREATE INDEX IF NOT EXISTS refresh_leases_by_expires_at ON refresh_leases(expires_at);

CREATE TABLE IF NOT EXISTS schema_version (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  version           INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

INSERT OR REPLACE INTO schema_version (id, version, updated_at)
VALUES (1, 1, CAST(strftime('%s','now') AS INTEGER) * 1000);
