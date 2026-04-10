import { createHash } from "node:crypto";
import { CODEX_PROVIDER } from "./constants.js";
import { extractOpenAIIdentityFromAccessToken } from "./codex-auth.js";
import { readJsonFile, readJsonObject, writeJsonFileAtomic } from "./json-files.js";
import { dedupeStrings, isRecord } from "./utils.js";

const DEFAULT_AUTH_MODE = "chatgpt";
const DEFAULT_BASE_URL = "https://chatgpt.com/backend-api/codex";
export const HERMES_MANAGED_SOURCE_PREFIX = "manual:dashboard:";

function readTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeIsoString(value) {
  const normalized = readTrimmedString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function decodeAccessTokenPayload(accessToken) {
  const value = readTrimmedString(accessToken);
  if (!value) {
    return null;
  }

  const parts = value.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function extractExpiresAt(accessToken) {
  const payload = decodeAccessTokenPayload(accessToken);
  const exp = Number(payload?.exp);
  return Number.isFinite(exp) && exp > 0 ? exp * 1000 : undefined;
}

function resolveLastRefresh(credential, options = {}) {
  return normalizeIsoString(options.lastRefresh)
    || normalizeIsoString(credential?.codexAuth?.lastRefresh)
    || new Date().toISOString();
}

function resolveAuthMode(credential, options = {}) {
  return readTrimmedString(options.authMode)
    || readTrimmedString(credential?.codexAuth?.authMode)
    || DEFAULT_AUTH_MODE;
}

function resolveHermesLabel(profileId, credential) {
  return readTrimmedString(credential?.email)
    || readTrimmedString(credential?.accountId)
    || profileId;
}

function createManagedEntryId(profileId) {
  return createHash("sha1")
    .update(`${CODEX_PROVIDER}:${profileId}`)
    .digest("hex")
    .slice(0, 12);
}

function sortPoolEntries(entries) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .toSorted((left, right) => {
      const leftPriority = Number.isFinite(left.entry?.priority) ? Number(left.entry.priority) : Number.MAX_SAFE_INTEGER;
      const rightPriority = Number.isFinite(right.entry?.priority) ? Number(right.entry.priority) : Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

function normalizePoolEntryForProjection(entry) {
  if (!isRecord(entry)) {
    return null;
  }

  const accessToken = readTrimmedString(entry.access_token);
  const refreshToken = readTrimmedString(entry.refresh_token);
  const source = readTrimmedString(entry.source);
  if (!accessToken || !source) {
    return null;
  }

  return {
    id: readTrimmedString(entry.id) || null,
    label: readTrimmedString(entry.label) || source,
    auth_type: readTrimmedString(entry.auth_type) || "oauth",
    priority: Number.isFinite(entry.priority) ? Number(entry.priority) : 0,
    source,
    access_token: accessToken,
    refresh_token: refreshToken,
    last_refresh: normalizeIsoString(entry.last_refresh),
    base_url: readTrimmedString(entry.base_url) || null,
  };
}

function buildCredentialFromTokens(tokens, options = {}) {
  const access = readTrimmedString(tokens?.access_token);
  const refresh = readTrimmedString(tokens?.refresh_token);
  if (!access || !refresh) {
    return null;
  }

  const identity = extractOpenAIIdentityFromAccessToken(access);
  const expires = extractExpiresAt(access);
  return {
    type: "oauth",
    provider: CODEX_PROVIDER,
    access,
    refresh,
    ...(expires ? { expires } : {}),
    ...(identity.accountId ? { accountId: identity.accountId } : {}),
    ...(identity.email ? { email: identity.email } : {}),
    ...(normalizeIsoString(options.lastRefresh)
      ? {
          codexAuth: {
            authMode: DEFAULT_AUTH_MODE,
            lastRefresh: normalizeIsoString(options.lastRefresh),
          },
        }
      : {}),
  };
}

function normalizeProviderProjection(providerState) {
  if (!isRecord(providerState)) {
    return null;
  }

  const tokens = isRecord(providerState.tokens) ? providerState.tokens : {};
  const accessToken = readTrimmedString(tokens.access_token);
  const refreshToken = readTrimmedString(tokens.refresh_token);
  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
    last_refresh: normalizeIsoString(providerState.last_refresh),
    auth_mode: readTrimmedString(providerState.auth_mode) || DEFAULT_AUTH_MODE,
  };
}

export function getHermesCompatibilityIssue(credential) {
  if (!isRecord(credential)) {
    return "账号数据无效";
  }
  if (credential.provider !== CODEX_PROVIDER) {
    return "不是 openai-codex 账号";
  }
  if (credential.type !== "oauth") {
    return "需要重新登录升级为 OAuth 账号";
  }
  if (!readTrimmedString(credential.access)) {
    return "缺少 access token";
  }
  if (!readTrimmedString(credential.refresh)) {
    return "缺少 refresh token";
  }
  return null;
}

export function isHermesCompatibleCredential(credential) {
  return !getHermesCompatibilityIssue(credential);
}

export function isManagedHermesSource(source) {
  return typeof source === "string" && source.startsWith(HERMES_MANAGED_SOURCE_PREFIX);
}

export function getManagedHermesProfileId(source) {
  return isManagedHermesSource(source)
    ? source.slice(HERMES_MANAGED_SOURCE_PREFIX.length)
    : null;
}

export function buildHermesProviderAuth(credential, options = {}) {
  const issue = getHermesCompatibilityIssue(credential);
  if (issue) {
    throw new Error(`Profile cannot be exported to Hermes auth.json: ${issue}.`);
  }

  return {
    tokens: {
      access_token: credential.access,
      refresh_token: credential.refresh,
    },
    last_refresh: resolveLastRefresh(credential, options),
    auth_mode: resolveAuthMode(credential, options),
  };
}

export function buildHermesManagedPoolEntry(profileId, credential, options = {}) {
  const providerState = buildHermesProviderAuth(credential, options);
  const priority = Number.isInteger(options.priority) ? options.priority : 0;

  return {
    id: createManagedEntryId(profileId),
    label: resolveHermesLabel(profileId, credential),
    auth_type: "oauth",
    priority,
    source: `${HERMES_MANAGED_SOURCE_PREFIX}${profileId}`,
    access_token: providerState.tokens.access_token,
    refresh_token: providerState.tokens.refresh_token,
    last_refresh: providerState.last_refresh,
    base_url: DEFAULT_BASE_URL,
  };
}

export function readHermesAuthRaw(filePath) {
  return readJsonFile(filePath, null);
}

export function readHermesAuthFile(filePath) {
  return readJsonObject(filePath, {});
}

function buildCompatibleProfileOrder(store, preferredOrder = []) {
  const profiles = isRecord(store?.profiles) ? store.profiles : {};
  const orderedProfileIds = dedupeStrings(Array.isArray(preferredOrder) ? preferredOrder : []);
  const result = orderedProfileIds.filter((profileId) => isHermesCompatibleCredential(profiles[profileId]));

  for (const profileId of Object.keys(profiles)) {
    if (!result.includes(profileId) && isHermesCompatibleCredential(profiles[profileId])) {
      result.push(profileId);
    }
  }

  return result;
}

export function buildHermesAuthFile(store, currentAuth = {}, options = {}) {
  const next = structuredClone(isRecord(currentAuth) ? currentAuth : {});
  const profiles = isRecord(store?.profiles) ? store.profiles : {};
  const preferredOrder = buildCompatibleProfileOrder(store, options.preferredOrder);
  const selectedProfileId = typeof options.selectedProfileId === "string" && options.selectedProfileId.trim()
    ? options.selectedProfileId.trim()
    : preferredOrder[0] || null;
  const selectedCredential = selectedProfileId ? profiles[selectedProfileId] : null;
  const existingProviders = isRecord(next.providers) ? { ...next.providers } : {};
  const existingProvider = isRecord(existingProviders[CODEX_PROVIDER]) ? existingProviders[CODEX_PROVIDER] : {};
  const existingPool = isRecord(next.credential_pool) ? { ...next.credential_pool } : {};
  const existingCodexPool = Array.isArray(existingPool[CODEX_PROVIDER]) ? existingPool[CODEX_PROVIDER] : [];

  const preservedCodexEntries = sortPoolEntries(existingCodexPool)
    .filter((entry) => isRecord(entry))
    .filter((entry) => !isManagedHermesSource(entry.source))
    .filter((entry) => readTrimmedString(entry.source) !== "device_code");

  const managedEntries = preferredOrder.map((profileId, index) =>
    buildHermesManagedPoolEntry(profileId, profiles[profileId], {
      ...options,
      priority: index,
    }),
  );

  const preservedEntries = preservedCodexEntries.map((entry, index) => ({
    ...structuredClone(entry),
    priority: managedEntries.length + index,
  }));
  const nextCodexPool = [...managedEntries, ...preservedEntries];

  next.version = typeof next.version === "number" ? next.version : 1;

  if (nextCodexPool.length > 0) {
    existingPool[CODEX_PROVIDER] = nextCodexPool;
    next.credential_pool = existingPool;
  } else {
    delete existingPool[CODEX_PROVIDER];
    if (Object.keys(existingPool).length > 0) {
      next.credential_pool = existingPool;
    } else {
      delete next.credential_pool;
    }
  }

  if (isHermesCompatibleCredential(selectedCredential)) {
    existingProviders[CODEX_PROVIDER] = {
      ...existingProvider,
      ...buildHermesProviderAuth(selectedCredential, options),
    };
    next.providers = existingProviders;
    if (options.setActiveProvider !== false) {
      next.active_provider = CODEX_PROVIDER;
    }
  } else if (Object.keys(existingProviders).length > 0) {
    next.providers = existingProviders;
  } else {
    delete next.providers;
  }

  next.updated_at = new Date().toISOString();
  return next;
}

export function writeHermesAuthFile(filePath, store, options = {}) {
  const currentAuth = readJsonObject(filePath, {});
  writeJsonFileAtomic(filePath, buildHermesAuthFile(store, currentAuth, options));
}

export function extractHermesManagedProjection(auth) {
  const providers = isRecord(auth?.providers) ? auth.providers : {};
  const credentialPool = isRecord(auth?.credential_pool) ? auth.credential_pool : {};
  const providerState = normalizeProviderProjection(providers[CODEX_PROVIDER]);
  const managedPoolEntries = Array.isArray(credentialPool[CODEX_PROVIDER])
    ? sortPoolEntries(credentialPool[CODEX_PROVIDER])
      .map((entry) => normalizePoolEntryForProjection(entry))
      .filter(Boolean)
      .filter((entry) => isManagedHermesSource(entry.source))
    : [];

  return {
    activeProvider: readTrimmedString(auth?.active_provider) || null,
    providerState,
    managedPoolEntries,
  };
}

export function extractHermesManagedProfiles(auth) {
  const credentialPool = isRecord(auth?.credential_pool) ? auth.credential_pool : {};
  if (!Array.isArray(credentialPool[CODEX_PROVIDER])) {
    return [];
  }

  const profiles = [];
  for (const entry of sortPoolEntries(credentialPool[CODEX_PROVIDER])) {
    if (!isRecord(entry) || !isManagedHermesSource(entry.source)) {
      continue;
    }
    const profileId = getManagedHermesProfileId(entry.source);
    const credential = buildCredentialFromTokens(entry, { lastRefresh: entry.last_refresh });
    if (!profileId || !credential) {
      continue;
    }
    profiles.push({ profileId, credential });
  }
  return profiles;
}

export function extractHermesManagedPoolProfileIds(auth) {
  return extractHermesManagedProfiles(auth).map((entry) => entry.profileId);
}

export function extractHermesProviderCredential(auth) {
  const providers = isRecord(auth?.providers) ? auth.providers : {};
  const providerState = isRecord(providers[CODEX_PROVIDER]) ? providers[CODEX_PROVIDER] : null;
  if (!providerState) {
    return null;
  }
  return buildCredentialFromTokens(providerState.tokens, { lastRefresh: providerState.last_refresh });
}

