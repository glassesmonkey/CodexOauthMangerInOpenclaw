import { randomUUID } from "node:crypto";
import net from "node:net";
import { CODEX_PROVIDER } from "./constants.js";
import {
  applyOrderToAuthStore,
  computeEffectiveOrder,
  deleteProfileFromAuthStore,
  getStoredOrder,
  listCodexProfiles,
  readAuthStore,
  renameProfileInAuthStore,
  upsertProfileCredential,
  writeAuthStore,
} from "./auth-store.js";
import { fetchCodexUsage } from "./codex-api.js";
import { loginWithCodex, normalizeManualAuthorizationInput, resolveCredentialToken } from "./codex-auth.js";
import {
  deleteProfileFromConfig,
  getConfigCodexOrder,
  getConfigCodexProfiles,
  readOpenClawConfig,
  renameProfileInConfig,
  syncCodexIntoConfig,
  touchOpenClawConfig,
  writeOpenClawConfig,
} from "./config-store.js";
import { withFileLock } from "./file-lock.js";
import { recommendProfileOrder, buildConfigAudit, buildWarnings } from "./order.js";
import { resolvePaths } from "./paths.js";
import { clearAutoAuthProfileOverrides, readSessionStore, writeSessionStore } from "./session-store.js";
import { toErrorMessage } from "./utils.js";

function resolveAccountId(credential) {
  if (typeof credential?.accountId === "string" && credential.accountId.trim()) {
    return credential.accountId.trim();
  }
  if (typeof credential?.metadata?.accountId === "string" && credential.metadata.accountId.trim()) {
    return credential.metadata.accountId.trim();
  }
  return null;
}

function resolveEmail(credential) {
  return typeof credential?.email === "string" && credential.email.trim() ? credential.email.trim() : null;
}

function resolveExpiresAt(credential) {
  return typeof credential?.expires === "number" && Number.isFinite(credential.expires)
    ? credential.expires
    : null;
}

function createNotes() {
  return [
    "Applying order updates auth-profiles.json, touches openclaw.json to trigger gateway hot reload, and clears auto-selected Codex session overrides that still point at older profiles.",
    "Only auto-selected Codex session overrides are cleared. Explicit user-selected session auth profiles are left unchanged.",
    "This tool is standalone. It reads and writes OpenClaw JSON files directly but does not import OpenClaw project code.",
  ];
}

export async function loadDashboardState(options = {}, deps = {}) {
  const context = resolvePaths(options);
  const authStore = readAuthStore(context.authStorePath);
  const config = readOpenClawConfig(context.configPath);
  const configOrder = getConfigCodexOrder(config);
  const configProfileIds = getConfigCodexProfiles(config);
  const profiles = listCodexProfiles(authStore);
  const refreshedStore = structuredClone(authStore);
  let storeChanged = false;
  const runtimeProfileIds = profiles.map((entry) => entry.profileId);
  const currentEffectiveOrder = computeEffectiveOrder(authStore, configOrder);

  const rows = [];
  for (const entry of profiles) {
    const currentOrderIndex = currentEffectiveOrder.indexOf(entry.profileId);
    let usage = {
      primary: { label: null, usedPercent: null, remainingPercent: null, resetAt: null },
      secondary: { label: null, usedPercent: null, remainingPercent: null, resetAt: null },
      plan: null,
      error: null,
    };

    try {
      const resolved = await resolveCredentialToken(entry.credential, {
        proxyConfig: deps.proxyConfig,
      });
      if (resolved.refreshed) {
        refreshedStore.profiles[entry.profileId] = resolved.credential;
        storeChanged = true;
      }
      usage = await fetchCodexUsage({
        token: resolved.token,
        accountId: resolveAccountId(resolved.credential) ?? undefined,
        fetchImpl: deps.fetchImpl || fetch,
      });
    } catch (error) {
      usage = {
        primary: { label: null, usedPercent: null, remainingPercent: null, resetAt: null },
        secondary: { label: null, usedPercent: null, remainingPercent: null, resetAt: null },
        plan: null,
        error: toErrorMessage(error),
      };
    }

    const credential = refreshedStore.profiles[entry.profileId];
    rows.push({
      profileId: entry.profileId,
      displayLabel: resolveEmail(credential) || entry.profileId,
      email: resolveEmail(credential),
      accountId: resolveAccountId(credential),
      expiresAt: resolveExpiresAt(credential),
      type: credential?.type || "unknown",
      currentOrderIndex: currentOrderIndex >= 0 ? currentOrderIndex : Number.MAX_SAFE_INTEGER,
      recommendedOrderIndex: -1,
      primary: usage.primary,
      secondary: usage.secondary,
      plan: usage.plan,
      error: usage.error,
    });
  }

  if (storeChanged) {
    await withFileLock(context.authStorePath, async () => {
      writeAuthStore(context.authStorePath, refreshedStore);
    });
  }

  const storedOrder = getStoredOrder(refreshedStore);
  const recommendedOrder = recommendProfileOrder(rows);
  const rankedRows = rows
    .map((row) => ({
      ...row,
      recommendedOrderIndex: recommendedOrder.indexOf(row.profileId),
    }))
    .toSorted((left, right) => left.recommendedOrderIndex - right.recommendedOrderIndex);

  const audit = buildConfigAudit({
    runtimeProfileIds,
    storedOrder,
    configProfileIds,
    configOrder,
  });

  return {
    generatedAt: Date.now(),
    context,
    currentEffectiveOrder,
    storedOrder,
    configOrder,
    recommendedOrder,
    rows: rankedRows,
    warnings: buildWarnings({ rows: rankedRows, audit, context }),
    notes: createNotes(),
    audit,
  };
}

async function updateAuthStore(options, updater) {
  const context = resolvePaths(options);
  return await withFileLock(context.authStorePath, async () => {
    const store = readAuthStore(context.authStorePath);
    const next = updater(store, context);
    writeAuthStore(context.authStorePath, next);
    return next;
  });
}

async function updateOpenClawConfig(options, updater) {
  const context = resolvePaths(options);
  return await withFileLock(context.configPath, async () => {
    const config = readOpenClawConfig(context.configPath);
    const next = updater(config, context);
    writeOpenClawConfig(context.configPath, next);
    return next;
  });
}

async function updateSessionStore(options, updater) {
  const context = resolvePaths(options);
  return await withFileLock(context.sessionStorePath, async () => {
    const store = readSessionStore(context.sessionStorePath);
    const next = updater(store, context);
    writeSessionStore(context.sessionStorePath, next);
    return next;
  });
}

export async function applyOrder(options, order, deps = {}) {
  const updatedStore = await updateAuthStore(options, (store) => applyOrderToAuthStore(store, order));
  const preferredOrder = getStoredOrder(updatedStore);
  const context = resolvePaths(options);

  if (context.configExists) {
    await updateOpenClawConfig(options, (config) => touchOpenClawConfig(config));
  }

  if (context.sessionStoreExists && preferredOrder.length > 0) {
    await updateSessionStore(options, (store) =>
      clearAutoAuthProfileOverrides(store, {
        provider: CODEX_PROVIDER,
        preferredProfileId: preferredOrder[0],
      }).store,
    );
  }

  return await loadDashboardState(options, deps);
}

export async function syncConfig(options, deps = {}) {
  const context = resolvePaths(options);
  const store = readAuthStore(context.authStorePath);
  const runtimeProfileIds = listCodexProfiles(store).map((entry) => entry.profileId);
  const preferredOrder = getStoredOrder(store).length > 0
    ? getStoredOrder(store)
    : computeEffectiveOrder(store, []);
  await updateOpenClawConfig(options, (config) =>
    syncCodexIntoConfig(config, runtimeProfileIds, preferredOrder),
  );
  return await loadDashboardState(options, deps);
}

export async function renameProfile(options, profileId, nextProfileId, deps = {}) {
  await updateAuthStore(options, (store) => renameProfileInAuthStore(store, profileId, nextProfileId));
  const context = resolvePaths(options);
  if (context.configExists) {
    await updateOpenClawConfig(options, (config) => renameProfileInConfig(config, profileId, nextProfileId));
  }
  return await loadDashboardState(options, deps);
}

export async function deleteProfile(options, profileId, deps = {}) {
  await updateAuthStore(options, (store) => deleteProfileFromAuthStore(store, profileId));
  const context = resolvePaths(options);
  if (context.configExists) {
    await updateOpenClawConfig(options, (config) => deleteProfileFromConfig(config, profileId));
  }
  return await loadDashboardState(options, deps);
}

export async function saveLoggedInProfile(options, profileId, credentials) {
  const nextCredential = {
    ...credentials,
    type: "oauth",
    provider: CODEX_PROVIDER,
  };

  await updateAuthStore(options, (store) => {
    if (store.profiles[profileId]) {
      throw new Error(`Profile "${profileId}" already exists.`);
    }
    return upsertProfileCredential(store, profileId, nextCredential);
  });

  const context = resolvePaths(options);
  if (context.configExists) {
    const store = readAuthStore(context.authStorePath);
    const runtimeProfileIds = listCodexProfiles(store).map((entry) => entry.profileId);
    const preferredOrder = getStoredOrder(store).length > 0
      ? getStoredOrder(store)
      : computeEffectiveOrder(store, []);
    await updateOpenClawConfig(options, (config) =>
      syncCodexIntoConfig(config, runtimeProfileIds, preferredOrder),
    );
  }
}

function createDeferred() {
  let resolve;
  let reject;
  let settled = false;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = (value) => {
      if (settled) {
        return false;
      }
      settled = true;
      nextResolve(value);
      return true;
    };
    reject = (error) => {
      if (settled) {
        return false;
      }
      settled = true;
      nextReject(error);
      return true;
    };
  });
  return {
    promise,
    resolve,
    reject,
    isSettled() {
      return settled;
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canBindLocalPort(port, host = "127.0.0.1") {
  return await new Promise((resolve) => {
    const probe = net.createServer();
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    probe.once("error", () => finish(false));
    probe.listen(port, host, () => {
      probe.close(() => finish(true));
    });
  });
}

export async function waitForOpenAICallbackPort(options = {}) {
  const port = Number.isInteger(options.port) ? options.port : 1455;
  const host = typeof options.host === "string" && options.host.trim() ? options.host.trim() : "127.0.0.1";
  const timeoutMs = Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 10_000;
  const pollIntervalMs = Number.isInteger(options.pollIntervalMs) && options.pollIntervalMs > 0
    ? options.pollIntervalMs
    : 100;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    if (await canBindLocalPort(port, host)) {
      return;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `OAuth callback port ${host}:${port} is still busy. Wait a moment and try again.`,
  );
}

export class LoginManager {
  constructor(options = {}) {
    this.options = options;
    this.tasks = new Map();
    this.loginRunner = options.loginRunner ?? loginWithCodex;
    this.saveProfile = options.saveProfile ?? saveLoggedInProfile;
    this.waitForCallbackPort = options.waitForCallbackPort ?? waitForOpenAICallbackPort;
    this.loginQueue = Promise.resolve();
  }

  prune() {
    const now = Date.now();
    for (const [taskId, task] of this.tasks.entries()) {
      if (now - task.createdAt > 60 * 60 * 1_000) {
        this.tasks.delete(taskId);
      }
    }
  }

  getTask(taskId) {
    this.prune();
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }
    return {
      taskId: task.id,
      profileId: task.profileId,
      status: task.status,
      authUrl: task.authUrl || null,
      instructions: task.instructions || null,
      promptMessage: task.promptMessage || null,
      manualEntryAvailable: task.status === "awaiting_auth" || task.status === "awaiting_manual_code",
      manualEntryRequired: task.status === "awaiting_manual_code",
      manualCodeSubmitted: task.manualCodeSubmitted,
      manualHint: task.manualHint || null,
      error: task.error || null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  start(options, profileId) {
    if (!profileId.startsWith(`${CODEX_PROVIDER}:`)) {
      throw new Error(`Profile id must start with "${CODEX_PROVIDER}:".`);
    }

    const task = {
      id: randomUUID(),
      profileId,
      status: "starting",
      authUrl: null,
      instructions: null,
      promptMessage: null,
      manualHint: "Paste the full localhost callback URL or just the authorization code. If browser callback succeeds, you can ignore this.",
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      manualCode: createDeferred(),
      pendingManualCode: null,
      manualCodeSubmitted: false,
    };
    this.tasks.set(task.id, task);

    void this.run(task, options);
    return this.getTask(task.id);
  }

  submitManualCode(taskId, code) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Login task not found.");
    }
    if (task.status === "completed" || task.status === "failed") {
      throw new Error("Login task is no longer accepting manual code.");
    }
    if (task.manualCode.isSettled()) {
      throw new Error("Manual code was already submitted for this login.");
    }

    const normalized = normalizeManualAuthorizationInput(code);
    task.pendingManualCode = normalized;
    task.manualCodeSubmitted = true;
    task.manualHint = task.status === "awaiting_manual_code"
      ? "Manual callback received. Waiting to finish OAuth login."
      : "Manual callback saved. It will be used automatically if browser callback does not complete.";
    task.updatedAt = Date.now();
    if (task.status === "awaiting_manual_code") {
      task.manualCode.resolve(task.pendingManualCode);
    }
    return this.getTask(taskId);
  }

  async run(task, options) {
    const previousRun = this.loginQueue;
    let releaseQueue = () => {};
    this.loginQueue = new Promise((resolve) => {
      releaseQueue = resolve;
    });

    try {
      await previousRun;
      await this.waitForCallbackPort();

      const credentials = await this.loginRunner({
        onAuth: ({ url, instructions }) => {
          task.status = "awaiting_auth";
          task.authUrl = url;
          task.instructions = instructions || "A browser window should open. Complete login to finish.";
          task.promptMessage = null;
          task.manualHint = task.manualCodeSubmitted
            ? "Manual callback saved. It will be used automatically if browser callback does not complete."
            : "You can paste the full localhost callback URL or just the authorization code if auto-detection misses it.";
          task.updatedAt = Date.now();
        },
        waitForManualCode: async (message) => {
          task.status = "awaiting_manual_code";
          task.promptMessage = message;
          task.manualHint = "Automatic callback did not finish. Paste the full localhost callback URL or just the authorization code.";
          task.updatedAt = Date.now();
          if (task.pendingManualCode) {
            task.manualCode.resolve(task.pendingManualCode);
          }
          return await task.manualCode.promise;
        },
        onManualCodeRequested: async (message) => {
          task.status = "awaiting_manual_code";
          task.promptMessage = message;
          task.manualHint = "Automatic callback did not finish. Paste the full localhost callback URL or just the authorization code.";
          task.updatedAt = Date.now();
        },
        proxyConfig: options.usageProxy,
      });

      task.status = "saving";
      task.manualHint = "Authorization code accepted. Saving the new profile.";
      task.updatedAt = Date.now();
      await this.saveProfile(options, task.profileId, credentials);
      task.status = "completed";
      task.manualHint = "OAuth login completed.";
      task.updatedAt = Date.now();
    } catch (error) {
      task.status = "failed";
      task.error = toErrorMessage(error);
      task.updatedAt = Date.now();
    } finally {
      releaseQueue();
    }
  }
}
