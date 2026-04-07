import {
  CODEX_PROVIDER,
  LOCAL_AUTH_STORE_VERSION,
  LOCAL_STORE_KIND,
  RUNTIME_AUTH_STORE_VERSION,
} from "./constants.js";
import { normalizeCodexAuthMetadata } from "./codex-cli-auth.js";
import { readJsonObject, writeJsonFileAtomic } from "./json-files.js";
import { dedupeStrings, isRecord } from "./utils.js";

function asStringArray(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string" && entry.trim())
    : [];
}

function normalizeOrderRecord(value) {
  if (!isRecord(value)) {
    return undefined;
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    const list = asStringArray(entry);
    if (list.length > 0) {
      result[key] = dedupeStrings(list);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeLastGood(value) {
  if (!isRecord(value)) {
    return undefined;
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.trim()) {
      result[key] = entry;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeProfiles(value) {
  if (!isRecord(value)) {
    return {};
  }

  const profiles = {};
  for (const [profileId, credential] of Object.entries(value)) {
    if (!isRecord(credential)) {
      continue;
    }

    const nextCredential = { ...credential };
    if (nextCredential.provider === CODEX_PROVIDER) {
      const codexAuth = normalizeCodexAuthMetadata(nextCredential.codexAuth);
      if (codexAuth) {
        nextCredential.codexAuth = codexAuth;
      } else {
        delete nextCredential.codexAuth;
      }
    }

    profiles[profileId] = nextCredential;
  }

  return profiles;
}

function normalizeMaintenance(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  const changedProfileIds = asStringArray(value.lastChangedProfileIds);
  const maintenance = {
    lastAttemptAt: typeof value.lastAttemptAt === "string" && value.lastAttemptAt.trim()
      ? value.lastAttemptAt
      : null,
    lastSuccessAt: typeof value.lastSuccessAt === "string" && value.lastSuccessAt.trim()
      ? value.lastSuccessAt
      : null,
    lastError: typeof value.lastError === "string" && value.lastError.trim()
      ? value.lastError
      : null,
    lastChangedProfileIds: changedProfileIds,
  };

  if (!maintenance.lastAttemptAt && !maintenance.lastSuccessAt && !maintenance.lastError && changedProfileIds.length === 0) {
    return undefined;
  }

  return maintenance;
}

export function createEmptyAuthStore() {
  return {
    kind: LOCAL_STORE_KIND,
    version: LOCAL_AUTH_STORE_VERSION,
    profiles: {},
  };
}

export function readAuthStore(authStorePath) {
  const raw = readJsonObject(authStorePath, createEmptyAuthStore());
  return {
    kind: raw.kind === LOCAL_STORE_KIND ? raw.kind : undefined,
    version: typeof raw.version === "number"
      ? raw.version
      : raw.kind === LOCAL_STORE_KIND
        ? LOCAL_AUTH_STORE_VERSION
        : RUNTIME_AUTH_STORE_VERSION,
    profiles: normalizeProfiles(raw.profiles),
    order: normalizeOrderRecord(raw.order),
    lastGood: normalizeLastGood(raw.lastGood),
    usageStats: isRecord(raw.usageStats) ? raw.usageStats : undefined,
    maintenance: raw.kind === LOCAL_STORE_KIND ? normalizeMaintenance(raw.maintenance) : undefined,
  };
}

export function writeAuthStore(authStorePath, store) {
  writeJsonFileAtomic(authStorePath, {
    kind: LOCAL_STORE_KIND,
    version: LOCAL_AUTH_STORE_VERSION,
    profiles: isRecord(store.profiles) ? store.profiles : {},
    order: store.order,
    lastGood: store.lastGood,
    usageStats: store.usageStats,
    maintenance: normalizeMaintenance(store.maintenance),
  });
}

function sanitizeCredentialForRuntime(credential) {
  if (!isRecord(credential)) {
    return credential;
  }

  const { codexAuth, ...runtimeCredential } = credential;
  return runtimeCredential;
}

function isManagedCodexProfileId(profileId) {
  return typeof profileId === "string" && profileId.startsWith(`${CODEX_PROVIDER}:`);
}

function normalizeManagedUsageStats(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  const usageStats = {};
  for (const [profileId, stats] of Object.entries(value)) {
    if (!isManagedCodexProfileId(profileId)) {
      continue;
    }
    usageStats[profileId] = stats;
  }

  return Object.keys(usageStats).length > 0 ? usageStats : undefined;
}

export function buildLocalAuthStore(store, options = {}) {
  const includeMaintenance = options.includeMaintenance !== false;

  return {
    kind: LOCAL_STORE_KIND,
    version: LOCAL_AUTH_STORE_VERSION,
    profiles: normalizeProfiles(store?.profiles),
    order: normalizeOrderRecord(store?.order),
    lastGood: normalizeLastGood(store?.lastGood),
    usageStats: isRecord(store?.usageStats) ? store.usageStats : undefined,
    maintenance: includeMaintenance ? normalizeMaintenance(store?.maintenance) : undefined,
  };
}

export function buildRuntimeAuthStore(store) {
  const localStore = buildLocalAuthStore(store);
  const runtimeProfiles = {};

  for (const [profileId, credential] of Object.entries(localStore.profiles)) {
    if (!isManagedCodexProfileId(profileId)) {
      continue;
    }
    runtimeProfiles[profileId] = sanitizeCredentialForRuntime(credential);
  }

  const runtimeOrder = localStore.order?.[CODEX_PROVIDER]
    ? {
        [CODEX_PROVIDER]: localStore.order[CODEX_PROVIDER],
      }
    : undefined;
  const runtimeLastGood = localStore.lastGood?.[CODEX_PROVIDER]
    ? {
        [CODEX_PROVIDER]: localStore.lastGood[CODEX_PROVIDER],
      }
    : undefined;

  return {
    version: RUNTIME_AUTH_STORE_VERSION,
    profiles: runtimeProfiles,
    order: runtimeOrder,
    lastGood: runtimeLastGood,
    usageStats: normalizeManagedUsageStats(localStore.usageStats),
  };
}

export function mergeRuntimeAuthStore(runtimeStore, store) {
  const managedRuntime = buildRuntimeAuthStore(store);
  const nextRuntime = isRecord(runtimeStore) ? structuredClone(runtimeStore) : {};

  const nextProfiles = isRecord(nextRuntime.profiles) ? { ...nextRuntime.profiles } : {};
  for (const profileId of Object.keys(nextProfiles)) {
    if (isManagedCodexProfileId(profileId)) {
      delete nextProfiles[profileId];
    }
  }
  Object.assign(nextProfiles, managedRuntime.profiles);
  nextRuntime.profiles = nextProfiles;

  const nextOrder = isRecord(nextRuntime.order) ? { ...nextRuntime.order } : {};
  delete nextOrder[CODEX_PROVIDER];
  if (managedRuntime.order?.[CODEX_PROVIDER]) {
    nextOrder[CODEX_PROVIDER] = managedRuntime.order[CODEX_PROVIDER];
  }
  if (Object.keys(nextOrder).length > 0) {
    nextRuntime.order = nextOrder;
  } else {
    delete nextRuntime.order;
  }

  const nextLastGood = isRecord(nextRuntime.lastGood) ? { ...nextRuntime.lastGood } : {};
  delete nextLastGood[CODEX_PROVIDER];
  if (managedRuntime.lastGood?.[CODEX_PROVIDER]) {
    nextLastGood[CODEX_PROVIDER] = managedRuntime.lastGood[CODEX_PROVIDER];
  }
  if (Object.keys(nextLastGood).length > 0) {
    nextRuntime.lastGood = nextLastGood;
  } else {
    delete nextRuntime.lastGood;
  }

  const nextUsageStats = isRecord(nextRuntime.usageStats) ? { ...nextRuntime.usageStats } : {};
  for (const profileId of Object.keys(nextUsageStats)) {
    if (isManagedCodexProfileId(profileId)) {
      delete nextUsageStats[profileId];
    }
  }
  if (managedRuntime.usageStats) {
    Object.assign(nextUsageStats, managedRuntime.usageStats);
  }
  if (Object.keys(nextUsageStats).length > 0) {
    nextRuntime.usageStats = nextUsageStats;
  } else {
    delete nextRuntime.usageStats;
  }

  nextRuntime.version = RUNTIME_AUTH_STORE_VERSION;
  return nextRuntime;
}

export function writeRuntimeAuthStore(authStorePath, store) {
  const existingRuntime = readJsonObject(authStorePath, {});
  writeJsonFileAtomic(authStorePath, mergeRuntimeAuthStore(existingRuntime, store));
}

export function listCodexProfiles(store) {
  return Object.entries(store.profiles)
    .filter(([, credential]) => isRecord(credential) && credential.provider === CODEX_PROVIDER)
    .map(([profileId, credential]) => ({
      profileId,
      credential,
    }));
}

export function getStoredOrder(store) {
  return dedupeStrings(store.order?.[CODEX_PROVIDER] ?? []);
}

export function computeEffectiveOrder(store, configOrder = []) {
  const runtimeProfileIds = listCodexProfiles(store).map((entry) => entry.profileId);
  const preferred = getStoredOrder(store).length > 0 ? getStoredOrder(store) : dedupeStrings(configOrder);
  const merged = preferred.filter((profileId) => runtimeProfileIds.includes(profileId));
  for (const profileId of runtimeProfileIds) {
    if (!merged.includes(profileId)) {
      merged.push(profileId);
    }
  }
  return merged;
}

export function applyOrderToAuthStore(store, order) {
  const next = structuredClone(store);
  const deduped = dedupeStrings(order);
  next.order = next.order ?? {};
  if (deduped.length === 0) {
    delete next.order[CODEX_PROVIDER];
    if (Object.keys(next.order).length === 0) {
      next.order = undefined;
    }
    return next;
  }
  next.order[CODEX_PROVIDER] = deduped;
  return next;
}

export function renameProfileInAuthStore(store, profileId, nextProfileId) {
  if (!store.profiles[profileId]) {
    throw new Error(`Profile "${profileId}" was not found in auth-profiles.json.`);
  }
  if (store.profiles[nextProfileId]) {
    throw new Error(`Profile "${nextProfileId}" already exists.`);
  }
  if (!nextProfileId.startsWith(`${CODEX_PROVIDER}:`)) {
    throw new Error(`Profile id must start with "${CODEX_PROVIDER}:".`);
  }

  const next = structuredClone(store);
  const credential = next.profiles[profileId];
  delete next.profiles[profileId];
  next.profiles[nextProfileId] = credential;

  if (next.order?.[CODEX_PROVIDER]) {
    next.order[CODEX_PROVIDER] = next.order[CODEX_PROVIDER].map((entry) =>
      entry === profileId ? nextProfileId : entry,
    );
  }

  if (next.lastGood?.[CODEX_PROVIDER] === profileId) {
    next.lastGood[CODEX_PROVIDER] = nextProfileId;
  }

  if (next.usageStats?.[profileId]) {
    next.usageStats[nextProfileId] = next.usageStats[profileId];
    delete next.usageStats[profileId];
  }

  return next;
}

export function deleteProfileFromAuthStore(store, profileId) {
  if (!store.profiles[profileId]) {
    throw new Error(`Profile "${profileId}" was not found in auth-profiles.json.`);
  }

  const next = structuredClone(store);
  delete next.profiles[profileId];

  if (next.order?.[CODEX_PROVIDER]) {
    const filteredOrder = next.order[CODEX_PROVIDER].filter((entry) => entry !== profileId);
    if (filteredOrder.length > 0) {
      next.order[CODEX_PROVIDER] = filteredOrder;
    } else {
      delete next.order[CODEX_PROVIDER];
      if (Object.keys(next.order).length === 0) {
        next.order = undefined;
      }
    }
  }

  if (next.lastGood?.[CODEX_PROVIDER] === profileId) {
    delete next.lastGood[CODEX_PROVIDER];
    if (Object.keys(next.lastGood).length === 0) {
      next.lastGood = undefined;
    }
  }

  if (next.usageStats?.[profileId]) {
    delete next.usageStats[profileId];
    if (Object.keys(next.usageStats).length === 0) {
      next.usageStats = undefined;
    }
  }

  return next;
}

export function upsertProfileCredential(store, profileId, credential, options = {}) {
  const next = structuredClone(store);
  next.profiles[profileId] = credential;

  const currentOrder = getStoredOrder(next);
  const appendToOrder = options.appendToOrder ?? true;
  if (appendToOrder) {
    const nextOrder = currentOrder.filter((entry) => entry !== profileId);
    nextOrder.push(profileId);
    next.order = next.order ?? {};
    next.order[CODEX_PROVIDER] = nextOrder;
  }

  return next;
}
