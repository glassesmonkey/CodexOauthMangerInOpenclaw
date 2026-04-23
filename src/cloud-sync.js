/**
 * High-level cloud sync primitives built on top of the D1 REST client.
 *
 * The dashboard stores its canonical auth data locally as JSON; when the user
 * flips store mode to "cloud" we additionally mirror that canonical state into
 * a D1 database so multiple devices share a single source of truth. This
 * module exposes the vocabulary the rest of the server uses:
 *
 *   pullStoreFromD1(...)         -> { profiles, order, lastGood, usageStats, maintenance }
 *   pushStoreToD1(...)           -> full replace (bootstrap / re-sync)
 *   pushProfileToD1(...)         -> single profile upsert after refresh / login
 *   pushMetaToD1(...)            -> order / maintenance / etc. updates
 *   deleteProfilesFromD1(...)    -> remove profile rows (on local delete)
 *   acquireRefreshLease / release -> per-profile advisory lock to prevent two
 *     devices from calling /oauth/token with the same refresh_token
 */

import { CODEX_PROVIDER } from "./constants.js";
import { D1Error } from "./d1-client.js";
import {
  deserializeCredentialFromRemote,
  serializeCredentialForRemote,
  StoreCryptoError,
} from "./store-crypto.js";
import { isRecord } from "./utils.js";

const META_KEYS = Object.freeze(["order", "lastGood", "usageStats", "maintenance"]);
const LEASE_TTL_MS_DEFAULT = 30_000;

function nowMs() {
  return Date.now();
}

function pickDiagnosticFields(credential) {
  const accessClaim = decodeJwt(credential?.access)?.["https://api.openai.com/auth"];
  const chatgptUserId = accessClaim && typeof accessClaim.chatgpt_user_id === "string"
    ? accessClaim.chatgpt_user_id.trim() || null
    : null;
  return {
    provider: typeof credential?.provider === "string" && credential.provider.trim()
      ? credential.provider.trim()
      : CODEX_PROVIDER,
    email: typeof credential?.email === "string" && credential.email.trim()
      ? credential.email.trim()
      : null,
    accountId: typeof credential?.accountId === "string" && credential.accountId.trim()
      ? credential.accountId.trim()
      : null,
    chatgptUserId,
    expiresAt: typeof credential?.expires === "number" && Number.isFinite(credential.expires)
      ? credential.expires
      : null,
  };
}

function decodeJwt(token) {
  if (typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function pullStoreFromD1({ client, passphrase }) {
  const profilesResult = await client.query(
    `SELECT profile_id, provider, email, chatgpt_user_id, account_id, expires_at,
            credential_blob, credential_blob_iv, credential_blob_salt, is_encrypted,
            version, updated_at, updated_by
       FROM profiles;`,
  );
  const profiles = {};
  for (const row of profilesResult?.results ?? []) {
    try {
      const credential = deserializeCredentialFromRemote({
        blob: row.credential_blob,
        iv: row.credential_blob_iv,
        salt: row.credential_blob_salt,
        isEncrypted: Boolean(row.is_encrypted),
      }, passphrase);
      profiles[row.profile_id] = credential;
    } catch (error) {
      if (error instanceof StoreCryptoError) {
        throw new Error(
          `Unable to decrypt profile "${row.profile_id}" from D1: ${error.message}`,
        );
      }
      throw error;
    }
  }

  const metaResult = await client.query(`SELECT meta_key, meta_value FROM store_meta;`);
  const meta = {};
  for (const row of metaResult?.results ?? []) {
    try {
      meta[row.meta_key] = JSON.parse(row.meta_value);
    } catch {
      meta[row.meta_key] = null;
    }
  }

  return {
    profiles,
    order: isRecord(meta.order) ? meta.order : undefined,
    lastGood: isRecord(meta.lastGood) ? meta.lastGood : undefined,
    usageStats: isRecord(meta.usageStats) ? meta.usageStats : undefined,
    maintenance: isRecord(meta.maintenance) ? meta.maintenance : undefined,
  };
}

export async function pushStoreToD1({ client, passphrase, deviceId, store, replace = false }) {
  const statements = [];

  if (replace) {
    statements.push({ sql: "DELETE FROM profiles;", params: [] });
    statements.push({ sql: "DELETE FROM store_meta;", params: [] });
  }

  const ts = nowMs();
  for (const [profileId, credential] of Object.entries(store.profiles || {})) {
    const diag = pickDiagnosticFields(credential);
    const serialized = serializeCredentialForRemote(credential, passphrase);
    statements.push({
      sql: `INSERT INTO profiles (
              profile_id, provider, email, chatgpt_user_id, account_id,
              expires_at, credential_blob, credential_blob_iv, credential_blob_salt,
              is_encrypted, version, updated_at, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(profile_id) DO UPDATE SET
              provider = excluded.provider,
              email = excluded.email,
              chatgpt_user_id = excluded.chatgpt_user_id,
              account_id = excluded.account_id,
              expires_at = excluded.expires_at,
              credential_blob = excluded.credential_blob,
              credential_blob_iv = excluded.credential_blob_iv,
              credential_blob_salt = excluded.credential_blob_salt,
              is_encrypted = excluded.is_encrypted,
              version = profiles.version + 1,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by;`,
      params: [
        profileId,
        diag.provider,
        diag.email,
        diag.chatgptUserId,
        diag.accountId,
        diag.expiresAt,
        serialized.blob,
        serialized.iv,
        serialized.salt,
        serialized.isEncrypted ? 1 : 0,
        ts,
        deviceId,
      ],
    });
  }

  for (const key of META_KEYS) {
    const value = store[key];
    if (value == null) {
      statements.push({
        sql: `DELETE FROM store_meta WHERE meta_key = ?;`,
        params: [key],
      });
      continue;
    }
    statements.push({
      sql: `INSERT INTO store_meta (meta_key, meta_value, version, updated_at, updated_by)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(meta_key) DO UPDATE SET
              meta_value = excluded.meta_value,
              version = store_meta.version + 1,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by;`,
      params: [key, JSON.stringify(value), ts, deviceId],
    });
  }

  if (statements.length === 0) {
    return { statementCount: 0 };
  }

  // D1 batches run atomically inside the backing Durable Object; use that for
  // the initial bootstrap and for small grouped updates.
  await client.batch(statements);
  return { statementCount: statements.length };
}

export async function pushProfileToD1({ client, passphrase, deviceId, profileId, credential }) {
  const diag = pickDiagnosticFields(credential);
  const serialized = serializeCredentialForRemote(credential, passphrase);
  const ts = nowMs();
  await client.query(
    `INSERT INTO profiles (
        profile_id, provider, email, chatgpt_user_id, account_id,
        expires_at, credential_blob, credential_blob_iv, credential_blob_salt,
        is_encrypted, version, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        provider = excluded.provider,
        email = excluded.email,
        chatgpt_user_id = excluded.chatgpt_user_id,
        account_id = excluded.account_id,
        expires_at = excluded.expires_at,
        credential_blob = excluded.credential_blob,
        credential_blob_iv = excluded.credential_blob_iv,
        credential_blob_salt = excluded.credential_blob_salt,
        is_encrypted = excluded.is_encrypted,
        version = profiles.version + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;`,
    [
      profileId,
      diag.provider,
      diag.email,
      diag.chatgptUserId,
      diag.accountId,
      diag.expiresAt,
      serialized.blob,
      serialized.iv,
      serialized.salt,
      serialized.isEncrypted ? 1 : 0,
      ts,
      deviceId,
    ],
  );
}

export async function deleteProfilesFromD1({ client, profileIds }) {
  const ids = Array.isArray(profileIds) ? profileIds.filter((entry) => typeof entry === "string" && entry.trim()) : [];
  if (ids.length === 0) {
    return;
  }
  const placeholders = ids.map(() => "?").join(", ");
  await client.query(
    `DELETE FROM profiles WHERE profile_id IN (${placeholders});`,
    ids,
  );
}

export async function pushMetaToD1({ client, deviceId, key, value }) {
  if (!META_KEYS.includes(key)) {
    throw new Error(`Unknown meta key: ${key}`);
  }
  const ts = nowMs();
  if (value == null) {
    await client.query(`DELETE FROM store_meta WHERE meta_key = ?;`, [key]);
    return;
  }
  await client.query(
    `INSERT INTO store_meta (meta_key, meta_value, version, updated_at, updated_by)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(meta_key) DO UPDATE SET
       meta_value = excluded.meta_value,
       version = store_meta.version + 1,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by;`,
    [key, JSON.stringify(value), ts, deviceId],
  );
}

/**
 * Try to atomically take out a short-TTL lease on `profileId` for this
 * device. Returns true if the caller owns the lease and may proceed with the
 * refresh; false if another device holds a live lease (caller should skip).
 *
 * We use two statements:
 *   1. Try INSERT; if another row exists, this fails with UNIQUE constraint.
 *   2. On failure, try to "steal" the lease if the existing one has already
 *      expired, using a CAS-style UPDATE bounded by expires_at < now and
 *      measuring rows_written via the query meta.
 */
export async function acquireRefreshLease({ client, profileId, holderId, ttlMs = LEASE_TTL_MS_DEFAULT }) {
  const now = nowMs();
  const expiresAt = now + Math.max(1_000, ttlMs);

  try {
    await client.query(
      `INSERT INTO refresh_leases (profile_id, holder, acquired_at, expires_at)
       VALUES (?, ?, ?, ?);`,
      [profileId, holderId, now, expiresAt],
    );
    return { acquired: true, stolen: false, expiresAt };
  } catch (error) {
    const isConstraint = error instanceof D1Error && /UNIQUE|constraint/i.test(error.message);
    if (!isConstraint) {
      throw error;
    }
  }

  // Existing row; try to steal only if it has already expired.
  const stealResult = await client.query(
    `UPDATE refresh_leases
        SET holder = ?,
            acquired_at = ?,
            expires_at = ?
      WHERE profile_id = ?
        AND expires_at < ?;`,
    [holderId, now, expiresAt, profileId, now],
  );
  const changes = stealResult?.meta?.changes ?? 0;
  if (changes > 0) {
    return { acquired: true, stolen: true, expiresAt };
  }
  return { acquired: false, stolen: false, expiresAt: null };
}

export async function releaseRefreshLease({ client, profileId, holderId }) {
  await client.query(
    `DELETE FROM refresh_leases WHERE profile_id = ? AND holder = ?;`,
    [profileId, holderId],
  );
}

export async function healthCheck({ client }) {
  const ping = await client.ping();
  return ping;
}

export const CLOUD_SYNC_META_KEYS = META_KEYS;
