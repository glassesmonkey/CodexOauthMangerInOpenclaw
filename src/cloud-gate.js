/**
 * Small helpers that bridge dashboard config + D1 client. The rest of the
 * server calls these at natural boundaries (after a local mutation, before a
 * keepalive run, on explicit pull/push/bootstrap endpoints, etc.) without
 * having to juggle the client or the config themselves.
 */

import { buildLocalAuthStore } from "./auth-store.js";
import {
  acquireRefreshLease,
  deleteProfilesFromD1,
  healthCheck as cloudHealthCheck,
  pullStoreFromD1,
  pushMetaToD1,
  pushProfileToD1,
  pushStoreToD1,
  releaseRefreshLease,
} from "./cloud-sync.js";
import { createD1Client } from "./d1-client.js";
import { loadDashboardConfig, requireCloudReady } from "./dashboard-config.js";
import { toErrorMessage } from "./utils.js";

export function isCloudMode(config) {
  return config?.storeMode === "cloud" && Boolean(config?.d1?.accountId && config?.d1?.databaseId && config?.d1?.apiToken);
}

export function buildClientFromConfig(config) {
  return createD1Client({
    accountId: config.d1.accountId,
    databaseId: config.d1.databaseId,
    apiToken: config.d1.apiToken,
    baseUrl: config.d1.baseUrl || undefined,
    timeoutMs: config.d1.timeoutMs,
  });
}

export async function loadCloudContext(options) {
  const config = loadDashboardConfig(options);
  if (!isCloudMode(config)) {
    return { config, client: null };
  }
  return { config, client: buildClientFromConfig(config) };
}

export async function syncLocalStoreToCloud(options, store, { replace = false } = {}) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    return { skipped: true, reason: "offline-mode" };
  }
  try {
    const result = await pushStoreToD1({
      client,
      passphrase: config.passphrase,
      deviceId: config.deviceId,
      store: buildLocalAuthStore(store),
      replace,
    });
    return { skipped: false, replaced: replace, statementCount: result.statementCount };
  } catch (error) {
    return { skipped: false, error: toErrorMessage(error) };
  }
}

export async function pullCloudStore(options) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    throw new Error("Cloud mode is not configured.");
  }
  requireCloudReady(config);
  return await pullStoreFromD1({ client, passphrase: config.passphrase });
}

export async function bootstrapCloudFromLocal(options, store) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    throw new Error("Cloud mode is not configured.");
  }
  requireCloudReady(config);
  return await pushStoreToD1({
    client,
    passphrase: config.passphrase,
    deviceId: config.deviceId,
    store: buildLocalAuthStore(store),
    replace: true,
  });
}

export async function pushProfileCloudUpdate(options, profileId, credential) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    return { skipped: true };
  }
  try {
    await pushProfileToD1({
      client,
      passphrase: config.passphrase,
      deviceId: config.deviceId,
      profileId,
      credential,
    });
    return { skipped: false };
  } catch (error) {
    return { skipped: false, error: toErrorMessage(error) };
  }
}

export async function pushMetaCloudUpdate(options, key, value) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    return { skipped: true };
  }
  try {
    await pushMetaToD1({ client, deviceId: config.deviceId, key, value });
    return { skipped: false };
  } catch (error) {
    return { skipped: false, error: toErrorMessage(error) };
  }
}

export async function deleteCloudProfiles(options, profileIds) {
  const { client } = await loadCloudContext(options);
  if (!client) {
    return { skipped: true };
  }
  try {
    await deleteProfilesFromD1({ client, profileIds });
    return { skipped: false };
  } catch (error) {
    return { skipped: false, error: toErrorMessage(error) };
  }
}

export async function withRefreshLease(options, profileId, action, { ttlMs = 30_000 } = {}) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    return { ran: true, result: await action(), lease: null };
  }
  const lease = await acquireRefreshLease({
    client,
    profileId,
    holderId: config.deviceId,
    ttlMs,
  });
  if (!lease.acquired) {
    return { ran: false, skippedReason: "held-by-other-device", lease };
  }
  try {
    const result = await action();
    return { ran: true, result, lease };
  } finally {
    try {
      await releaseRefreshLease({ client, profileId, holderId: config.deviceId });
    } catch {
      // Best effort: if the release fails the lease just expires by TTL.
    }
  }
}

export async function checkCloudHealth(options) {
  const { config, client } = await loadCloudContext(options);
  if (!client) {
    return {
      ok: false,
      reason: config.storeMode === "cloud" ? "missing-d1-config" : "offline-mode",
      storeMode: config.storeMode,
    };
  }
  try {
    const health = await cloudHealthCheck({ client });
    return { ...health, storeMode: config.storeMode, deviceId: config.deviceId };
  } catch (error) {
    return { ok: false, reason: toErrorMessage(error), storeMode: config.storeMode };
  }
}
