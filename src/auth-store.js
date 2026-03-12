import { AUTH_STORE_VERSION, CODEX_PROVIDER } from "./constants.js";
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

export function createEmptyAuthStore() {
  return {
    version: AUTH_STORE_VERSION,
    profiles: {},
  };
}

export function readAuthStore(authStorePath) {
  const raw = readJsonObject(authStorePath, createEmptyAuthStore());
  return {
    version: typeof raw.version === "number" ? raw.version : AUTH_STORE_VERSION,
    profiles: isRecord(raw.profiles) ? raw.profiles : {},
    order: normalizeOrderRecord(raw.order),
    lastGood: normalizeLastGood(raw.lastGood),
    usageStats: isRecord(raw.usageStats) ? raw.usageStats : undefined,
  };
}

export function writeAuthStore(authStorePath, store) {
  writeJsonFileAtomic(authStorePath, {
    version: typeof store.version === "number" ? store.version : AUTH_STORE_VERSION,
    profiles: isRecord(store.profiles) ? store.profiles : {},
    order: store.order,
    lastGood: store.lastGood,
    usageStats: store.usageStats,
  });
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
