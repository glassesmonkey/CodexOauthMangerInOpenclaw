-- Migration from schema version 1 to version 2.
--
-- Apply once to an existing D1 database that was created before token
-- generation tracking existed:
--
--   wrangler d1 execute codex-auth-dashboard --remote \
--     --file schemas/d1-auth-store-v2-migration.sql
--
-- Cloudflare D1 does not consistently support ADD COLUMN IF NOT EXISTS across
-- every SQLite runtime version, so this file is intentionally one-shot. If a
-- column already exists, stop and use the main schema file for fresh installs.

ALTER TABLE profiles ADD COLUMN token_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN refresh_token_hash TEXT;
ALTER TABLE profiles ADD COLUMN last_refresh_at INTEGER;
ALTER TABLE profiles ADD COLUMN last_refresh_by TEXT;
ALTER TABLE profiles ADD COLUMN last_refresh_error TEXT;
ALTER TABLE profiles ADD COLUMN last_refresh_error_at INTEGER;

CREATE INDEX IF NOT EXISTS profiles_by_refresh_token_hash ON profiles(refresh_token_hash);

INSERT OR REPLACE INTO schema_version (id, version, updated_at)
VALUES (1, 2, CAST(strftime('%s','now') AS INTEGER) * 1000);
