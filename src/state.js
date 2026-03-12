import { randomUUID } from "node:crypto";
import { CODEX_PROVIDER } from "./constants.js";
import {
  applyOrderToAuthStore,
  computeEffectiveOrder,
  getStoredOrder,
  listCodexProfiles,
  readAuthStore,
  renameProfileInAuthStore,
  upsertProfileCredential,
  writeAuthStore,
} from "./auth-store.js";
import { fetchCodexUsage } from "./codex-api.js";
import { loginWithCodex, resolveCredentialToken } from "./codex-auth.js";
import {
  getConfigCodexOrder,
  getConfigCodexProfiles,
  readOpenClawConfig,
  renameProfileInConfig,
  syncCodexIntoConfig,
  writeOpenClawConfig,
} from "./config-store.js";
import { withFileLock } from "./file-lock.js";
import { recommendProfileOrder, buildConfigAudit, buildWarnings } from "./order.js";
import { resolvePaths } from "./paths.js";
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
    "Applying order only updates auth-profiles.json. Existing OpenClaw sessions may keep using their current auth profile until the session is recreated or reselected.",
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
      const resolved = await resolveCredentialToken(entry.credential);
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

export async function applyOrder(options, order, deps = {}) {
  await updateAuthStore(options, (store) => applyOrderToAuthStore(store, order));
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
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

export class LoginManager {
  constructor(options = {}) {
    this.options = options;
    this.tasks = new Map();
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
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      manualCode: createDeferred(),
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
    if (!code || !code.trim()) {
      throw new Error("Manual code cannot be empty.");
    }
    task.updatedAt = Date.now();
    task.manualCode.resolve(code.trim());
    return this.getTask(taskId);
  }

  async run(task, options) {
    try {
      const credentials = await loginWithCodex({
        onAuth: ({ url, instructions }) => {
          task.status = "awaiting_auth";
          task.authUrl = url;
          task.instructions = instructions || "A browser window should open. Complete login to finish.";
          task.updatedAt = Date.now();
        },
        waitForManualCode: async (message) => {
          task.status = "awaiting_manual_code";
          task.promptMessage = message;
          task.updatedAt = Date.now();
          return await task.manualCode.promise;
        },
      });

      task.status = "saving";
      task.updatedAt = Date.now();
      await saveLoggedInProfile(options, task.profileId, credentials);
      task.status = "completed";
      task.updatedAt = Date.now();
    } catch (error) {
      task.status = "failed";
      task.error = toErrorMessage(error);
      task.updatedAt = Date.now();
    }
  }
}
