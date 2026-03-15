import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { applyOrderToAuthStore, deleteProfileFromAuthStore, renameProfileInAuthStore } from "../src/auth-store.js";
import { loginWithCodex, resolveCredentialToken } from "../src/codex-auth.js";
import { deleteProfileFromConfig, syncCodexIntoConfig, touchOpenClawConfig } from "../src/config-store.js";
import { openBrowser, parseArgs } from "../src/index.js";
import { buildConfigAudit, buildWarnings, recommendProfileOrder } from "../src/order.js";
import { clearAutoAuthProfileOverrides, readSessionStore } from "../src/session-store.js";
import { applyOrder, LoginManager, waitForOpenAICallbackPort } from "../src/state.js";
import { createUsageFetch, resolveUsageProxyUrl } from "../src/usage-fetch.js";

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
  const agentDir = path.join(stateDir, "agents", "main", "agent");
  const sessionsDir = path.join(stateDir, "agents", "main", "sessions");
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
      { stateDir, agent: "main" },
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
      authStoreExists: true,
      configExists: true,
    },
  });

  assert.ok(
    warnings.includes(
      "openclaw.json auth.order differs from auth-profiles.json order; runtime uses auth-profiles.json.",
    ),
  );
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
