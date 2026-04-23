import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAuthStore } from "../src/auth-store.js";
import {
  acquireRefreshLease,
  pullStoreFromD1,
  pushStoreToD1,
  releaseRefreshLease,
} from "../src/cloud-sync.js";
import { createD1Client } from "../src/d1-client.js";
import {
  loadDashboardConfig,
  saveDashboardConfig,
} from "../src/dashboard-config.js";
import {
  deserializeCredentialFromRemote,
  encryptJsonValue,
  decryptJsonValue,
  serializeCredentialForRemote,
  StoreCryptoError,
} from "../src/store-crypto.js";
import {
  cleanupDuplicateProfiles,
  deleteProfile,
  deleteProfiles,
  runTokenKeepalive,
  saveLoggedInProfile,
} from "../src/state.js";
import { MockD1 } from "./support/mock-d1.js";

function setupStateDir(prefix) {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  return { stateDir, localStateDir, codexAuthPath };
}

function writeInitialStore(stateDir, profiles, order) {
  const localAuthStorePath = path.join(stateDir, ".local", "auth-store.json");
  writeAuthStore(localAuthStorePath, {
    profiles,
    order: order ? { "openai-codex": order } : undefined,
  });
}

function buildOauthProfile({ access, refresh, expires, email, accountId }) {
  return {
    type: "oauth",
    provider: "openai-codex",
    access,
    refresh,
    expires,
    accountId: accountId ?? "account-shared",
    email,
    codexAuth: {
      authMode: "chatgpt",
      idToken: `${access}-id`,
      lastRefresh: "2026-04-02T18:02:46.501Z",
    },
  };
}

function configureCloudMode(localStateDir, mock) {
  // Persist a cloud-mode config + hijack loadCloudContext's client so it uses
  // our mock fetch. We piggy-back on dashboard-config's file format; the
  // stored apiToken is never transmitted because we override fetchImpl on
  // createD1Client via env — but state.js calls createD1Client with real
  // values. The cleanest hook is to monkey-patch globalThis.fetch for the
  // duration of the test. MockD1.fetchImpl ignores the URL.
  const options = { localStateDir };
  saveDashboardConfig(options, {
    storeMode: "cloud",
    d1: {
      accountId: "acc-test",
      databaseId: "db-test",
      apiToken: "token-test",
    },
    deviceId: "device-under-test",
  });
}

test("store-crypto: round-trips a JSON value with passphrase", () => {
  const value = { refresh: "rt_abc", access: "acc_xyz", email: "a@b.com" };
  const blob = encryptJsonValue(value, "correct-horse-battery-staple");
  assert.ok(blob.ciphertext && blob.iv && blob.salt && blob.tag);

  const round = decryptJsonValue(blob, "correct-horse-battery-staple");
  assert.deepEqual(round, value);
});

test("store-crypto: rejects wrong passphrase", () => {
  const value = { refresh: "rt_abc" };
  const blob = encryptJsonValue(value, "pass-one");
  assert.throws(
    () => decryptJsonValue(blob, "pass-two"),
    (error) => {
      assert.ok(error instanceof StoreCryptoError);
      return true;
    },
  );
});

test("store-crypto: plain serialization round-trips without passphrase", () => {
  const credential = { type: "oauth", refresh: "rt_plain" };
  const payload = serializeCredentialForRemote(credential, "");
  assert.equal(payload.isEncrypted, false);
  const roundTripped = deserializeCredentialFromRemote(payload, "");
  assert.deepEqual(roundTripped, credential);
});

test("store-crypto: encrypted serialization round-trips with passphrase", () => {
  const credential = { type: "oauth", refresh: "rt_secret" };
  const payload = serializeCredentialForRemote(credential, "s3cret");
  assert.equal(payload.isEncrypted, true);
  assert.ok(payload.iv && payload.salt);
  const roundTripped = deserializeCredentialFromRemote(payload, "s3cret");
  assert.deepEqual(roundTripped, credential);
});

test("cloud-sync: pushStoreToD1 + pullStoreFromD1 round-trip through MockD1", async () => {
  const mock = new MockD1();
  const client = createD1Client({
    accountId: "acc",
    databaseId: "db",
    apiToken: "tok",
    fetchImpl: mock.fetchImpl.bind(mock),
  });
  const store = {
    profiles: {
      "openai-codex:alpha": buildOauthProfile({
        access: "alpha-access",
        refresh: "alpha-refresh",
        expires: Date.now() + 60_000,
        email: "alpha@example.com",
      }),
    },
    order: { "openai-codex": ["openai-codex:alpha"] },
  };
  await pushStoreToD1({ client, passphrase: "", deviceId: "dev-1", store, replace: true });
  const pulled = await pullStoreFromD1({ client, passphrase: "" });
  assert.ok(pulled.profiles["openai-codex:alpha"]);
  assert.equal(pulled.profiles["openai-codex:alpha"].refresh, "alpha-refresh");
  assert.deepEqual(pulled.order, { "openai-codex": ["openai-codex:alpha"] });
});

test("cloud-sync: acquireRefreshLease blocks a second holder until release", async () => {
  const mock = new MockD1();
  const client = createD1Client({
    accountId: "acc",
    databaseId: "db",
    apiToken: "tok",
    fetchImpl: mock.fetchImpl.bind(mock),
  });

  const first = await acquireRefreshLease({
    client,
    profileId: "openai-codex:alpha",
    holderId: "device-A",
    ttlMs: 60_000,
  });
  assert.equal(first.acquired, true);

  const second = await acquireRefreshLease({
    client,
    profileId: "openai-codex:alpha",
    holderId: "device-B",
    ttlMs: 60_000,
  });
  assert.equal(second.acquired, false);

  await releaseRefreshLease({ client, profileId: "openai-codex:alpha", holderId: "device-A" });

  const third = await acquireRefreshLease({
    client,
    profileId: "openai-codex:alpha",
    holderId: "device-B",
    ttlMs: 60_000,
  });
  assert.equal(third.acquired, true);
});

test("dashboard-config: storeMode defaults to offline and can be toggled", () => {
  const { localStateDir, stateDir } = setupStateDir("codex-dashboard-config-");
  try {
    const initial = loadDashboardConfig({ localStateDir });
    assert.equal(initial.storeMode, "offline");
    assert.equal(initial.exists, false);

    const updated = saveDashboardConfig({ localStateDir }, {
      storeMode: "cloud",
      d1: { accountId: "acc", databaseId: "db", apiToken: "tok" },
    });
    assert.equal(updated.storeMode, "cloud");
    assert.equal(updated.d1.accountId, "acc");
    assert.equal(updated.d1.apiToken, "tok");

    // Passing an empty apiToken must preserve the existing one.
    const partial = saveDashboardConfig({ localStateDir }, {
      storeMode: "cloud",
      d1: { accountId: "acc-new", databaseId: "db-new" },
    });
    assert.equal(partial.d1.apiToken, "tok");
    assert.equal(partial.d1.accountId, "acc-new");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("runTokenKeepalive in cloud mode skips profiles whose lease is held by another device", async () => {
  const { stateDir, localStateDir, codexAuthPath } = setupStateDir("codex-dashboard-keepalive-cloud-");
  try {
    const now = Date.now();
    writeInitialStore(stateDir, {
      "openai-codex:seat-a": buildOauthProfile({
        access: "seat-a-access",
        refresh: "seat-a-refresh",
        expires: now - 1_000,
        email: "a@example.com",
      }),
      "openai-codex:seat-b": buildOauthProfile({
        access: "seat-b-access",
        refresh: "seat-b-refresh",
        expires: now - 1_000,
        email: "b@example.com",
      }),
    }, ["openai-codex:seat-a", "openai-codex:seat-b"]);

    const mock = new MockD1();
    // Preload a live lease on seat-a held by a different device.
    mock.refreshLeases.set("openai-codex:seat-a", {
      holder: "other-device",
      acquired_at: now,
      expires_at: now + 5 * 60 * 1000,
    });

    configureCloudMode(localStateDir, mock);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fetchImpl.bind(mock);
    try {
      const refreshCalls = [];
      const result = await runTokenKeepalive(
        { stateDir, localStateDir, agent: "main", codexAuthPath },
        {
          refreshImpl: async (refreshToken) => {
            refreshCalls.push(refreshToken);
            return {
              access: `next-${refreshToken}`,
              refresh: `next-${refreshToken}`,
              expires: Date.now() + 60_000,
            };
          },
        },
      );

      assert.equal(result.storeMode, "cloud");
      assert.equal(result.skippedLeaseCount, 1);
      assert.deepEqual(result.leaseSkippedProfiles, ["openai-codex:seat-a"]);
      assert.deepEqual(refreshCalls, ["seat-b-refresh"]);
      assert.deepEqual(result.changedProfileIds, ["openai-codex:seat-b"]);

      const snapshot = mock.snapshot();
      const seatB = snapshot.profiles.find((row) => row.id === "openai-codex:seat-b");
      assert.ok(seatB, "seat-b should have been pushed to D1");
      // The lease on seat-a must still be held by the other device.
      assert.equal(mock.refreshLeases.get("openai-codex:seat-a").holder, "other-device");
      // The lease we acquired for seat-b must be released.
      assert.equal(mock.refreshLeases.has("openai-codex:seat-b"), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

// Shared harness for state.js cloud-mode tests: configures cloud mode and
// hijacks globalThis.fetch to route to the MockD1 instance.
function runWithCloudMock(mock, localStateDir, work) {
  configureCloudMode(localStateDir, mock);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock.fetchImpl.bind(mock);
  return Promise.resolve(work()).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test("cloud-mode writes upsert local profiles into D1 without wiping remote-only rows", async () => {
  const { stateDir, localStateDir, codexAuthPath } = setupStateDir("codex-dashboard-cloud-upsert-");
  try {
    writeInitialStore(stateDir, {
      "openai-codex:local-one": buildOauthProfile({
        access: "local-access-1",
        refresh: "local-refresh-1",
        expires: Date.now() + 60_000,
        email: "local@example.com",
      }),
    }, ["openai-codex:local-one"]);

    const mock = new MockD1();
    // Pretend another device already pushed a second profile to D1. The
    // local store on THIS device has no knowledge of it.
    mock.profiles.set("openai-codex:other-device", {
      provider: "openai-codex",
      email: "other@example.com",
      chatgpt_user_id: null,
      account_id: null,
      expires_at: Date.now() + 120_000,
      credential_blob: JSON.stringify({ type: "oauth", refresh: "other-refresh" }),
      credential_blob_iv: null,
      credential_blob_salt: null,
      is_encrypted: 0,
      version: 1,
      updated_at: Date.now(),
      updated_by: "other-device",
    });

    await runWithCloudMock(mock, localStateDir, async () => {
      // Save a brand-new profile through a normal write path (login save).
      await saveLoggedInProfile(
        { stateDir, localStateDir, agent: "main", codexAuthPath },
        "openai-codex:new-local",
        {
          access: "new-access",
          refresh: "new-refresh",
          expires: Date.now() + 60_000,
          accountId: "acc-new",
          email: "new@example.com",
          authMode: "chatgpt",
          idToken: "new-id-token",
          lastRefresh: new Date().toISOString(),
        },
      );
    });

    const snapshot = mock.snapshot();
    const ids = snapshot.profiles.map((row) => row.id).sort();
    assert.ok(ids.includes("openai-codex:other-device"), "must not have wiped the other device's profile");
    assert.ok(ids.includes("openai-codex:new-local"), "new local profile should have been upserted");
    assert.ok(ids.includes("openai-codex:local-one"), "existing local profile should still be present in D1");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("deleteProfile in cloud mode removes the row from D1", async () => {
  const { stateDir, localStateDir, codexAuthPath } = setupStateDir("codex-dashboard-cloud-delete-");
  try {
    writeInitialStore(stateDir, {
      "openai-codex:keeper": buildOauthProfile({
        access: "keeper-access",
        refresh: "keeper-refresh",
        expires: Date.now() + 60_000,
        email: "keeper@example.com",
      }),
      "openai-codex:goner": buildOauthProfile({
        access: "goner-access",
        refresh: "goner-refresh",
        expires: Date.now() + 60_000,
        email: "goner@example.com",
      }),
    }, ["openai-codex:keeper", "openai-codex:goner"]);

    const mock = new MockD1();
    // Preload both rows as if a previous sync wrote them.
    for (const id of ["openai-codex:keeper", "openai-codex:goner"]) {
      mock.profiles.set(id, {
        provider: "openai-codex",
        email: `${id}@example.com`,
        chatgpt_user_id: null,
        account_id: null,
        expires_at: Date.now() + 60_000,
        credential_blob: JSON.stringify({ type: "oauth", refresh: `${id}-refresh` }),
        credential_blob_iv: null,
        credential_blob_salt: null,
        is_encrypted: 0,
        version: 1,
        updated_at: Date.now(),
        updated_by: "test-seed",
      });
    }

    await runWithCloudMock(mock, localStateDir, async () => {
      await deleteProfile(
        { stateDir, localStateDir, agent: "main", codexAuthPath },
        "openai-codex:goner",
      );
    });

    assert.equal(mock.profiles.has("openai-codex:goner"), false, "deleted profile must be gone from D1");
    assert.equal(mock.profiles.has("openai-codex:keeper"), true, "kept profile must remain in D1");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("cleanupDuplicateProfiles in cloud mode removes merged-away source IDs from D1", async () => {
  const { stateDir, localStateDir, codexAuthPath } = setupStateDir("codex-dashboard-cloud-cleanup-");
  try {
    // Two profile rows sharing the same identity (same access JWT / chatgpt_user_id):
    // the cleanup logic merges them into one and removes the other.
    const sharedAccessJwt = [
      Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify({
        sub: "auth0|shared",
        "https://api.openai.com/auth": { chatgpt_user_id: "user-shared" },
        "https://api.openai.com/profile": { email: "shared@example.com" },
      })).toString("base64url"),
      "sig",
    ].join(".");

    writeInitialStore(stateDir, {
      "openai-codex:primary": {
        type: "oauth",
        provider: "openai-codex",
        access: sharedAccessJwt,
        refresh: "primary-refresh",
        expires: Date.now() + 120_000,
        accountId: "acc-shared",
        email: "shared@example.com",
        codexAuth: { authMode: "chatgpt", idToken: sharedAccessJwt, lastRefresh: "2026-04-01T00:00:00Z" },
      },
      "openai-codex:duplicate": {
        type: "oauth",
        provider: "openai-codex",
        access: sharedAccessJwt,
        refresh: "duplicate-refresh",
        expires: Date.now() + 60_000,
        accountId: "acc-shared",
        email: "shared@example.com",
        codexAuth: { authMode: "chatgpt", idToken: sharedAccessJwt, lastRefresh: "2026-04-01T00:00:00Z" },
      },
    }, ["openai-codex:primary", "openai-codex:duplicate"]);

    const mock = new MockD1();
    // Preload both rows as if a prior sync put them there; cleanup must drop
    // the `sourceProfileId` side (whichever the dedup picks as duplicate).
    for (const id of ["openai-codex:primary", "openai-codex:duplicate"]) {
      mock.profiles.set(id, {
        provider: "openai-codex",
        email: "shared@example.com",
        chatgpt_user_id: "user-shared",
        account_id: "acc-shared",
        expires_at: Date.now() + 60_000,
        credential_blob: JSON.stringify({ type: "oauth", refresh: `${id}-refresh` }),
        credential_blob_iv: null,
        credential_blob_salt: null,
        is_encrypted: 0,
        version: 1,
        updated_at: Date.now(),
        updated_by: "test-seed",
      });
    }

    const result = await runWithCloudMock(mock, localStateDir, async () => {
      return await cleanupDuplicateProfiles(
        { stateDir, localStateDir, agent: "main", codexAuthPath },
      );
    });

    const cleanupActions = result.actions.filter((action) => action.type === "cleanup-duplicate");
    assert.ok(cleanupActions.length > 0, "cleanup should have produced at least one merge action");
    for (const action of cleanupActions) {
      assert.equal(
        mock.profiles.has(action.sourceProfileId),
        false,
        `merged-away profile ${action.sourceProfileId} must be removed from D1`,
      );
      assert.equal(
        mock.profiles.has(action.targetProfileId),
        true,
        `canonical profile ${action.targetProfileId} must remain in D1`,
      );
    }
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("deleteProfiles (bulk) in cloud mode removes all requested rows from D1", async () => {
  const { stateDir, localStateDir, codexAuthPath } = setupStateDir("codex-dashboard-cloud-bulk-delete-");
  try {
    writeInitialStore(stateDir, {
      "openai-codex:a": buildOauthProfile({ access: "a", refresh: "a-r", expires: Date.now() + 60_000, email: "a@x" }),
      "openai-codex:b": buildOauthProfile({ access: "b", refresh: "b-r", expires: Date.now() + 60_000, email: "b@x" }),
      "openai-codex:c": buildOauthProfile({ access: "c", refresh: "c-r", expires: Date.now() + 60_000, email: "c@x" }),
    }, ["openai-codex:a", "openai-codex:b", "openai-codex:c"]);

    const mock = new MockD1();
    for (const id of ["openai-codex:a", "openai-codex:b", "openai-codex:c"]) {
      mock.profiles.set(id, {
        provider: "openai-codex",
        email: `${id}@x`,
        chatgpt_user_id: null,
        account_id: null,
        expires_at: Date.now() + 60_000,
        credential_blob: JSON.stringify({ type: "oauth", refresh: `${id}-r` }),
        credential_blob_iv: null,
        credential_blob_salt: null,
        is_encrypted: 0,
        version: 1,
        updated_at: Date.now(),
        updated_by: "seed",
      });
    }

    await runWithCloudMock(mock, localStateDir, async () => {
      await deleteProfiles(
        { stateDir, localStateDir, agent: "main", codexAuthPath },
        ["openai-codex:a", "openai-codex:c"],
      );
    });

    assert.equal(mock.profiles.has("openai-codex:a"), false);
    assert.equal(mock.profiles.has("openai-codex:b"), true);
    assert.equal(mock.profiles.has("openai-codex:c"), false);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("runTokenKeepalive in offline mode still runs unchanged (no cloud calls)", async () => {
  const { stateDir, localStateDir, codexAuthPath } = setupStateDir("codex-dashboard-keepalive-offline-");
  try {
    writeInitialStore(stateDir, {
      "openai-codex:only": buildOauthProfile({
        access: "only-access",
        refresh: "only-refresh",
        expires: Date.now() - 1_000,
        email: "only@example.com",
      }),
    }, ["openai-codex:only"]);

    // Explicitly do NOT configure cloud mode; storeMode should default to offline.
    // Track every URL the keepalive flow touches via an injected fetchImpl so
    // we can assert no traffic hits api.cloudflare.com.
    const fetchedUrls = [];
    const mock = new MockD1();
    const d1AwareFetch = async (url, init) => {
      fetchedUrls.push(String(url));
      if (String(url).includes("api.cloudflare.com")) {
        return mock.fetchImpl(url, init);
      }
      return {
        ok: true,
        status: 200,
        statusText: "",
        headers: new Map([["content-type", "application/json"]]),
        async text() { return "{}"; },
        async json() { return {}; },
      };
    };

    const result = await runTokenKeepalive(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: d1AwareFetch,
        refreshImpl: async (refreshToken) => ({
          access: `next-${refreshToken}`,
          refresh: `next-${refreshToken}`,
          expires: Date.now() + 60_000,
        }),
      },
    );

    assert.equal(result.storeMode, "offline");
    assert.equal(result.refreshedCount, 1);
    assert.equal(result.skippedLeaseCount, 0);
    assert.equal(mock.callCount, 0, "offline mode must not touch D1");
    const touchedCloudflare = fetchedUrls.some((u) => u.includes("api.cloudflare.com"));
    assert.equal(touchedCloudflare, false, "offline mode must not call Cloudflare API");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});
