import { createHash } from "node:crypto";

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

export function hashRefreshToken(refreshToken) {
  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    return null;
  }
  return createHash("sha256").update(refreshToken.trim()).digest("hex");
}

export function readTokenGeneration(credential) {
  const generation = credential?.codexAuth?.tokenGeneration;
  return Number.isInteger(generation) && generation > 0 ? generation : 0;
}

export function withRemoteTokenGeneration(credential, generation) {
  if (!isRecord(credential)) {
    return credential;
  }
  const normalizedGeneration = Number.isInteger(generation) && generation > 0 ? generation : 0;
  if (normalizedGeneration <= 0) {
    return credential;
  }
  return {
    ...credential,
    codexAuth: {
      ...(isRecord(credential.codexAuth) ? credential.codexAuth : {}),
      tokenGeneration: normalizedGeneration,
    },
  };
}

function normalizeRefreshTimestamp(credential, fallbackMs = null) {
  const lastRefresh = credential?.codexAuth?.lastRefresh;
  if (typeof lastRefresh === "string" && lastRefresh.trim()) {
    const parsed = Date.parse(lastRefresh);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Number.isFinite(fallbackMs) ? fallbackMs : null;
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

function prepareProfileRemoteRow({ profileId, credential, passphrase, deviceId, ts, generation = null }) {
  const tokenGeneration = Number.isInteger(generation) && generation > 0
    ? generation
    : Math.max(1, readTokenGeneration(credential));
  const credentialWithGeneration = withRemoteTokenGeneration(credential, tokenGeneration);
  const diag = pickDiagnosticFields(credentialWithGeneration);
  const serialized = serializeCredentialForRemote(credentialWithGeneration, passphrase);
  return {
    profileId,
    credential: credentialWithGeneration,
    diag,
    serialized,
    tokenGeneration,
    refreshTokenHash: hashRefreshToken(credentialWithGeneration?.refresh),
    lastRefreshAt: normalizeRefreshTimestamp(credentialWithGeneration, ts),
    lastRefreshBy: deviceId,
  };
}

function decryptProfileRow(row, passphrase) {
  const credential = deserializeCredentialFromRemote({
    blob: row.credential_blob,
    iv: row.credential_blob_iv,
    salt: row.credential_blob_salt,
    isEncrypted: Boolean(row.is_encrypted),
  }, passphrase);
  return withRemoteTokenGeneration(credential, row.token_generation);
}

function normalizeProfileRow(row, passphrase) {
  const credential = decryptProfileRow(row, passphrase);
  return {
    profileId: row.profile_id,
    credential,
    tokenGeneration: Number.isInteger(row.token_generation) ? row.token_generation : readTokenGeneration(credential),
    refreshTokenHash: typeof row.refresh_token_hash === "string" ? row.refresh_token_hash : hashRefreshToken(credential?.refresh),
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
    lastRefreshAt: row.last_refresh_at ?? null,
    lastRefreshBy: row.last_refresh_by ?? null,
    lastRefreshError: row.last_refresh_error ?? null,
    lastRefreshErrorAt: row.last_refresh_error_at ?? null,
  };
}

async function selectProfileRow(client, profileId) {
  const result = await client.query(
    `SELECT profile_id, provider, email, chatgpt_user_id, account_id, expires_at,
            credential_blob, credential_blob_iv, credential_blob_salt, is_encrypted,
            version, updated_at, updated_by, token_generation, refresh_token_hash,
            last_refresh_at, last_refresh_by, last_refresh_error, last_refresh_error_at
       FROM profiles
      WHERE profile_id = ?;`,
    [profileId],
  );
  return result?.results?.[0] ?? null;
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
            version, updated_at, updated_by, token_generation, refresh_token_hash,
            last_refresh_at, last_refresh_by, last_refresh_error, last_refresh_error_at
       FROM profiles;`,
  );
  const profiles = {};
  for (const row of profilesResult?.results ?? []) {
    try {
      profiles[row.profile_id] = decryptProfileRow(row, passphrase);
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
    const row = prepareProfileRemoteRow({ profileId, credential, passphrase, deviceId, ts });
    statements.push({
      sql: `INSERT INTO profiles (
              profile_id, provider, email, chatgpt_user_id, account_id,
              expires_at, credential_blob, credential_blob_iv, credential_blob_salt,
              is_encrypted, version, updated_at, updated_by, token_generation,
              refresh_token_hash, last_refresh_at, last_refresh_by,
              last_refresh_error, last_refresh_error_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NULL, NULL)
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
              updated_by = excluded.updated_by,
              token_generation = excluded.token_generation,
              refresh_token_hash = excluded.refresh_token_hash,
              last_refresh_at = excluded.last_refresh_at,
              last_refresh_by = excluded.last_refresh_by,
              last_refresh_error = NULL,
              last_refresh_error_at = NULL
            WHERE COALESCE(excluded.token_generation, 0) >= COALESCE(profiles.token_generation, 0)
               OR COALESCE(excluded.refresh_token_hash, '') = COALESCE(profiles.refresh_token_hash, '');`,
      params: [
        profileId,
        row.diag.provider,
        row.diag.email,
        row.diag.chatgptUserId,
        row.diag.accountId,
        row.diag.expiresAt,
        row.serialized.blob,
        row.serialized.iv,
        row.serialized.salt,
        row.serialized.isEncrypted ? 1 : 0,
        ts,
        deviceId,
        row.tokenGeneration,
        row.refreshTokenHash,
        row.lastRefreshAt,
        row.lastRefreshBy,
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
  const ts = nowMs();
  const row = prepareProfileRemoteRow({ profileId, credential, passphrase, deviceId, ts });
  await client.query(
    `INSERT INTO profiles (
        profile_id, provider, email, chatgpt_user_id, account_id,
        expires_at, credential_blob, credential_blob_iv, credential_blob_salt,
        is_encrypted, version, updated_at, updated_by, token_generation,
        refresh_token_hash, last_refresh_at, last_refresh_by,
        last_refresh_error, last_refresh_error_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NULL, NULL)
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
        updated_by = excluded.updated_by,
        token_generation = excluded.token_generation,
        refresh_token_hash = excluded.refresh_token_hash,
        last_refresh_at = excluded.last_refresh_at,
        last_refresh_by = excluded.last_refresh_by,
        last_refresh_error = NULL,
        last_refresh_error_at = NULL
      WHERE COALESCE(excluded.token_generation, 0) >= COALESCE(profiles.token_generation, 0)
         OR COALESCE(excluded.refresh_token_hash, '') = COALESCE(profiles.refresh_token_hash, '');`,
    [
      profileId,
      row.diag.provider,
      row.diag.email,
      row.diag.chatgptUserId,
      row.diag.accountId,
      row.diag.expiresAt,
      row.serialized.blob,
      row.serialized.iv,
      row.serialized.salt,
      row.serialized.isEncrypted ? 1 : 0,
      ts,
      deviceId,
      row.tokenGeneration,
      row.refreshTokenHash,
      row.lastRefreshAt,
      row.lastRefreshBy,
    ],
  );
}

export async function getProfileFromD1({ client, passphrase, profileId }) {
  const row = await selectProfileRow(client, profileId);
  if (!row) {
    return null;
  }
  try {
    return normalizeProfileRow(row, passphrase);
  } catch (error) {
    if (error instanceof StoreCryptoError) {
      throw new Error(`Unable to decrypt profile "${profileId}" from D1: ${error.message}`);
    }
    throw error;
  }
}

export async function compareAndSwapProfileInD1({
  client,
  passphrase,
  deviceId,
  profileId,
  credential,
  expectedRefreshTokenHash = null,
  expectedTokenGeneration = 0,
}) {
  const current = await getProfileFromD1({ client, passphrase, profileId });
  if (!current) {
    await pushProfileToD1({ client, passphrase, deviceId, profileId, credential });
    return await getProfileFromD1({ client, passphrase, profileId });
  }

  const nextGeneration = Math.max(
    current.tokenGeneration || 0,
    Number.isInteger(expectedTokenGeneration) ? expectedTokenGeneration : 0,
    readTokenGeneration(credential),
  ) + 1;
  const ts = nowMs();
  const row = prepareProfileRemoteRow({
    profileId,
    credential,
    passphrase,
    deviceId,
    ts,
    generation: nextGeneration,
  });
  const expectedHash = typeof expectedRefreshTokenHash === "string"
    ? expectedRefreshTokenHash
    : null;

  const result = await client.query(
    `UPDATE profiles
        SET provider = ?,
            email = ?,
            chatgpt_user_id = ?,
            account_id = ?,
            expires_at = ?,
            credential_blob = ?,
            credential_blob_iv = ?,
            credential_blob_salt = ?,
            is_encrypted = ?,
            version = version + 1,
            updated_at = ?,
            updated_by = ?,
            token_generation = ?,
            refresh_token_hash = ?,
            last_refresh_at = ?,
            last_refresh_by = ?,
            last_refresh_error = NULL,
            last_refresh_error_at = NULL
      WHERE profile_id = ?
        AND COALESCE(refresh_token_hash, '') = COALESCE(?, '')
        AND COALESCE(token_generation, 0) <= ?;`,
    [
      row.diag.provider,
      row.diag.email,
      row.diag.chatgptUserId,
      row.diag.accountId,
      row.diag.expiresAt,
      row.serialized.blob,
      row.serialized.iv,
      row.serialized.salt,
      row.serialized.isEncrypted ? 1 : 0,
      ts,
      deviceId,
      row.tokenGeneration,
      row.refreshTokenHash,
      row.lastRefreshAt,
      row.lastRefreshBy,
      profileId,
      expectedHash,
      Number.isInteger(expectedTokenGeneration) ? expectedTokenGeneration : 0,
    ],
  );

  if ((result?.meta?.changes ?? 0) > 0) {
    const updated = await getProfileFromD1({ client, passphrase, profileId });
    return { ...updated, updated: true, stale: false };
  }

  const latest = await getProfileFromD1({ client, passphrase, profileId });
  return { ...latest, updated: false, stale: true };
}

export async function recordProfileRefreshErrorInD1({ client, profileId, deviceId, error }) {
  const ts = nowMs();
  const message = error instanceof Error ? error.message : String(error ?? "Unknown refresh error");
  await client.query(
    `UPDATE profiles
        SET last_refresh_error = ?,
            last_refresh_error_at = ?,
            updated_by = ?
      WHERE profile_id = ?;`,
    [message.slice(0, 1000), ts, deviceId, profileId],
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
