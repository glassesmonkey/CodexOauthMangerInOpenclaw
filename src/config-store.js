import { CODEX_PROVIDER } from "./constants.js";
import { readJsonObject, writeJsonFileAtomic } from "./json-files.js";
import { dedupeStrings, isRecord } from "./utils.js";

export function readOpenClawConfig(configPath) {
  return readJsonObject(configPath, {});
}

export function writeOpenClawConfig(configPath, config) {
  writeJsonFileAtomic(configPath, config);
}

export function getConfigCodexProfiles(config) {
  const profiles = config?.auth?.profiles;
  if (!isRecord(profiles)) {
    return [];
  }
  return Object.entries(profiles)
    .filter(([, entry]) => isRecord(entry) && entry.provider === CODEX_PROVIDER)
    .map(([profileId]) => profileId);
}

export function getConfigCodexOrder(config) {
  const order = config?.auth?.order?.[CODEX_PROVIDER];
  return dedupeStrings(Array.isArray(order) ? order : []);
}

export function syncCodexIntoConfig(config, runtimeProfileIds, preferredOrder) {
  const next = structuredClone(isRecord(config) ? config : {});
  next.auth = isRecord(next.auth) ? next.auth : {};
  next.auth.profiles = isRecord(next.auth.profiles) ? next.auth.profiles : {};
  next.auth.order = isRecord(next.auth.order) ? next.auth.order : {};

  for (const profileId of runtimeProfileIds) {
    if (!next.auth.profiles[profileId]) {
      next.auth.profiles[profileId] = {
        provider: CODEX_PROVIDER,
        mode: "oauth",
      };
    }
  }

  const existingOrder = getConfigCodexOrder(next);
  const mergedOrder = existingOrder.length > 0 ? [...existingOrder] : [];
  for (const profileId of dedupeStrings(preferredOrder)) {
    if (runtimeProfileIds.includes(profileId) && !mergedOrder.includes(profileId)) {
      mergedOrder.push(profileId);
    }
  }
  for (const profileId of runtimeProfileIds) {
    if (!mergedOrder.includes(profileId)) {
      mergedOrder.push(profileId);
    }
  }
  if (mergedOrder.length > 0) {
    next.auth.order[CODEX_PROVIDER] = mergedOrder;
  }

  return next;
}

export function renameProfileInConfig(config, profileId, nextProfileId) {
  const next = structuredClone(isRecord(config) ? config : {});
  if (!isRecord(next.auth)) {
    return next;
  }

  if (isRecord(next.auth.profiles) && next.auth.profiles[profileId] && !next.auth.profiles[nextProfileId]) {
    next.auth.profiles[nextProfileId] = next.auth.profiles[profileId];
    delete next.auth.profiles[profileId];
  }

  const order = next.auth.order?.[CODEX_PROVIDER];
  if (Array.isArray(order)) {
    next.auth.order[CODEX_PROVIDER] = order.map((entry) =>
      entry === profileId ? nextProfileId : entry,
    );
  }

  return next;
}
