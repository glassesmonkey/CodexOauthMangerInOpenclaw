import { CODEX_PROVIDER } from "./constants.js";
import { readJsonObject, writeJsonFileAtomic } from "./json-files.js";
import { isRecord } from "./utils.js";

export function readSessionStore(sessionStorePath) {
  return readJsonObject(sessionStorePath, {});
}

export function writeSessionStore(sessionStorePath, store) {
  writeJsonFileAtomic(sessionStorePath, store);
}

export function clearAutoAuthProfileOverrides(store, options = {}) {
  const provider = typeof options.provider === "string" && options.provider.trim()
    ? options.provider.trim()
    : CODEX_PROVIDER;
  const preferredProfileId = typeof options.preferredProfileId === "string" && options.preferredProfileId.trim()
    ? options.preferredProfileId.trim()
    : null;
  const next = structuredClone(isRecord(store) ? store : {});
  const providerPrefix = `${provider}:`;
  let clearedCount = 0;

  for (const [sessionKey, value] of Object.entries(next)) {
    if (!isRecord(value)) {
      continue;
    }

    const override = typeof value.authProfileOverride === "string" ? value.authProfileOverride.trim() : "";
    if (!override || !override.startsWith(providerPrefix)) {
      continue;
    }
    if (value.authProfileOverrideSource !== "auto") {
      continue;
    }
    if (preferredProfileId && override === preferredProfileId) {
      continue;
    }

    delete value.authProfileOverride;
    delete value.authProfileOverrideSource;
    delete value.authProfileOverrideCompactionCount;
    value.updatedAt = Date.now();
    next[sessionKey] = value;
    clearedCount += 1;
  }

  return { store: next, clearedCount };
}
