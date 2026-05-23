/**
 * An in-memory mock of Cloudflare D1's `/query` endpoint. Tests build a
 * MockD1 instance and pass its `fetch` method into createD1Client; the mock
 * keeps tables in JS objects and applies the SQL well enough to exercise
 * cloud-sync.js end-to-end without any network IO.
 *
 * It's deliberately narrow: only the SQL statements that cloud-sync.js emits
 * are recognised. When a new SQL shape is introduced we add a branch here.
 */
export class MockD1 {
  constructor() {
    this.profiles = new Map();
    this.storeMeta = new Map();
    this.refreshLeases = new Map();
    this.schemaVersion = 2;
    this.callCount = 0;
    this.now = () => Date.now();
  }

  snapshot() {
    return {
      profiles: Array.from(this.profiles.entries()).map(([id, row]) => ({ id, ...row })),
      storeMeta: Array.from(this.storeMeta.entries()).map(([k, row]) => ({ key: k, ...row })),
      refreshLeases: Array.from(this.refreshLeases.entries()).map(([id, row]) => ({ id, ...row })),
    };
  }

  async fetchImpl(url, init = {}) {
    this.callCount += 1;
    if (init.method !== "POST") {
      return this.jsonResponse(405, { success: false, errors: [{ code: 405, message: "method not allowed" }] });
    }
    let body;
    try {
      body = JSON.parse(typeof init.body === "string" ? init.body : "{}");
    } catch {
      return this.jsonResponse(400, { success: false, errors: [{ code: 400, message: "invalid json" }] });
    }
    const collectedErrors = [];
    const runWithCapture = (statement) => {
      const result = this.runOne(statement.sql, statement.params || []);
      if (result && result.success === false && Array.isArray(result.errors)) {
        collectedErrors.push(...result.errors);
      }
      return result;
    };
    if (Array.isArray(body.batch)) {
      const results = body.batch.map((statement) => runWithCapture(statement));
      const success = collectedErrors.length === 0;
      return this.jsonResponse(200, { success, result: results, errors: collectedErrors, messages: [] });
    }
    if (typeof body.sql === "string") {
      const result = runWithCapture({ sql: body.sql, params: body.params });
      const success = collectedErrors.length === 0;
      return this.jsonResponse(200, { success, result: [result], errors: collectedErrors, messages: [] });
    }
    return this.jsonResponse(400, { success: false, errors: [{ code: 400, message: "missing sql" }] });
  }

  jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      headers: new Map([["content-type", "application/json"]]),
      async text() { return JSON.stringify(body); },
      async json() { return body; },
    };
  }

  runOne(sql, params) {
    const normalised = sql.trim();
    const upper = normalised.toUpperCase();

    if (upper.startsWith("SELECT VERSION FROM SCHEMA_VERSION")) {
      return { results: [{ version: this.schemaVersion }], meta: { changes: 0, rows_read: 1 } };
    }
    if (upper.startsWith("SELECT PROFILE_ID") && upper.includes("WHERE PROFILE_ID = ?")) {
      const row = this.profiles.get(params[0]);
      return {
        results: row ? [{ profile_id: params[0], ...row }] : [],
        meta: { changes: 0, rows_read: row ? 1 : 0 },
      };
    }
    if (upper.startsWith("SELECT PROFILE_ID")) {
      return {
        results: Array.from(this.profiles.entries()).map(([id, row]) => ({
          profile_id: id,
          ...row,
        })),
        meta: { changes: 0, rows_read: this.profiles.size },
      };
    }
    if (upper.startsWith("SELECT META_KEY")) {
      return {
        results: Array.from(this.storeMeta.entries()).map(([key, row]) => ({
          meta_key: key,
          ...row,
        })),
        meta: { changes: 0, rows_read: this.storeMeta.size },
      };
    }
    if (upper.startsWith("DELETE FROM PROFILES WHERE PROFILE_ID IN")) {
      let changes = 0;
      for (const id of params) {
        if (this.profiles.delete(id)) changes += 1;
      }
      return { results: [], meta: { changes } };
    }
    if (upper.startsWith("DELETE FROM PROFILES")) {
      const changes = this.profiles.size;
      this.profiles.clear();
      return { results: [], meta: { changes } };
    }
    if (upper.startsWith("DELETE FROM STORE_META WHERE META_KEY")) {
      const existed = this.storeMeta.delete(params[0]);
      return { results: [], meta: { changes: existed ? 1 : 0 } };
    }
    if (upper.startsWith("DELETE FROM STORE_META")) {
      const changes = this.storeMeta.size;
      this.storeMeta.clear();
      return { results: [], meta: { changes } };
    }
    if (upper.startsWith("INSERT INTO PROFILES")) {
      const [
        profileId, provider, email, chatgptUserId, accountId,
        expiresAt, credentialBlob, credentialBlobIv, credentialBlobSalt,
        isEncrypted, updatedAt, updatedBy, tokenGeneration, refreshTokenHash,
        lastRefreshAt, lastRefreshBy,
      ] = params;
      const existing = this.profiles.get(profileId);
      const incoming = {
        provider,
        email,
        chatgpt_user_id: chatgptUserId,
        account_id: accountId,
        expires_at: expiresAt,
        credential_blob: credentialBlob,
        credential_blob_iv: credentialBlobIv,
        credential_blob_salt: credentialBlobSalt,
        is_encrypted: isEncrypted,
        version: existing ? (existing.version + 1) : 1,
        updated_at: updatedAt,
        updated_by: updatedBy,
        token_generation: tokenGeneration ?? existing?.token_generation ?? 0,
        refresh_token_hash: refreshTokenHash ?? existing?.refresh_token_hash ?? null,
        last_refresh_at: lastRefreshAt ?? existing?.last_refresh_at ?? null,
        last_refresh_by: lastRefreshBy ?? existing?.last_refresh_by ?? null,
        last_refresh_error: null,
        last_refresh_error_at: null,
      };
      const canUpdate = !existing
        || (Number(incoming.token_generation) || 0) >= (Number(existing.token_generation) || 0)
        || String(incoming.refresh_token_hash || "") === String(existing.refresh_token_hash || "");
      if (canUpdate) {
        this.profiles.set(profileId, incoming);
      }
      return { results: [], meta: { changes: 1 } };
    }
    if (upper.startsWith("UPDATE PROFILES") && upper.includes("REFRESH_TOKEN_HASH")) {
      const [
        provider, email, chatgptUserId, accountId, expiresAt,
        credentialBlob, credentialBlobIv, credentialBlobSalt, isEncrypted,
        updatedAt, updatedBy, tokenGeneration, refreshTokenHash,
        lastRefreshAt, lastRefreshBy, profileId, expectedRefreshTokenHash,
        expectedTokenGeneration,
      ] = params;
      const existing = this.profiles.get(profileId);
      const expectedHashMatches = String(existing?.refresh_token_hash || "") === String(expectedRefreshTokenHash || "");
      const expectedGenerationAllows = (Number(existing?.token_generation) || 0) <= (Number(expectedTokenGeneration) || 0);
      if (!existing || !expectedHashMatches || !expectedGenerationAllows) {
        return { results: [], meta: { changes: 0 } };
      }
      this.profiles.set(profileId, {
        ...existing,
        provider,
        email,
        chatgpt_user_id: chatgptUserId,
        account_id: accountId,
        expires_at: expiresAt,
        credential_blob: credentialBlob,
        credential_blob_iv: credentialBlobIv,
        credential_blob_salt: credentialBlobSalt,
        is_encrypted: isEncrypted,
        version: (existing.version || 1) + 1,
        updated_at: updatedAt,
        updated_by: updatedBy,
        token_generation: tokenGeneration,
        refresh_token_hash: refreshTokenHash,
        last_refresh_at: lastRefreshAt,
        last_refresh_by: lastRefreshBy,
        last_refresh_error: null,
        last_refresh_error_at: null,
      });
      return { results: [], meta: { changes: 1 } };
    }
    if (upper.startsWith("UPDATE PROFILES") && upper.includes("LAST_REFRESH_ERROR")) {
      const [lastRefreshError, lastRefreshErrorAt, updatedBy, profileId] = params;
      const existing = this.profiles.get(profileId);
      if (!existing) {
        return { results: [], meta: { changes: 0 } };
      }
      this.profiles.set(profileId, {
        ...existing,
        last_refresh_error: lastRefreshError,
        last_refresh_error_at: lastRefreshErrorAt,
        updated_by: updatedBy,
      });
      return { results: [], meta: { changes: 1 } };
    }
    if (upper.startsWith("INSERT INTO STORE_META")) {
      const [metaKey, metaValue, updatedAt, updatedBy] = params;
      const existing = this.storeMeta.get(metaKey);
      this.storeMeta.set(metaKey, {
        meta_value: metaValue,
        version: existing ? (existing.version + 1) : 1,
        updated_at: updatedAt,
        updated_by: updatedBy,
      });
      return { results: [], meta: { changes: 1 } };
    }
    if (upper.startsWith("INSERT INTO REFRESH_LEASES")) {
      const [profileId, holder, acquiredAt, expiresAt] = params;
      if (this.refreshLeases.has(profileId)) {
        return { results: [], meta: { changes: 0 }, success: false, errors: [{ code: 2067, message: "UNIQUE constraint failed: refresh_leases.profile_id" }] };
      }
      this.refreshLeases.set(profileId, { holder, acquired_at: acquiredAt, expires_at: expiresAt });
      return { results: [], meta: { changes: 1 } };
    }
    if (upper.startsWith("UPDATE REFRESH_LEASES")) {
      const [holder, acquiredAt, expiresAt, profileId, now] = params;
      const existing = this.refreshLeases.get(profileId);
      if (!existing || existing.expires_at >= now) {
        return { results: [], meta: { changes: 0 } };
      }
      this.refreshLeases.set(profileId, { holder, acquired_at: acquiredAt, expires_at: expiresAt });
      return { results: [], meta: { changes: 1 } };
    }
    if (upper.startsWith("DELETE FROM REFRESH_LEASES")) {
      const [profileId, holder] = params;
      const existing = this.refreshLeases.get(profileId);
      if (existing && existing.holder === holder) {
        this.refreshLeases.delete(profileId);
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }
    // Unknown statement — fail loudly so new SQL branches surface in tests.
    throw new Error("MockD1: unhandled SQL: " + normalised);
  }
}

export function createMockD1Transport() {
  const mock = new MockD1();
  const transport = {
    mock,
    fetchImpl: mock.fetchImpl.bind(mock),
  };
  return transport;
}
