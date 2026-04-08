import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { applyOrderToAuthStore, deleteProfileFromAuthStore, readAuthStore, renameProfileInAuthStore, writeAuthStore } from "../src/auth-store.js";
import { bundleContainsPlaintext, readEncryptedExportBundle } from "../src/auth-bundle.js";
import { buildCodexAuthFile, readCodexAuthFile } from "../src/codex-cli-auth.js";
import { buildStoredCodexCredential, loginWithCodex, resolveCredentialToken } from "../src/codex-auth.js";
import { deleteProfileFromConfig, syncCodexIntoConfig, touchOpenClawConfig } from "../src/config-store.js";
import { openBrowser, parseArgs } from "../src/index.js";
import { buildConfigAudit, buildWarnings, recommendProfileOrder } from "../src/order.js";
import { clearAutoAuthProfileOverrides, readSessionStore } from "../src/session-store.js";
import {
  applyOrder,
  bootstrapLocalStore,
  commitImportBundle,
  deleteProfile,
  exportBundle,
  linkCurrentCodexToProfile,
  loadDashboardState,
  loadTokenExpirySnapshot,
  LoginManager,
    previewImportBundle,
    runTokenKeepalive,
    switchCodexProfile,
    switchProfile,
    waitForOpenAICallbackPort,
  } from "../src/state.js";
import { buildQuotaBoardSummary } from "../src/quota-summary.js";
import { renderHtml } from "../src/ui.js";
import { createUsageFetch, resolveUsageProxyUrl } from "../src/usage-fetch.js";
import { clearUsageRefreshCache } from "../src/usage-refresh.js";

function createJwt(payload) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedHeader}.${encodedPayload}.signature`;
}

function restoreProxyEnv(originalEnv) {
  if (typeof originalEnv.HTTPS_PROXY === "string") {
    process.env.HTTPS_PROXY = originalEnv.HTTPS_PROXY;
  } else {
    delete process.env.HTTPS_PROXY;
  }

  if (typeof originalEnv.HTTP_PROXY === "string") {
    process.env.HTTP_PROXY = originalEnv.HTTP_PROXY;
  } else {
    delete process.env.HTTP_PROXY;
  }
}

async function waitForTaskStatus(manager, taskId, expectedStatus) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const task = manager.getTask(taskId);
    if (task?.status === expectedStatus) {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Task ${taskId} did not reach status ${expectedStatus}`);
}

function writeLocalStore(stateDir, store) {
  const localAuthStorePath = path.join(stateDir, ".local", "auth-store.json");
  writeAuthStore(localAuthStorePath, store);
  return localAuthStorePath;
}

function createOauthProfile({
  access,
  refresh,
  accountId,
  email,
  expires = Date.now() + 60_000,
  codexAuth,
}) {
  return {
    type: "oauth",
    provider: "openai-codex",
    access,
    refresh,
    expires,
    accountId,
    email,
    ...(codexAuth ? { codexAuth } : {}),
  };
}

test.beforeEach(() => {
  clearUsageRefreshCache();
});

test("recommendProfileOrder prefers earlier secondary reset time", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 1,
      primary: { remainingPercent: 90, resetAt: 200 },
      secondary: { remainingPercent: 40, resetAt: 350 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 0,
      primary: { remainingPercent: 55, resetAt: 150 },
      secondary: { remainingPercent: 95, resetAt: 500 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:alpha", "openai-codex:beta"]);
});

test("recommendProfileOrder uses secondary remaining percent when resets match", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 1,
      primary: { remainingPercent: 90, resetAt: 200 },
      secondary: { remainingPercent: 40, resetAt: 400 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 0,
      primary: { remainingPercent: 55, resetAt: 150 },
      secondary: { remainingPercent: 95, resetAt: 400 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:beta", "openai-codex:alpha"]);
});

test("recommendProfileOrder pushes profiles with exhausted 7d quota behind available profiles", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 0,
      primary: { remainingPercent: 90, resetAt: 200 },
      secondary: { remainingPercent: 0, resetAt: 300 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 1,
      primary: { remainingPercent: 60, resetAt: 250 },
      secondary: { remainingPercent: 25, resetAt: 500 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:beta", "openai-codex:alpha"]);
});

test("recommendProfileOrder pushes profiles with exhausted 5h quota behind available profiles", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 0,
      primary: { remainingPercent: 0, resetAt: 200 },
      secondary: { remainingPercent: 90, resetAt: 300 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 1,
      primary: { remainingPercent: 25, resetAt: 250 },
      secondary: { remainingPercent: 20, resetAt: 500 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:beta", "openai-codex:alpha"]);
});

test("recommendProfileOrder pushes profiles with 5h remaining at or below 5 percent behind eligible profiles", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 0,
      primary: { remainingPercent: 5, resetAt: 200 },
      secondary: { remainingPercent: 90, resetAt: 300 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 1,
      primary: { remainingPercent: 6, resetAt: 250 },
      secondary: { remainingPercent: 20, resetAt: 500 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:beta", "openai-codex:alpha"]);
});

test("recommendProfileOrder pushes errors to the end", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:ok",
      currentOrderIndex: 0,
      primary: { remainingPercent: 80, resetAt: 200 },
      secondary: { remainingPercent: 80, resetAt: 300 },
      error: null,
    },
    {
      profileId: "openai-codex:bad",
      currentOrderIndex: 1,
      primary: { remainingPercent: null, resetAt: null },
      secondary: { remainingPercent: null, resetAt: null },
      error: "Token expired",
    },
  ]);

  assert.deepEqual(order, ["openai-codex:ok", "openai-codex:bad"]);
});

test("renameProfileInAuthStore updates related references", () => {
  const store = {
    version: 1,
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "access",
        refresh: "refresh",
        expires: Date.now() + 1000,
      },
    },
    order: {
      "openai-codex": ["openai-codex:default"],
    },
    lastGood: {
      "openai-codex": "openai-codex:default",
    },
    usageStats: {
      "openai-codex:default": { lastUsed: 1 },
    },
  };

  const renamed = renameProfileInAuthStore(store, "openai-codex:default", "openai-codex:work");

  assert.equal(renamed.profiles["openai-codex:default"], undefined);
  assert.ok(renamed.profiles["openai-codex:work"]);
  assert.deepEqual(renamed.order["openai-codex"], ["openai-codex:work"]);
  assert.equal(renamed.lastGood["openai-codex"], "openai-codex:work");
  assert.deepEqual(renamed.usageStats["openai-codex:work"], { lastUsed: 1 });
});

test("applyOrderToAuthStore de-duplicates order values", () => {
  const store = {
    version: 1,
    profiles: {},
  };
  const updated = applyOrderToAuthStore(store, [
    "openai-codex:b",
    "openai-codex:a",
    "openai-codex:b",
  ]);

  assert.deepEqual(updated.order["openai-codex"], ["openai-codex:b", "openai-codex:a"]);
});

test("deleteProfileFromAuthStore removes related references", () => {
  const store = {
    version: 1,
    profiles: {
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
      },
    },
    order: {
      "openai-codex": ["openai-codex:work"],
    },
    lastGood: {
      "openai-codex": "openai-codex:work",
    },
    usageStats: {
      "openai-codex:work": { lastUsed: 1 },
    },
  };

  const updated = deleteProfileFromAuthStore(store, "openai-codex:work");

  assert.deepEqual(updated.profiles, {});
  assert.equal(updated.order, undefined);
  assert.equal(updated.lastGood, undefined);
  assert.equal(updated.usageStats, undefined);
});

test("buildStoredCodexCredential preserves Codex sidecar fields for export", () => {
  const credential = buildStoredCodexCredential({
    access: "access-token",
    refresh: "refresh-token",
    expires: Date.now() + 60_000,
    accountId: "account-id",
    email: "person@example.com",
    idToken: "id-token",
    authMode: "chatgpt",
    lastRefresh: "2026-04-02T18:02:46.501Z",
  });

  assert.deepEqual(buildCodexAuthFile(credential), {
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: "id-token",
      access_token: "access-token",
      refresh_token: "refresh-token",
      account_id: "account-id",
    },
    last_refresh: "2026-04-02T18:02:46.501Z",
  });
});

test("syncCodexIntoConfig adds missing profiles and order entries", () => {
  const config = {
    auth: {
      profiles: {
        "openai-codex:work": {
          provider: "openai-codex",
          mode: "oauth",
        },
      },
      order: {
        "openai-codex": ["openai-codex:work"],
      },
    },
  };

  const synced = syncCodexIntoConfig(
    config,
    ["openai-codex:work", "openai-codex:personal"],
    ["openai-codex:personal", "openai-codex:work"],
  );

  assert.deepEqual(synced.auth.profiles["openai-codex:personal"], {
    provider: "openai-codex",
    mode: "oauth",
  });
  assert.deepEqual(synced.auth.order["openai-codex"], [
    "openai-codex:work",
    "openai-codex:personal",
  ]);
});

test("deleteProfileFromConfig removes profile and order entry", () => {
  const config = {
    auth: {
      profiles: {
        "openai-codex:work": {
          provider: "openai-codex",
          mode: "oauth",
        },
      },
      order: {
        "openai-codex": ["openai-codex:work"],
      },
    },
  };

  const updated = deleteProfileFromConfig(config, "openai-codex:work");

  assert.deepEqual(updated.auth, {});
});

test("touchOpenClawConfig updates meta.lastTouchedAt", () => {
  const updated = touchOpenClawConfig(
    {
      meta: {
        lastTouchedVersion: "2026.3.12",
      },
    },
    "2026-03-14T12:00:00.000Z",
  );

  assert.equal(updated.meta.lastTouchedVersion, "2026.3.12");
  assert.equal(updated.meta.lastTouchedAt, "2026-03-14T12:00:00.000Z");
});

test("clearAutoAuthProfileOverrides keeps preferred and user-selected sessions", () => {
  const result = clearAutoAuthProfileOverrides({
    "agent:main:one": {
      sessionId: "one",
      updatedAt: 1,
      authProfileOverride: "openai-codex:default",
      authProfileOverrideSource: "auto",
      authProfileOverrideCompactionCount: 0,
    },
    "agent:main:two": {
      sessionId: "two",
      updatedAt: 1,
      authProfileOverride: "openai-codex:work",
      authProfileOverrideSource: "auto",
      authProfileOverrideCompactionCount: 0,
    },
    "agent:main:three": {
      sessionId: "three",
      updatedAt: 1,
      authProfileOverride: "openai-codex:manual",
      authProfileOverrideSource: "user",
      authProfileOverrideCompactionCount: 0,
    },
  }, {
    preferredProfileId: "openai-codex:work",
  });

  assert.equal(result.clearedCount, 1);
  assert.equal(result.store["agent:main:one"].authProfileOverride, undefined);
  assert.equal(result.store["agent:main:two"].authProfileOverride, "openai-codex:work");
  assert.equal(result.store["agent:main:three"].authProfileOverride, "openai-codex:manual");
});

test("applyOrder touches config and clears auto session overrides for older codex profiles", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-state-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const sessionsDir = path.join(stateDir, "agents", "main", "sessions");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(sessionsDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 1,
    profiles: {
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "default-token",
      },
      "openai-codex:work": {
        type: "token",
        provider: "openai-codex",
        token: "work-token",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  }, null, 2));
  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "default-token",
      },
      "openai-codex:work": {
        type: "token",
        provider: "openai-codex",
        token: "work-token",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  fs.writeFileSync(path.join(stateDir, "openclaw.json"), JSON.stringify({
    meta: {
      lastTouchedVersion: "2026.3.12",
      lastTouchedAt: "2026-03-14T00:00:00.000Z",
    },
    auth: {
      profiles: {
        "openai-codex:default": { provider: "openai-codex", mode: "oauth" },
        "openai-codex:work": { provider: "openai-codex", mode: "oauth" },
      },
      order: {
        "openai-codex": ["openai-codex:default", "openai-codex:work"],
      },
    },
  }, null, 2));

  fs.writeFileSync(path.join(sessionsDir, "sessions.json"), JSON.stringify({
    "agent:main:old": {
      sessionId: "old",
      updatedAt: 1,
      authProfileOverride: "openai-codex:default",
      authProfileOverrideSource: "auto",
      authProfileOverrideCompactionCount: 0,
      modelProvider: "openai-codex",
      model: "gpt-5.4",
    },
    "agent:main:preferred": {
      sessionId: "preferred",
      updatedAt: 1,
      authProfileOverride: "openai-codex:work",
      authProfileOverrideSource: "auto",
      authProfileOverrideCompactionCount: 0,
      modelProvider: "openai-codex",
      model: "gpt-5.4",
    },
    "agent:main:user": {
      sessionId: "user",
      updatedAt: 1,
      authProfileOverride: "openai-codex:default",
      authProfileOverrideSource: "user",
      authProfileOverrideCompactionCount: 0,
      modelProvider: "openai-codex",
      model: "gpt-5.4",
    },
  }, null, 2));

  try {
    await applyOrder(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      ["openai-codex:work", "openai-codex:default"],
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: {
                  used_percent: 20,
                  reset_at: 200,
                  limit_window_seconds: 18000,
                },
                secondary_window: {
                  used_percent: 30,
                  reset_at: 400,
                  limit_window_seconds: 604800,
                },
              },
            };
          },
        }),
      },
    );

    const authStore = JSON.parse(fs.readFileSync(path.join(agentDir, "auth-profiles.json"), "utf8"));
    assert.deepEqual(authStore.order["openai-codex"], ["openai-codex:work", "openai-codex:default"]);

    const config = JSON.parse(fs.readFileSync(path.join(stateDir, "openclaw.json"), "utf8"));
    assert.equal(config.meta.lastTouchedVersion, "2026.3.12");
    assert.notEqual(config.meta.lastTouchedAt, "2026-03-14T00:00:00.000Z");

    const sessions = readSessionStore(path.join(sessionsDir, "sessions.json"));
    assert.equal(sessions["agent:main:old"].authProfileOverride, undefined);
    assert.equal(sessions["agent:main:preferred"].authProfileOverride, "openai-codex:work");
    assert.equal(sessions["agent:main:user"].authProfileOverride, "openai-codex:default");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("applyOrder only overwrites the managed openai-codex slice in runtime auth-profiles", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-apply-runtime-scope-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    preserveMe: {
      source: "runtime",
    },
    profiles: {
      "openai:manual": {
        type: "token",
        provider: "openai",
        token: "manual-token",
      },
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "runtime-default-token",
      },
      "openai-codex:work": {
        type: "token",
        provider: "openai-codex",
        token: "runtime-work-token",
      },
    },
    order: {
      openai: ["openai:manual"],
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
    lastGood: {
      openai: "openai:manual",
      "openai-codex": "openai-codex:default",
    },
    usageStats: {
      "openai:manual": {
        totalRequests: 7,
      },
      "openai-codex:default": {
        totalRequests: 1,
      },
    },
  }, null, 2));

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "local-default-token",
      },
      "openai-codex:work": {
        type: "token",
        provider: "openai-codex",
        token: "local-work-token",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
    lastGood: {
      "openai-codex": "openai-codex:default",
    },
    usageStats: {
      "openai-codex:default": {
        totalRequests: 11,
      },
      "openai-codex:work": {
        totalRequests: 12,
      },
    },
  });

  try {
    await applyOrder(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      ["openai-codex:work", "openai-codex:default"],
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 20, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 30, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const runtimeRaw = JSON.parse(fs.readFileSync(path.join(agentDir, "auth-profiles.json"), "utf8"));
    assert.deepEqual(runtimeRaw.preserveMe, { source: "runtime" });
    assert.deepEqual(runtimeRaw.profiles["openai:manual"], {
      type: "token",
      provider: "openai",
      token: "manual-token",
    });
    assert.deepEqual(runtimeRaw.order.openai, ["openai:manual"]);
    assert.equal(runtimeRaw.lastGood.openai, "openai:manual");
    assert.deepEqual(runtimeRaw.usageStats["openai:manual"], { totalRequests: 7 });

    assert.deepEqual(runtimeRaw.order["openai-codex"], ["openai-codex:work", "openai-codex:default"]);
    assert.equal(runtimeRaw.profiles["openai-codex:default"].token, "local-default-token");
    assert.equal(runtimeRaw.profiles["openai-codex:work"].token, "local-work-token");
    assert.deepEqual(runtimeRaw.usageStats["openai-codex:work"], { totalRequests: 12 });
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("applyOrder can sync Codex selection when applying a recommended order", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-apply-sync-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-work",
        email: "work@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "work-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  try {
    const state = await applyOrder(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      ["openai-codex:work", "openai-codex:default"],
      {
        syncCodexSelection: true,
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 20, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 30, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    assert.equal(state.applyResult?.codexSelectionAttempted, true);
    assert.equal(state.applyResult?.codexSelectionUpdated, true);
    assert.equal(state.applyResult?.codexSelectionProfileId, "openai-codex:work");
    assert.equal(state.applyResult?.codexSelectionSkippedReason, null);

    const runtimeStore = readAuthStore(path.join(agentDir, "auth-profiles.json"));
    assert.deepEqual(runtimeStore.order["openai-codex"], ["openai-codex:work", "openai-codex:default"]);

    const codexAuth = readCodexAuthFile(codexAuthPath);
    assert.equal(codexAuth.tokens.idToken, "work-id-token");
    assert.equal(codexAuth.tokens.accessToken, "work-access");
    assert.equal(codexAuth.tokens.refreshToken, "work-refresh");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("applyOrder skips Codex sync when the recommended top profile is not Codex-compatible", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-apply-skip-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(path.dirname(codexAuthPath), { recursive: true });

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-work",
        email: "work@example.com",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  fs.writeFileSync(codexAuthPath, JSON.stringify({
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: "default-id-token",
      access_token: "default-access",
      refresh_token: "default-refresh",
      account_id: "account-default",
    },
    last_refresh: "2026-04-02T18:02:46.501Z",
  }, null, 2));

  try {
    const state = await applyOrder(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      ["openai-codex:work", "openai-codex:default"],
      {
        syncCodexSelection: true,
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 20, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 30, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    assert.equal(state.applyResult?.codexSelectionAttempted, true);
    assert.equal(state.applyResult?.codexSelectionUpdated, false);
    assert.equal(state.applyResult?.codexSelectionProfileId, "openai-codex:work");
    assert.equal(state.applyResult?.codexSelectionSkippedReason, "缺少 Codex id_token");

    const runtimeStore = readAuthStore(path.join(agentDir, "auth-profiles.json"));
    assert.deepEqual(runtimeStore.order["openai-codex"], ["openai-codex:work", "openai-codex:default"]);

    const codexAuth = readCodexAuthFile(codexAuthPath);
    assert.equal(codexAuth.tokens.idToken, "default-id-token");
    assert.equal(codexAuth.tokens.accessToken, "default-access");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("linkCurrentCodexToProfile absorbs matching current Codex auth sidecar", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-link-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 1,
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "same-access",
        refresh: "same-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-id",
        email: "person@example.com",
      },
    },
  }, null, 2));
  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "same-access",
        refresh: "same-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-id",
        email: "person@example.com",
      },
    },
  });

  fs.mkdirSync(path.dirname(codexAuthPath), { recursive: true });
  fs.writeFileSync(codexAuthPath, JSON.stringify({
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: "id-token",
      access_token: "same-access",
      refresh_token: "same-refresh",
      account_id: "account-id",
    },
    last_refresh: "2026-04-02T18:02:46.501Z",
  }, null, 2));

  try {
    await linkCurrentCodexToProfile(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      "openai-codex:default",
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 10, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 20, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const store = readAuthStore(path.join(localStateDir, "auth-store.json"));
    assert.deepEqual(store.profiles["openai-codex:default"].codexAuth, {
      authMode: "chatgpt",
      idToken: "id-token",
      lastRefresh: "2026-04-02T18:02:46.501Z",
    });
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("switchProfile writes projected ~/.codex/auth.json for Codex-compatible profiles", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-switch-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-work",
        email: "work@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "work-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  }, null, 2));
  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-work",
        email: "work@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "work-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  try {
    await switchProfile(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      "openai-codex:work",
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const store = readAuthStore(path.join(agentDir, "auth-profiles.json"));
    assert.deepEqual(store.order["openai-codex"], ["openai-codex:work", "openai-codex:default"]);

    const codexAuth = readCodexAuthFile(codexAuthPath);
    assert.ok(codexAuth);
    assert.equal(codexAuth.tokens.idToken, "work-id-token");
    assert.equal(codexAuth.tokens.accessToken, "work-access");
    assert.equal(codexAuth.tokens.refreshToken, "work-refresh");
    assert.equal(codexAuth.tokens.accountId, "account-work");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("switchCodexProfile rewrites only Codex auth while leaving OpenClaw order untouched", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-switch-codex-only-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        accountId: "account-default",
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        accountId: "account-work",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  }, null, 2));
  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        expires: Date.now() + 60_000,
        accountId: "account-work",
        email: "work@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "work-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  try {
    await switchCodexProfile(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      "openai-codex:work",
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const runtimeStore = readAuthStore(path.join(agentDir, "auth-profiles.json"));
    assert.deepEqual(runtimeStore.order["openai-codex"], ["openai-codex:default", "openai-codex:work"]);

    const codexAuth = readCodexAuthFile(codexAuthPath);
    assert.ok(codexAuth);
    assert.equal(codexAuth.tokens.idToken, "work-id-token");
    assert.equal(codexAuth.tokens.accessToken, "work-access");
    assert.equal(codexAuth.tokens.refreshToken, "work-refresh");
    assert.equal(codexAuth.tokens.accountId, "account-work");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("deleteProfile only removes managed openai-codex runtime entries", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-delete-runtime-scope-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    profiles: {
      "openai:manual": {
        type: "token",
        provider: "openai",
        token: "manual-token",
      },
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "default-token",
      },
      "openai-codex:work": {
        type: "token",
        provider: "openai-codex",
        token: "work-token",
      },
    },
    order: {
      openai: ["openai:manual"],
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
    lastGood: {
      openai: "openai:manual",
      "openai-codex": "openai-codex:work",
    },
    usageStats: {
      "openai:manual": {
        totalRequests: 7,
      },
      "openai-codex:default": {
        totalRequests: 1,
      },
      "openai-codex:work": {
        totalRequests: 2,
      },
    },
  }, null, 2));

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "default-token",
      },
      "openai-codex:work": {
        type: "token",
        provider: "openai-codex",
        token: "work-token",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
    lastGood: {
      "openai-codex": "openai-codex:work",
    },
    usageStats: {
      "openai-codex:default": {
        totalRequests: 1,
      },
      "openai-codex:work": {
        totalRequests: 2,
      },
    },
  });

  try {
    await deleteProfile(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      "openai-codex:work",
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const runtimeRaw = JSON.parse(fs.readFileSync(path.join(agentDir, "auth-profiles.json"), "utf8"));
    assert.deepEqual(runtimeRaw.profiles["openai:manual"], {
      type: "token",
      provider: "openai",
      token: "manual-token",
    });
    assert.deepEqual(runtimeRaw.order.openai, ["openai:manual"]);
    assert.equal(runtimeRaw.lastGood.openai, "openai:manual");
    assert.deepEqual(runtimeRaw.usageStats["openai:manual"], { totalRequests: 7 });

    assert.equal(runtimeRaw.profiles["openai-codex:work"], undefined);
    assert.deepEqual(runtimeRaw.order["openai-codex"], ["openai-codex:default"]);
    assert.equal(runtimeRaw.lastGood["openai-codex"], undefined);
    assert.equal(runtimeRaw.usageStats["openai-codex:work"], undefined);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState does not implicitly refresh OAuth credentials", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-state-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  let refreshCalls = 0;

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "stale-access",
        refresh: "stale-refresh",
        expires: Date.now() - 1_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
  });

  try {
    await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        refreshImpl: async () => {
          refreshCalls += 1;
          return {
            access: "new-access",
            refresh: "new-refresh",
            expires: Date.now() + 60_000,
          };
        },
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    assert.equal(refreshCalls, 0);
    const store = readAuthStore(path.join(localStateDir, "auth-store.json"));
    assert.equal(store.profiles["openai-codex:default"].access, "stale-access");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState ignores runtime drift outside the managed openai-codex slice", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-runtime-drift-scope-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "default-token",
      },
    },
    order: {
      "openai-codex": ["openai-codex:default"],
    },
    lastGood: {
      "openai-codex": "openai-codex:default",
    },
    usageStats: {
      "openai-codex:default": {
        totalRequests: 1,
      },
    },
  });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    profiles: {
      "openai:manual": {
        type: "token",
        provider: "openai",
        token: "manual-token",
      },
      "openai-codex:default": {
        type: "token",
        provider: "openai-codex",
        token: "default-token",
      },
    },
    order: {
      openai: ["openai:manual"],
      "openai-codex": ["openai-codex:default"],
    },
    lastGood: {
      openai: "openai:manual",
      "openai-codex": "openai-codex:default",
    },
    usageStats: {
      "openai:manual": {
        totalRequests: 99,
      },
      "openai-codex:default": {
        totalRequests: 1,
      },
    },
  }, null, 2));

  try {
    const state = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    assert.equal(state.runtimeAuth.drift, false);
    assert.equal(
      state.warnings.some((warning) => warning.includes("managed openai-codex entries have drifted")),
      false,
    );
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState limits quota refresh concurrency to two remote requests", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-concurrency-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  let callCount = 0;
  let activeRequests = 0;
  let maxActiveRequests = 0;

  writeLocalStore(stateDir, {
    profiles: Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => {
        const profileId = `openai-codex:profile-${index + 1}`;
        return [profileId, createOauthProfile({
          access: `access-${index + 1}`,
          refresh: `refresh-${index + 1}`,
          accountId: `account-${index + 1}`,
          email: `user${index + 1}@example.com`,
        })];
      }),
    ),
  });

  try {
    const state = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async () => {
          callCount += 1;
          activeRequests += 1;
          maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
          await new Promise((resolve) => setTimeout(resolve, 20));
          activeRequests -= 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 10, reset_at: 200, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 20, reset_at: 400, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    assert.equal(callCount, 5);
    assert.equal(maxActiveRequests, 2);
    assert.equal(state.usageRefreshMetrics.remoteFetchCount, 5);
    assert.equal(state.usageRefreshMetrics.cacheHitCount, 0);
    assert.equal(state.usageRefreshMetrics.concurrencyLimit, 2);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState marks low 5h quota profiles as ineligible for automatic recommendation", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-low-quota-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:alpha": createOauthProfile({
        access: "alpha-access",
        refresh: "alpha-refresh",
        accountId: "account-alpha",
        email: "alpha@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "alpha-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:beta": createOauthProfile({
        access: "beta-access",
        refresh: "beta-refresh",
        accountId: "account-beta",
        email: "beta@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "beta-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
    },
    order: {
      "openai-codex": ["openai-codex:alpha", "openai-codex:beta"],
    },
  });

  try {
    const state = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async (_url, options) => {
          const token = options?.headers?.Authorization;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: token === "Bearer alpha-access"
                  ? {
                      primary_window: { used_percent: 95, reset_at: 200, limit_window_seconds: 18000 },
                      secondary_window: { used_percent: 10, reset_at: 400, limit_window_seconds: 604800 },
                    }
                  : {
                      primary_window: { used_percent: 80, reset_at: 250, limit_window_seconds: 18000 },
                      secondary_window: { used_percent: 30, reset_at: 500, limit_window_seconds: 604800 },
                    },
              };
            },
          };
        },
      },
    );

    assert.deepEqual(state.recommendedOrder, ["openai-codex:beta", "openai-codex:alpha"]);
    assert.equal(state.recommendedSelectionProfileId, "openai-codex:beta");
    assert.equal(state.recommendedSelectionBlockedReason, null);

    const alpha = state.rows.find((row) => row.profileId === "openai-codex:alpha");
    const beta = state.rows.find((row) => row.profileId === "openai-codex:beta");
    assert.equal(alpha?.recommendationEligible, false);
    assert.match(alpha?.recommendationBlockedReason || "", /5h 可用额度 <= 5%/);
    assert.equal(beta?.recommendationEligible, true);
    assert.equal(beta?.recommendationBlockedReason, null);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState reuses cached quota results within thirty seconds", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-cache-hit-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  let now = 1_000;
  let callCount = 0;

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": createOauthProfile({
        access: "cache-access-1",
        refresh: "cache-refresh-1",
        accountId: "cache-account-1",
        email: "default@example.com",
      }),
      "openai-codex:work": createOauthProfile({
        access: "cache-access-2",
        refresh: "cache-refresh-2",
        accountId: "cache-account-2",
        email: "work@example.com",
      }),
    },
  });

  try {
    const firstState = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        now: () => now,
        fetchImpl: async () => {
          callCount += 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    now += 1_000;
    const secondState = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        now: () => now,
        fetchImpl: async () => {
          callCount += 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 99, reset_at: 999, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 99, reset_at: 999, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    assert.equal(callCount, 2);
    assert.equal(firstState.usageRefreshMetrics.remoteFetchCount, 2);
    assert.equal(firstState.usageRefreshMetrics.cacheHitCount, 0);
    assert.equal(secondState.usageRefreshMetrics.remoteFetchCount, 0);
    assert.equal(secondState.usageRefreshMetrics.cacheHitCount, 2);
    assert.equal(secondState.rows[0].secondary.usedPercent, firstState.rows[0].secondary.usedPercent);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState recommends a separate Codex profile and avoids the OpenClaw top account", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-codex-recommend-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:alpha": createOauthProfile({
        access: "alpha-access",
        refresh: "alpha-refresh",
        accountId: "account-alpha",
        email: "alpha@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "alpha-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:beta": createOauthProfile({
        access: "beta-access",
        refresh: "beta-refresh",
        accountId: "account-beta",
        email: "beta@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "beta-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:gamma": createOauthProfile({
        access: "gamma-access",
        refresh: "gamma-refresh",
        accountId: "account-gamma",
        email: "gamma@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "gamma-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
    },
    order: {
      "openai-codex": ["openai-codex:alpha", "openai-codex:beta", "openai-codex:gamma"],
    },
  });

  try {
    const state = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async (_url, options) => {
          const token = options?.headers?.Authorization;
          return {
            ok: true,
            async json() {
              if (token === "Bearer alpha-access") {
                return {
                  rate_limit: {
                    primary_window: { used_percent: 20, reset_at: 200, limit_window_seconds: 18000 },
                    secondary_window: { used_percent: 10, reset_at: 100, limit_window_seconds: 604800 },
                  },
                };
              }
              if (token === "Bearer beta-access") {
                return {
                  rate_limit: {
                    primary_window: { used_percent: 10, reset_at: 300, limit_window_seconds: 18000 },
                    secondary_window: { used_percent: 60, reset_at: 500, limit_window_seconds: 604800 },
                  },
                };
              }
              return {
                rate_limit: {
                  primary_window: { used_percent: 40, reset_at: 250, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 10, reset_at: 110, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    assert.equal(state.recommendedSelectionProfileId, "openai-codex:alpha");
    assert.equal(state.codexRecommendedProfileId, "openai-codex:beta");
    assert.equal(state.codexWouldDivergeFromOpenClaw, true);
    assert.equal(state.codexRecommendedBlockedReason, null);

    const alpha = state.rows.find((row) => row.profileId === "openai-codex:alpha");
    const beta = state.rows.find((row) => row.profileId === "openai-codex:beta");
    assert.equal(alpha?.codexRecommended, false);
    assert.equal(beta?.codexRecommended, true);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState suggests an independent Codex switch only when the current Codex account is low on quota", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-codex-low-quota-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(path.dirname(codexAuthPath), { recursive: true });

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:alpha": createOauthProfile({
        access: "alpha-access",
        refresh: "alpha-refresh",
        accountId: "account-alpha",
        email: "alpha@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "alpha-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:beta": createOauthProfile({
        access: "beta-access",
        refresh: "beta-refresh",
        accountId: "account-beta",
        email: "beta@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "beta-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:gamma": createOauthProfile({
        access: "gamma-access",
        refresh: "gamma-refresh",
        accountId: "account-gamma",
        email: "gamma@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "gamma-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
    },
    order: {
      "openai-codex": ["openai-codex:alpha", "openai-codex:beta", "openai-codex:gamma"],
    },
  });

  fs.writeFileSync(codexAuthPath, JSON.stringify({
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: "beta-id-token",
      access_token: "beta-access",
      refresh_token: "beta-refresh",
      account_id: "account-beta",
    },
    last_refresh: "2026-04-02T18:02:46.501Z",
  }, null, 2));

  try {
    const state = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async (_url, options) => {
          const token = options?.headers?.Authorization;
          return {
            ok: true,
            async json() {
              if (token === "Bearer alpha-access") {
                return {
                  rate_limit: {
                    primary_window: { used_percent: 20, reset_at: 200, limit_window_seconds: 18000 },
                    secondary_window: { used_percent: 15, reset_at: 100, limit_window_seconds: 604800 },
                  },
                };
              }
              if (token === "Bearer beta-access") {
                return {
                  rate_limit: {
                    primary_window: { used_percent: 96, reset_at: 300, limit_window_seconds: 18000 },
                    secondary_window: { used_percent: 20, reset_at: 500, limit_window_seconds: 604800 },
                  },
                };
              }
              return {
                rate_limit: {
                  primary_window: { used_percent: 35, reset_at: 250, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 25, reset_at: 110, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    assert.equal(state.codexAuth.linkedProfileId, "openai-codex:beta");
    assert.equal(state.codexCurrentLowQuota, true);
    assert.equal(state.codexRecommendedProfileId, "openai-codex:gamma");
    assert.equal(state.codexAutoSwitchSuggested, true);
    assert.match(state.codexAutoSwitchReason || "", /openai-codex:gamma/);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState invalidates cached quota results when the token changes", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-cache-miss-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  let now = 1_000;
  let callCount = 0;

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": createOauthProfile({
        access: "original-access",
        refresh: "original-refresh",
        accountId: "account-default",
        email: "default@example.com",
      }),
    },
  });

  try {
    await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        now: () => now,
        fetchImpl: async () => {
          callCount += 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 10, reset_at: 200, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 20, reset_at: 400, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    writeLocalStore(stateDir, {
      profiles: {
        "openai-codex:default": createOauthProfile({
          access: "rotated-access",
          refresh: "original-refresh",
          accountId: "account-default",
          email: "default@example.com",
        }),
      },
    });

    now += 1_000;
    const secondState = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        now: () => now,
        fetchImpl: async () => {
          callCount += 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 35, reset_at: 500, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 45, reset_at: 800, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    assert.equal(callCount, 2);
    assert.equal(secondState.usageRefreshMetrics.remoteFetchCount, 1);
    assert.equal(secondState.usageRefreshMetrics.cacheHitCount, 0);
    assert.equal(secondState.rows[0].secondary.usedPercent, 45);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("applyOrder reuses warm quota cache when it reloads dashboard state", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-apply-cache-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  let now = 1_000;
  let callCount = 0;

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": createOauthProfile({
        access: "apply-access-default",
        refresh: "apply-refresh-default",
        accountId: "apply-account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:work": createOauthProfile({
        access: "apply-access-work",
        refresh: "apply-refresh-work",
        accountId: "apply-account-work",
        email: "work@example.com",
      }),
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  try {
    await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        now: () => now,
        fetchImpl: async () => {
          callCount += 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 20, reset_at: 200, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 30, reset_at: 400, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    now += 1_000;
    const state = await applyOrder(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      ["openai-codex:work", "openai-codex:default"],
      {
        syncCodexSelection: true,
        now: () => now,
        fetchImpl: async () => {
          callCount += 1;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: {
                  primary_window: { used_percent: 80, reset_at: 900, limit_window_seconds: 18000 },
                  secondary_window: { used_percent: 90, reset_at: 1200, limit_window_seconds: 604800 },
                },
              };
            },
          };
        },
      },
    );

    assert.equal(callCount, 2);
    assert.equal(state.applyResult?.codexSelectionAttempted, true);
    assert.equal(state.applyResult?.codexSelectionUpdated, false);
    assert.equal(state.usageRefreshMetrics.remoteFetchCount, 0);
    assert.equal(state.usageRefreshMetrics.cacheHitCount, 2);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("loadDashboardState blocks automatic recommendation when every profile has 5h remaining at or below 5 percent", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-all-low-quota-"));
  const localStateDir = path.join(stateDir, ".local");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:alpha": createOauthProfile({
        access: "alpha-access",
        refresh: "alpha-refresh",
        accountId: "account-alpha",
        email: "alpha@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "alpha-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
      "openai-codex:beta": createOauthProfile({
        access: "beta-access",
        refresh: "beta-refresh",
        accountId: "account-beta",
        email: "beta@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "beta-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      }),
    },
    order: {
      "openai-codex": ["openai-codex:alpha", "openai-codex:beta"],
    },
  });

  try {
    const state = await loadDashboardState(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async (_url, options) => {
          const token = options?.headers?.Authorization;
          return {
            ok: true,
            async json() {
              return {
                rate_limit: token === "Bearer alpha-access"
                  ? {
                      primary_window: { used_percent: 95, reset_at: 200, limit_window_seconds: 18000 },
                      secondary_window: { used_percent: 20, reset_at: 400, limit_window_seconds: 604800 },
                    }
                  : {
                      primary_window: { used_percent: 97, reset_at: 250, limit_window_seconds: 18000 },
                      secondary_window: { used_percent: 30, reset_at: 500, limit_window_seconds: 604800 },
                    },
              };
            },
          };
        },
      },
    );

    assert.deepEqual(state.recommendedOrder, ["openai-codex:alpha", "openai-codex:beta"]);
    assert.equal(state.recommendedSelectionProfileId, null);
    assert.equal(state.recommendedSelectionBlockedReason, "全部账号 5h 可用额度 <= 5%，暂不自动应用推荐顺序。");
    assert.equal(state.rows.every((row) => row.recommendationEligible === false), true);
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("runTokenKeepalive refreshes OAuth profiles, updates maintenance, and rewrites runtime projections", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-keepalive-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "default-access",
        refresh: "default-refresh",
        expires: Date.now() - 1_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "work-access",
        refresh: "work-refresh",
        expires: Date.now() - 1_000,
        accountId: "account-work",
        email: "work@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "work-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:default", "openai-codex:work"],
    },
  });

  try {
    const result = await runTokenKeepalive(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        refreshImpl: async (refreshToken) => ({
          access: `next-${refreshToken}`,
          refresh: `next-${refreshToken}`,
          expires: Date.now() + 60_000,
        }),
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 12, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 22, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    assert.equal(result.refreshedCount, 2);
    assert.equal(result.exportedRuntime, true);
    assert.deepEqual(result.changedProfileIds, ["openai-codex:default", "openai-codex:work"]);

    const localStore = readAuthStore(path.join(localStateDir, "auth-store.json"));
    assert.equal(localStore.profiles["openai-codex:default"].access, "next-default-refresh");
    assert.equal(localStore.profiles["openai-codex:work"].refresh, "next-work-refresh");
    assert.ok(localStore.maintenance?.lastAttemptAt);
    assert.deepEqual(localStore.maintenance?.lastChangedProfileIds, ["openai-codex:default", "openai-codex:work"]);

    const runtimeRaw = JSON.parse(fs.readFileSync(path.join(agentDir, "auth-profiles.json"), "utf8"));
    assert.equal(runtimeRaw.maintenance, undefined);
    assert.equal(runtimeRaw.profiles["openai-codex:default"].access, "next-default-refresh");

    const codexAuth = readCodexAuthFile(codexAuthPath);
    assert.equal(codexAuth.tokens.accessToken, "next-default-refresh");
    assert.equal(codexAuth.tokens.refreshToken, "next-default-refresh");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("runTokenKeepalive preserves unrelated runtime entries while refreshing codex profiles", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-keepalive-runtime-scope-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    profiles: {
      "openai:manual": {
        type: "token",
        provider: "openai",
        token: "manual-token",
      },
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "stale-access",
        refresh: "stale-refresh",
        expires: Date.now() - 1_000,
        accountId: "account-default",
        email: "default@example.com",
      },
    },
    order: {
      openai: ["openai:manual"],
      "openai-codex": ["openai-codex:default"],
    },
    usageStats: {
      "openai:manual": {
        totalRequests: 7,
      },
    },
  }, null, 2));

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "stale-access",
        refresh: "stale-refresh",
        expires: Date.now() - 1_000,
        accountId: "account-default",
        email: "default@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "default-id-token",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:default"],
    },
  });

  try {
    await runTokenKeepalive(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        refreshImpl: async () => ({
          access: "next-access",
          refresh: "next-refresh",
          expires: Date.now() + 60_000,
        }),
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 12, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 22, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const runtimeRaw = JSON.parse(fs.readFileSync(path.join(agentDir, "auth-profiles.json"), "utf8"));
    assert.deepEqual(runtimeRaw.profiles["openai:manual"], {
      type: "token",
      provider: "openai",
      token: "manual-token",
    });
    assert.deepEqual(runtimeRaw.order.openai, ["openai:manual"]);
    assert.deepEqual(runtimeRaw.usageStats["openai:manual"], { totalRequests: 7 });
    assert.equal(runtimeRaw.profiles["openai-codex:default"].access, "next-access");
    assert.equal(runtimeRaw.profiles["openai-codex:default"].refresh, "next-refresh");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("openBrowser tolerates missing open command", async () => {
  const warnings = [];

  await openBrowser("http://127.0.0.1:3000", {
    logger: {
      warn(message) {
        warnings.push(message);
      },
    },
    spawn() {
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => {
        const error = new Error("spawn xdg-open ENOENT");
        error.code = "ENOENT";
        child.emit("error", error);
      });
      return child;
    },
  });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Could not open browser automatically/);
  assert.match(warnings[0], /ENOENT/);
});

test("parseArgs defaults to port 3001", () => {
  const args = parseArgs(["node", "src/index.js"]);

  assert.equal(args.port, 3001);
  assert.equal(args.open, false);
});

test("parseArgs accepts explicit port override", () => {
  const args = parseArgs(["node", "src/index.js", "--port", "3100", "--open"]);

  assert.equal(args.port, 3100);
  assert.equal(args.open, true);
});

test("parseArgs accepts codex auth override", () => {
  const args = parseArgs(["node", "src/index.js", "--codex-auth", "/tmp/codex-auth.json"]);

  assert.equal(args.codexAuthPath, "/tmp/codex-auth.json");
});

test("parseArgs accepts local state dir override", () => {
  const args = parseArgs(["node", "src/index.js", "--local-state-dir", "/tmp/local-state"]);

  assert.equal(args.localStateDir, "/tmp/local-state");
});

test("buildQuotaBoardSummary aggregates total remaining quota across readable accounts", () => {
  const summary = buildQuotaBoardSummary([
    {
      profileId: "openai-codex:alex",
      displayLabel: "alex@example.com",
      secondary: { remainingPercent: 6, resetAt: 1_710_000_000 },
      primary: { remainingPercent: 49, resetAt: 1_710_000_500 },
    },
    {
      profileId: "openai-codex:team",
      displayLabel: "team@example.com",
      secondary: { remainingPercent: 80, resetAt: 1_710_100_000 },
      primary: { remainingPercent: 25, resetAt: 1_710_200_000 },
    },
  ]);

  assert.equal(summary.totalAccounts, 2);
  assert.equal(summary.secondary.totalCapacity, 200);
  assert.equal(summary.secondary.totalRemaining, 86);
  assert.equal(summary.secondary.readableCount, 2);
  assert.equal(summary.primary.totalCapacity, 200);
  assert.equal(summary.primary.totalRemaining, 74);
  assert.equal(summary.primary.readableCount, 2);
  assert.equal(Math.round(summary.secondary.segments[0].sharePercent), 3);
  assert.equal(Math.round(summary.secondary.segments[1].sharePercent), 40);
  assert.equal(Math.round(summary.primary.segments[0].sharePercent), 25);
  assert.equal(Math.round(summary.primary.segments[1].sharePercent), 13);
});

test("buildQuotaBoardSummary excludes unreadable accounts from capacity", () => {
  const summary = buildQuotaBoardSummary([
    {
      profileId: "openai-codex:ok",
      displayLabel: "ok@example.com",
      secondary: { remainingPercent: 40, resetAt: 1_710_000_000 },
      primary: { remainingPercent: 10, resetAt: 1_710_000_500 },
    },
    {
      profileId: "openai-codex:broken",
      displayLabel: "broken@example.com",
      secondary: { remainingPercent: null, resetAt: null },
      primary: { remainingPercent: null, resetAt: null },
    },
  ]);

  assert.equal(summary.totalAccounts, 2);
  assert.equal(summary.secondary.totalCapacity, 100);
  assert.equal(summary.secondary.totalRemaining, 40);
  assert.equal(summary.secondary.readableCount, 1);
  assert.equal(summary.primary.totalCapacity, 100);
  assert.equal(summary.primary.totalRemaining, 10);
  assert.equal(summary.primary.readableCount, 1);
  assert.equal(summary.secondary.segments.length, 1);
  assert.equal(summary.primary.segments.length, 1);
});

test("renderHtml exposes accounts view toggle and compact toolbar structure", () => {
  const html = renderHtml();

  assert.match(html, /id="accountsViewQuota"/);
  assert.match(html, /额度顺序/);
  assert.match(html, /id="accountsViewGrouped"/);
  assert.match(html, /邮箱后缀分组/);
  assert.match(html, /codex-auth-dashboard\.accounts-view/);
  assert.match(html, /id="toolsMenu"/);
  assert.match(html, /更多工具/);
  assert.match(html, /id="toolbarHelpCard"/);
  assert.match(html, /id="refreshButton"[^>]*>刷新额度</);
  assert.match(html, /id="quotaBoardTitle"/);
  assert.match(html, /全局可用额度/);
  assert.match(html, /id="quotaBoardSecondaryValue"/);
  assert.match(html, /id="quotaBoardPrimaryValue"/);
  assert.match(html, /id="tabTokenRefresh"/);
  assert.match(html, /刷新 Token/);
  assert.match(html, /id="tokenRefreshButton"/);
  assert.match(html, /id="tokenRefreshIntervalInput"/);
  assert.match(html, /id="tokenReminderEnabledToggle"/);
  assert.match(html, /id="tokenReminderIntervalInput"/);
  assert.match(html, /id="tokenReminderWarnDaysInput"/);
  assert.match(html, /id="tokenReminderModalHoursInput"/);
  assert.match(html, /id="tokenReminderModal"/);
  assert.match(html, /id="codexAutomationShared"/);
  assert.match(html, /id="codexAutomationIndependent"/);
  assert.match(html, /id="codexAutomationManual"/);
  assert.match(html, /codex-auth-dashboard\.codex-automation-mode/);
  assert.doesNotMatch(html, /id="spotlightApplyButton"/);
  assert.doesNotMatch(html, /id="spotlightRefreshButton"/);
  assert.doesNotMatch(html, /id="spotlightName"/);
  assert.doesNotMatch(html, /id="spotlightQuotaRing"/);
});

test("loadTokenExpirySnapshot returns only OAuth profiles with finite expiry sorted by expiration", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-token-expiry-"));
  const localStateDir = path.join(stateDir, ".local");
  const baseTime = Date.now();

  writeLocalStore(stateDir, {
    profiles: {
      "openai-codex:late": {
        type: "oauth",
        provider: "openai-codex",
        access: "late-access",
        refresh: "late-refresh",
        expires: baseTime + 60_000,
        email: "late@example.com",
      },
      "openai-codex:early": {
        type: "oauth",
        provider: "openai-codex",
        access: "early-access",
        refresh: "early-refresh",
        expires: baseTime + 10_000,
        email: "early@example.com",
      },
      "openai-codex:no-expiry": {
        type: "oauth",
        provider: "openai-codex",
        access: "missing-access",
        refresh: "missing-refresh",
        email: "missing@example.com",
      },
      "openai-codex:token-only": {
        type: "token",
        provider: "openai-codex",
        token: "plain-token",
        expires: baseTime + 5_000,
        email: "token@example.com",
      },
    },
    order: {
      "openai-codex": ["openai-codex:late", "openai-codex:early"],
    },
  });

  try {
    const snapshot = await loadTokenExpirySnapshot({ stateDir, localStateDir, agent: "main" });

    assert.equal(snapshot.localStore.exists, true);
    assert.deepEqual(
      snapshot.profiles.map((entry) => entry.profileId),
      ["openai-codex:early", "openai-codex:late"],
    );
    assert.equal(snapshot.profiles[0].displayLabel, "early@example.com");
    assert.equal(snapshot.profiles[1].displayLabel, "late@example.com");
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("buildWarnings flags config order mismatch as informational warning", () => {
  const audit = buildConfigAudit({
    runtimeProfileIds: ["openai-codex:a", "openai-codex:b"],
    storedOrder: ["openai-codex:a", "openai-codex:b"],
    configProfileIds: ["openai-codex:a", "openai-codex:b"],
    configOrder: ["openai-codex:b", "openai-codex:a"],
  });

  const warnings = buildWarnings({
    rows: [
      { profileId: "openai-codex:a" },
      { profileId: "openai-codex:b" },
    ],
    audit,
    context: {
      localAuthStoreExists: true,
      configExists: true,
    },
  });

  assert.ok(
    warnings.includes(
      "openclaw.json auth.order differs from the local auth store order; runtime export follows the local store.",
    ),
  );
});

test("bootstrapLocalStore imports runtime auth store and matching Codex sidecar", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-bootstrap-"));
  const localStateDir = path.join(stateDir, ".local");
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const codexAuthPath = path.join(stateDir, ".codex", "auth.json");
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(path.dirname(codexAuthPath), { recursive: true });

  fs.writeFileSync(path.join(agentDir, "auth-profiles.json"), JSON.stringify({
    version: 2,
    profiles: {
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "bootstrap-access",
        refresh: "bootstrap-refresh",
        expires: Date.now() + 60_000,
        accountId: "bootstrap-account",
        email: "bootstrap@example.com",
      },
    },
    order: {
      "openai-codex": ["openai-codex:work"],
    },
  }, null, 2));
  fs.writeFileSync(codexAuthPath, JSON.stringify({
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: "bootstrap-id",
      access_token: "bootstrap-access",
      refresh_token: "bootstrap-refresh",
      account_id: "bootstrap-account",
    },
    last_refresh: "2026-04-02T18:02:46.501Z",
  }, null, 2));

  try {
    await bootstrapLocalStore(
      { stateDir, localStateDir, agent: "main", codexAuthPath },
      {
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              rate_limit: {
                primary_window: { used_percent: 10, reset_at: 200, limit_window_seconds: 18000 },
                secondary_window: { used_percent: 20, reset_at: 400, limit_window_seconds: 604800 },
              },
            };
          },
        }),
      },
    );

    const store = readAuthStore(path.join(localStateDir, "auth-store.json"));
    assert.deepEqual(store.order["openai-codex"], ["openai-codex:work"]);
    assert.deepEqual(store.profiles["openai-codex:work"].codexAuth, {
      authMode: "chatgpt",
      idToken: "bootstrap-id",
      lastRefresh: "2026-04-02T18:02:46.501Z",
    });
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("exportBundle and commitImportBundle round-trip encrypted local store", async () => {
  const sourceStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-export-src-"));
  const sourceLocalStateDir = path.join(sourceStateDir, ".local");
  const sourceCodexAuthPath = path.join(sourceStateDir, ".codex", "auth.json");
  writeLocalStore(sourceStateDir, {
    profiles: {
      "openai-codex:work": {
        type: "oauth",
        provider: "openai-codex",
        access: "export-access",
        refresh: "export-refresh",
        expires: Date.now() + 60_000,
        accountId: "export-account",
        email: "export@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "export-id",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": ["openai-codex:work"],
    },
  });

  const usageFetch = async () => ({
    ok: true,
    async json() {
      return {
        rate_limit: {
          primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
          secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
        },
      };
    },
  });

  try {
    const exported = await exportBundle(
      { stateDir: sourceStateDir, localStateDir: sourceLocalStateDir, agent: "main", codexAuthPath: sourceCodexAuthPath },
      { passphrase: "secret-passphrase" },
      { fetchImpl: usageFetch },
    );

    assert.equal(bundleContainsPlaintext(exported.bundle, "export-access"), false);
    const decrypted = readEncryptedExportBundle(exported.bundle, "secret-passphrase");
    assert.equal(decrypted.store.profiles["openai-codex:work"].access, "export-access");
    assert.equal(decrypted.store.maintenance, undefined);

    const targetStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-export-dst-"));
    const targetLocalStateDir = path.join(targetStateDir, ".local");
    const targetCodexAuthPath = path.join(targetStateDir, ".codex", "auth.json");

    try {
      const preview = await previewImportBundle(
        { stateDir: targetStateDir, localStateDir: targetLocalStateDir, agent: "main", codexAuthPath: targetCodexAuthPath },
        { bundle: exported.bundle, passphrase: "secret-passphrase" },
        { fetchImpl: usageFetch },
      );
      assert.equal(preview.preview.summary.add, 1);

      await commitImportBundle(
        { stateDir: targetStateDir, localStateDir: targetLocalStateDir, agent: "main", codexAuthPath: targetCodexAuthPath },
        { bundle: exported.bundle, passphrase: "secret-passphrase" },
        { fetchImpl: usageFetch },
      );

      const localStore = readAuthStore(path.join(targetLocalStateDir, "auth-store.json"));
      assert.equal(localStore.profiles["openai-codex:work"].codexAuth.idToken, "export-id");

      const runtimeStore = readAuthStore(path.join(targetStateDir, "agents", "main", "agent", "auth-profiles.json"));
      assert.equal(runtimeStore.profiles["openai-codex:work"].codexAuth, undefined);

      const codexAuth = readCodexAuthFile(targetCodexAuthPath);
      assert.equal(codexAuth.tokens.idToken, "export-id");
      assert.equal(codexAuth.tokens.accessToken, "export-access");
    } finally {
      fs.rmSync(targetStateDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(sourceStateDir, { recursive: true, force: true });
  }
});

test("commitImportBundle keeps Codex profiles with same accountId but different refresh tokens", async () => {
  const sourceStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-import-src-"));
  const sourceLocalStateDir = path.join(sourceStateDir, ".local");
  const sourceCodexAuthPath = path.join(sourceStateDir, ".codex", "auth.json");
  writeLocalStore(sourceStateDir, {
    profiles: {
      "openai-codex:shared-a": {
        type: "oauth",
        provider: "openai-codex",
        access: "shared-access-a",
        refresh: "shared-refresh-a",
        expires: Date.now() + 60_000,
        accountId: "shared-account",
        email: "shared-a@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "shared-id-a",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:shared-b": {
        type: "oauth",
        provider: "openai-codex",
        access: "shared-access-b",
        refresh: "shared-refresh-b",
        expires: Date.now() + 60_000,
        accountId: "shared-account",
        email: "shared-b@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "shared-id-b",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
      "openai-codex:solo": {
        type: "oauth",
        provider: "openai-codex",
        access: "solo-access",
        refresh: "solo-refresh",
        expires: Date.now() + 60_000,
        accountId: "solo-account",
        email: "solo@example.com",
        codexAuth: {
          authMode: "chatgpt",
          idToken: "solo-id",
          lastRefresh: "2026-04-02T18:02:46.501Z",
        },
      },
    },
    order: {
      "openai-codex": [
        "openai-codex:shared-a",
        "openai-codex:shared-b",
        "openai-codex:solo",
      ],
    },
  });

  const usageFetch = async () => ({
    ok: true,
    async json() {
      return {
        rate_limit: {
          primary_window: { used_percent: 15, reset_at: 200, limit_window_seconds: 18000 },
          secondary_window: { used_percent: 25, reset_at: 400, limit_window_seconds: 604800 },
        },
      };
    },
  });

  try {
    const exported = await exportBundle(
      { stateDir: sourceStateDir, localStateDir: sourceLocalStateDir, agent: "main", codexAuthPath: sourceCodexAuthPath },
      { passphrase: "secret-passphrase" },
      { fetchImpl: usageFetch },
    );

    const targetStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-dashboard-import-dst-"));
    const targetLocalStateDir = path.join(targetStateDir, ".local");
    const targetCodexAuthPath = path.join(targetStateDir, ".codex", "auth.json");
    writeLocalStore(targetStateDir, {
      profiles: {
        "openai-codex:shared-a": {
          type: "oauth",
          provider: "openai-codex",
          access: "old-shared-access-a",
          refresh: "shared-refresh-a",
          expires: Date.now() + 30_000,
          accountId: "shared-account",
          email: "old-shared-a@example.com",
          codexAuth: {
            authMode: "chatgpt",
            idToken: "old-shared-id-a",
            lastRefresh: "2026-04-01T10:00:00.000Z",
          },
        },
      },
      order: {
        "openai-codex": ["openai-codex:shared-a"],
      },
    });

    try {
      const preview = await previewImportBundle(
        { stateDir: targetStateDir, localStateDir: targetLocalStateDir, agent: "main", codexAuthPath: targetCodexAuthPath },
        { bundle: exported.bundle, passphrase: "secret-passphrase" },
        { fetchImpl: usageFetch },
      );

      assert.equal(preview.preview.summary.update, 1);
      assert.equal(preview.preview.summary.add, 2);

      await commitImportBundle(
        { stateDir: targetStateDir, localStateDir: targetLocalStateDir, agent: "main", codexAuthPath: targetCodexAuthPath },
        { bundle: exported.bundle, passphrase: "secret-passphrase" },
        { fetchImpl: usageFetch },
      );

      const localStore = readAuthStore(path.join(targetLocalStateDir, "auth-store.json"));
      assert.deepEqual(localStore.order["openai-codex"], [
        "openai-codex:shared-a",
        "openai-codex:shared-b",
        "openai-codex:solo",
      ]);
      assert.equal(localStore.profiles["openai-codex:shared-a"].email, "shared-a@example.com");
      assert.equal(localStore.profiles["openai-codex:shared-b"].email, "shared-b@example.com");
      assert.equal(localStore.profiles["openai-codex:solo"].email, "solo@example.com");
      assert.equal(localStore.profiles["openai-codex:shared-a"].refresh, "shared-refresh-a");
      assert.equal(localStore.profiles["openai-codex:shared-b"].refresh, "shared-refresh-b");
    } finally {
      fs.rmSync(targetStateDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(sourceStateDir, { recursive: true, force: true });
  }
});

test("resolveUsageProxyUrl prefers explicit URL and falls back to env", () => {
  assert.equal(
    resolveUsageProxyUrl(
      { enabled: true, url: "http://127.0.0.1:7890" },
      { HTTPS_PROXY: "http://env-proxy:8080" },
    ),
    "http://127.0.0.1:7890",
  );

  assert.equal(
    resolveUsageProxyUrl(
      { enabled: true, url: "" },
      { HTTPS_PROXY: "http://env-proxy:8080" },
    ),
    "http://env-proxy:8080",
  );

  assert.equal(resolveUsageProxyUrl({ enabled: false, url: "http://ignored:1" }, {}), null);
});

test("createUsageFetch attaches dispatcher when proxy is enabled", async () => {
  const calls = [];
  const proxyFetch = createUsageFetch(
    { enabled: true, url: "http://127.0.0.1:7890" },
    {
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return { ok: true };
      },
    },
  );

  await proxyFetch("https://chatgpt.com/backend-api/wham/usage", { method: "GET" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://chatgpt.com/backend-api/wham/usage");
  assert.equal(calls[0].init.method, "GET");
  assert.ok(calls[0].init.dispatcher);
});

test("loginWithCodex routes token exchange through configured proxy", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    HTTP_PROXY: process.env.HTTP_PROXY,
  };
  let seenError = null;

  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;

  try {
    await assert.rejects(
      async () => await loginWithCodex({
        proxyConfig: { enabled: true, url: "" },
        onAuth() {},
        waitForManualCode: async () => "code",
        onManualCodeRequested() {},
        loginImpl: async () => {
          try {
            await fetch("https://auth.openai.com/oauth/token");
          } catch (error) {
            seenError = error;
            throw error;
          }
        },
      }),
      /Usage proxy is enabled, but no proxy URL was provided/,
    );
  } finally {
    restoreProxyEnv(originalEnv);
  }

  assert.match(String(seenError?.message || ""), /Usage proxy is enabled/);
  assert.equal(globalThis.fetch, originalFetch);
});

test("waitForOpenAICallbackPort waits until the callback port is released", async () => {
  const server = net.createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  const waitPromise = waitForOpenAICallbackPort({
    host: "127.0.0.1",
    port: address.port,
    timeoutMs: 1_000,
    pollIntervalMs: 10,
  });

  setTimeout(() => {
    server.close();
  }, 50);

  await waitPromise;
});

test("LoginManager stays in awaiting_auth until manual fallback is actually required", async () => {
  let releaseFallback = () => {};
  const manager = new LoginManager({
    waitForCallbackPort: async () => {},
    loginRunner: async ({ onAuth, waitForManualCode }) => {
      onAuth({ url: "http://example.com/auth", instructions: "Open browser" });
      await new Promise((resolve) => {
        releaseFallback = resolve;
      });
      return {
        access: await waitForManualCode("Paste code"),
        refresh: "refresh-token",
        expires: Date.now() + 60_000,
        accountId: "account-id",
      };
    },
    saveProfile: async () => {},
  });

  const task = manager.start({}, "openai-codex:manual-status");
  const awaitingAuth = await waitForTaskStatus(manager, task.taskId, "awaiting_auth");

  assert.equal(awaitingAuth.manualEntryAvailable, true);
  assert.equal(awaitingAuth.manualEntryRequired, false);
  assert.equal(awaitingAuth.manualCodeSubmitted, false);

  releaseFallback();
  const awaitingManual = await waitForTaskStatus(manager, task.taskId, "awaiting_manual_code");
  assert.equal(awaitingManual.manualEntryRequired, true);

  manager.submitManualCode(task.taskId, "manual-code");
  await waitForTaskStatus(manager, task.taskId, "completed");
});

test("LoginManager reuses manual callback submitted before fallback is requested", async () => {
  let releaseFallback = () => {};
  const manager = new LoginManager({
    waitForCallbackPort: async () => {},
    loginRunner: async ({ onAuth, waitForManualCode }) => {
      onAuth({ url: "http://example.com/auth" });
      await new Promise((resolve) => {
        releaseFallback = resolve;
      });
      const code = await waitForManualCode("Paste code");
      return {
        access: code,
        refresh: "refresh-token",
        expires: Date.now() + 60_000,
        accountId: "account-id",
      };
    },
    saveProfile: async () => {},
  });

  const task = manager.start({}, "openai-codex:preload-manual");
  await waitForTaskStatus(manager, task.taskId, "awaiting_auth");

  const submitted = manager.submitManualCode(
    task.taskId,
    "http://localhost:1455/auth/callback?code=early-code&state=abc",
  );
  assert.equal(submitted.manualCodeSubmitted, true);
  assert.equal(submitted.manualEntryRequired, false);

  releaseFallback();
  await waitForTaskStatus(manager, task.taskId, "completed");
});

test("LoginManager serializes OAuth logins that share the same callback port", async () => {
  const events = [];
  const manager = new LoginManager({
    waitForCallbackPort: async () => {
      events.push("wait");
    },
    loginRunner: async ({ onAuth, waitForManualCode }) => {
      onAuth({ url: "http://example.com/auth" });
      events.push("login-start");
      const code = await waitForManualCode("Paste code");
      events.push(`manual:${code}`);
      return {
        access: "access-token",
        refresh: "refresh-token",
        expires: Date.now() + 60_000,
        accountId: "account-id",
      };
    },
    saveProfile: async (_options, profileId) => {
      events.push(`save:${profileId}`);
    },
  });

  const firstTask = manager.start({}, "openai-codex:first");
  const secondTask = manager.start({}, "openai-codex:second");

  await waitForTaskStatus(manager, firstTask.taskId, "awaiting_manual_code");
  assert.deepEqual(events, ["wait", "login-start"]);
  assert.equal(manager.getTask(secondTask.taskId)?.status, "starting");

  manager.submitManualCode(firstTask.taskId, "first-code");
  await waitForTaskStatus(manager, firstTask.taskId, "completed");
  await waitForTaskStatus(manager, secondTask.taskId, "awaiting_manual_code");

  assert.deepEqual(events, [
    "wait",
    "login-start",
    "manual:first-code",
    "save:openai-codex:first",
    "wait",
    "login-start",
  ]);

  manager.submitManualCode(secondTask.taskId, "second-code");
  await waitForTaskStatus(manager, secondTask.taskId, "completed");

  assert.deepEqual(events, [
    "wait",
    "login-start",
    "manual:first-code",
    "save:openai-codex:first",
    "wait",
    "login-start",
    "manual:second-code",
    "save:openai-codex:second",
  ]);
});

test("submitManualCode rejects obviously invalid input without resolving the login", async () => {
  const manager = new LoginManager({
    waitForCallbackPort: async () => {},
    loginRunner: async ({ onAuth, waitForManualCode }) => {
      onAuth({ url: "http://example.com/auth" });
      const code = await waitForManualCode("Paste code");
      return {
        access: code,
        refresh: "refresh-token",
        expires: Date.now() + 60_000,
        accountId: "account-id",
      };
    },
    saveProfile: async () => {},
  });

  const task = manager.start({}, "openai-codex:invalid-manual");
  await waitForTaskStatus(manager, task.taskId, "awaiting_manual_code");

  assert.throws(
    () => manager.submitManualCode(task.taskId, "localhost callback copied from browser without code param"),
    /full localhost callback URL or the authorization code/,
  );

  await new Promise((resolve) => setTimeout(resolve, 25));
  const afterInvalid = manager.getTask(task.taskId);
  assert.equal(afterInvalid?.status, "awaiting_manual_code");
  assert.equal(afterInvalid?.manualCodeSubmitted, false);

  manager.submitManualCode(task.taskId, "code=valid-code&state=abc");
  await waitForTaskStatus(manager, task.taskId, "completed");
});

test("resolveCredentialToken routes refresh requests through configured proxy", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    HTTP_PROXY: process.env.HTTP_PROXY,
  };
  let seenError = null;

  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;

  try {
    await assert.rejects(
      async () => await resolveCredentialToken({
        type: "oauth",
        provider: "openai-codex",
        access: "stale-access",
        refresh: "refresh-token",
        expires: Date.now() - 1000,
      }, {
        proxyConfig: { enabled: true, url: "" },
        refreshImpl: async () => {
          try {
            await fetch("https://auth.openai.com/oauth/token");
          } catch (error) {
            seenError = error;
            throw error;
          }
        },
      }),
      /Usage proxy is enabled, but no proxy URL was provided/,
    );
  } finally {
    restoreProxyEnv(originalEnv);
  }

  assert.match(String(seenError?.message || ""), /Usage proxy is enabled/);
  assert.equal(globalThis.fetch, originalFetch);
});

test("resolveCredentialToken backfills email and accountId from access token claims", async () => {
  const access = createJwt({
    "https://api.openai.com/auth": {
      chatgpt_account_id: "account-from-token",
    },
    "https://api.openai.com/profile": {
      email: "person@example.com",
      email_verified: true,
    },
  });

  const resolved = await resolveCredentialToken({
    type: "oauth",
    provider: "openai-codex",
    access,
    refresh: "refresh-token",
    expires: Date.now() + 60_000,
  });

  assert.equal(resolved.updated, true);
  assert.equal(resolved.credential.accountId, "account-from-token");
  assert.equal(resolved.credential.email, "person@example.com");
});
