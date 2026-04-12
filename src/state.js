import { randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import {
  CODEX_PROVIDER,
  PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT,
  TOKEN_KEEPALIVE_REFRESH_WINDOW_MS,
} from "./constants.js";
import {
  applyOrderToAuthStore,
  buildLocalAuthStore,
  buildRuntimeAuthStore,
  computeEffectiveOrder,
  deleteProfileFromAuthStore,
  getStoredOrder,
  listCodexProfiles,
  readAuthStore,
  renameProfileInAuthStore,
  upsertProfileCredential,
  writeAuthStore,
  writeRuntimeAuthStore,
} from "./auth-store.js";
import { createEncryptedExportBundle, readEncryptedExportBundle } from "./auth-bundle.js";
import {
  buildCodexAuthFile,
  codexAuthExactlyMatchesCredential,
  getCodexCompatibilityIssue,
  isCodexCompatibleCredential,
  mergeCodexAuthIntoCredential,
  readCodexAuthFile,
  writeCodexAuthFile,
} from "./codex-cli-auth.js";
import {
  buildStoredCodexCredential,
  enrichOpenAICodexCredential,
  loginWithCodex,
  normalizeManualAuthorizationInput,
  resolveCredentialToken,
  shouldRefreshOAuthCredential,
} from "./codex-auth.js";
import {
  getConfigCodexOrder,
  getConfigCodexProfiles,
  readOpenClawConfig,
  syncCodexIntoConfig,
  touchOpenClawConfig,
  writeOpenClawConfig,
} from "./config-store.js";
import { withFileLock } from "./file-lock.js";
import {
  buildHermesAuthFile,
  extractHermesManagedProfiles,
  extractHermesManagedProjection,
  extractHermesProviderCredential,
  getHermesCompatibilityIssue,
  isHermesCompatibleCredential,
  readHermesAuthFile,
  readHermesAuthRaw,
  writeHermesAuthFile,
} from "./hermes-auth.js";
import { readJsonFile } from "./json-files.js";
import {
  buildConfigAudit,
  buildWarnings,
  getRecommendationBlockedReason,
  isRecommendationEligible,
  recommendProfileOrder,
} from "./order.js";
import { resolvePaths } from "./paths.js";
import { clearAutoAuthProfileOverrides, readSessionStore, writeSessionStore } from "./session-store.js";
import { loadUsageRefreshBatch } from "./usage-refresh.js";
import { dedupeStrings, isRecord, toErrorMessage } from "./utils.js";

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
  if (typeof credential?.email === "string" && credential.email.trim()) {
    return credential.email.trim();
  }
  if (typeof credential?.metadata?.email === "string" && credential.metadata.email.trim()) {
    return credential.metadata.email.trim();
  }
  return null;
}

function resolveExpiresAt(credential) {
  return typeof credential?.expires === "number" && Number.isFinite(credential.expires)
    ? credential.expires
    : null;
}

function normalizeEmail(email) {
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

function sanitizeProfileSuffix(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createBootstrapProfileId(existingIds, credential, preferredLabel = "default") {
  const candidates = [
    sanitizeProfileSuffix(resolveEmail(credential)?.split("@")[0] || ""),
    sanitizeProfileSuffix(resolveAccountId(credential) || ""),
    sanitizeProfileSuffix(preferredLabel),
    "default",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const profileId = `${CODEX_PROVIDER}:${candidate}`;
    if (!existingIds.has(profileId)) {
      return profileId;
    }
  }

  let index = 2;
  while (existingIds.has(`${CODEX_PROVIDER}:default-${index}`)) {
    index += 1;
  }
  return `${CODEX_PROVIDER}:default-${index}`;
}

function exactTokenMatch(left, right) {
  const leftRefresh = typeof left?.refresh === "string" ? left.refresh.trim() : "";
  const rightRefresh = typeof right?.refresh === "string" ? right.refresh.trim() : "";
  if (leftRefresh && rightRefresh && leftRefresh === rightRefresh) {
    return true;
  }

  const leftAccess = typeof left?.access === "string" ? left.access.trim() : "";
  const rightAccess = typeof right?.access === "string" ? right.access.trim() : "";
  return Boolean(leftAccess) && Boolean(rightAccess) && leftAccess === rightAccess;
}

function credentialsShareIdentity(left, right) {
  if (exactTokenMatch(left, right)) {
    return true;
  }

  const leftAccountId = resolveAccountId(left);
  const rightAccountId = resolveAccountId(right);
  if (leftAccountId && rightAccountId) {
    return leftAccountId === rightAccountId;
  }

  const leftEmail = normalizeEmail(resolveEmail(left));
  const rightEmail = normalizeEmail(resolveEmail(right));
  if (leftEmail && rightEmail) {
    return leftEmail === rightEmail;
  }

  return false;
}

function serializeComparable(value) {
  return JSON.stringify(value ?? null);
}

function getPreferredOrder(store, configOrder = []) {
  return getStoredOrder(store).length > 0
    ? getStoredOrder(store)
    : computeEffectiveOrder(store, configOrder);
}

function getSelectedProfileId(store, configOrder = []) {
  return getPreferredOrder(store, configOrder)[0] || null;
}

function ensureLocalStoreInitialized(context) {
  if (!context.localAuthStoreExists) {
    throw new Error("Local auth store is not initialized yet. Initialize or import a bundle first.");
  }
}

function readLocalAuthStore(context) {
  ensureLocalStoreInitialized(context);
  return readAuthStore(context.localAuthStorePath);
}

function readRuntimeAuthStore(context) {
  return context.runtimeAuthStoreExists
    ? readAuthStore(context.runtimeAuthStorePath)
    : buildLocalAuthStore({});
}

function readCodexAuthRaw(filePath) {
  return readJsonFile(filePath, null);
}

function createEmptyMaintenance() {
  return {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastChangedProfileIds: [],
  };
}

function buildMaintenanceSummary(store) {
  return {
    ...createEmptyMaintenance(),
    ...(isRecord(store?.maintenance) ? store.maintenance : {}),
    lastChangedProfileIds: Array.isArray(store?.maintenance?.lastChangedProfileIds)
      ? store.maintenance.lastChangedProfileIds.filter((entry) => typeof entry === "string" && entry.trim())
      : [],
  };
}

function summarizeFailedProfiles(failedProfiles) {
  if (!Array.isArray(failedProfiles) || failedProfiles.length === 0) {
    return null;
  }
  if (failedProfiles.length === 1) {
    return `${failedProfiles[0].profileId}: ${failedProfiles[0].error}`;
  }
  return `${failedProfiles.length} profiles failed, latest: ${failedProfiles.at(-1).profileId}: ${failedProfiles.at(-1).error}`;
}

function applyMaintenanceUpdate(store, maintenance) {
  const next = buildLocalAuthStore(store);
  const updated = {
    ...createEmptyMaintenance(),
    ...buildMaintenanceSummary(next),
    ...(isRecord(maintenance) ? maintenance : {}),
    lastChangedProfileIds: Array.isArray(maintenance?.lastChangedProfileIds)
      ? dedupeStrings(maintenance.lastChangedProfileIds)
      : buildMaintenanceSummary(next).lastChangedProfileIds,
  };

  next.maintenance = updated.lastAttemptAt || updated.lastSuccessAt || updated.lastError || updated.lastChangedProfileIds.length > 0
    ? updated
    : undefined;
  return next;
}

function createApplyResult(overrides = {}) {
  return {
    codexSelectionAttempted: false,
    codexSelectionUpdated: false,
    codexSelectionProfileId: null,
    codexSelectionSkippedReason: null,
    ...overrides,
  };
}

function createEmptyUsage(error = null) {
  return {
    primary: { label: null, usedPercent: null, remainingPercent: null, resetAt: null },
    secondary: { label: null, usedPercent: null, remainingPercent: null, resetAt: null },
    plan: null,
    error,
  };
}

function getRemainingPercent(windowData) {
  return typeof windowData?.remainingPercent === "number" && Number.isFinite(windowData.remainingPercent)
    ? windowData.remainingPercent
    : null;
}

function isCodexLowQuotaRow(row) {
  if (!row || row.error) {
    return false;
  }

  const primaryRemaining = getRemainingPercent(row.primary);
  const secondaryRemaining = getRemainingPercent(row.secondary);
  return (
    (primaryRemaining != null && primaryRemaining <= PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT)
    || secondaryRemaining === 0
  );
}

function compareNullableNumberDesc(left, right) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return right - left;
}

function compareNullableNumberAsc(left, right) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return left - right;
}

function recommendCodexProfile(rows, options = {}) {
  const openClawProfileId = typeof options.openClawProfileId === "string" && options.openClawProfileId.trim()
    ? options.openClawProfileId.trim()
    : null;
  const compatibleRows = (Array.isArray(rows) ? rows : []).filter((row) => row?.codexCompatible);
  const candidateRows = compatibleRows.filter((row) => row.profileId !== openClawProfileId);

  if (compatibleRows.length === 0) {
    return {
      profileId: null,
      blockedReason: "没有可供 Codex 使用的兼容账号。",
    };
  }

  if (candidateRows.length === 0) {
    return {
      profileId: null,
      blockedReason: "可供 Codex 使用的兼容账号只剩下 OpenClaw 当前第一名，已按规则避开。",
    };
  }

  const best = candidateRows
    .toSorted((left, right) => {
      const primary = compareNullableNumberDesc(getRemainingPercent(left.primary), getRemainingPercent(right.primary));
      if (primary !== 0) {
        return primary;
      }

      const secondary = compareNullableNumberDesc(getRemainingPercent(left.secondary), getRemainingPercent(right.secondary));
      if (secondary !== 0) {
        return secondary;
      }

      const secondaryReset = compareNullableNumberAsc(left.secondary?.resetAt ?? null, right.secondary?.resetAt ?? null);
      if (secondaryReset !== 0) {
        return secondaryReset;
      }

      if (left.currentOrderIndex !== right.currentOrderIndex) {
        return left.currentOrderIndex - right.currentOrderIndex;
      }

      return left.profileId.localeCompare(right.profileId);
    })
    .at(0);

  return {
    profileId: best?.profileId || null,
    blockedReason: best ? null : "当前没有可供 Codex 切换的目标账号。",
  };
}

function buildRecommendedSelection(rows, recommendedOrder) {
  const rowsById = new Map(rows.map((row) => [row.profileId, row]));
  for (const profileId of recommendedOrder) {
    const row = rowsById.get(profileId);
    if (row?.recommendationEligible) {
      return {
        profileId,
        blockedReason: null,
      };
    }
  }
  const blockedReasons = recommendedOrder
    .map((profileId) => rowsById.get(profileId)?.recommendationBlockedReason)
    .filter((reason) => typeof reason === "string" && reason.trim());
  const allBlockedByLowPrimaryQuota =
    blockedReasons.length > 0 &&
    blockedReasons.every((reason) => reason.includes("5h 可用额度 <="));
  return {
    profileId: null,
    blockedReason: recommendedOrder.length === 0
      ? null
      : allBlockedByLowPrimaryQuota
        ? "全部账号 5h 可用额度 <= 5%，暂不自动应用推荐顺序。"
        : blockedReasons[0] || "当前没有可自动应用的推荐账号。",
  };
}

function resolveUsageToken(credential) {
  if (credential?.type === "oauth") {
    if (typeof credential.access !== "string" || !credential.access.trim()) {
      throw new Error("OAuth profile is missing access token");
    }
    return credential.access;
  }

  if (credential?.type === "token") {
    if (typeof credential.token !== "string" || !credential.token.trim()) {
      throw new Error("Token profile is missing bearer token");
    }
    return credential.token;
  }

  throw new Error(`Unsupported credential type: ${credential?.type ?? "unknown"}`);
}

function createNotes() {
  return [
    "The project-local store is the canonical source of truth. OpenClaw auth-profiles.json, Hermes auth.json, and ~/.codex/auth.json are all generated projections.",
    "Quota refresh and token keepalive are separate flows: quota refresh reloads usage and ranking, while token keepalive only renews OAuth credentials.",
    "Applying order updates the local store, the managed OpenClaw slice, and the managed Hermes slice. ~/.codex/auth.json is only rewritten when the selected account is Codex-compatible.",
    "Setting a profile as current updates OpenClaw first, then Hermes if the account is OAuth-compatible, and finally Codex CLI if the account also carries a Codex id_token.",
  ];
}

function inspectCodexAuthFile(context, profiles, expectedCredential = null) {
  let auth = null;
  let raw = null;
  let error = null;

  try {
    raw = readCodexAuthRaw(context.codexAuthPath);
    auth = readCodexAuthFile(context.codexAuthPath);
  } catch (readError) {
    error = toErrorMessage(readError);
  }

  const matchingProfileIds = auth
    ? profiles
      .filter((entry) => codexAuthExactlyMatchesCredential(auth, entry.credential))
      .map((entry) => entry.profileId)
    : [];

  let drift = false;
  const matchedCredential = matchingProfileIds.length === 1
    ? profiles.find((entry) => entry.profileId === matchingProfileIds[0])?.credential || null
    : null;
  const driftTarget = expectedCredential && isCodexCompatibleCredential(expectedCredential)
    ? expectedCredential
    : matchedCredential && isCodexCompatibleCredential(matchedCredential)
      ? matchedCredential
      : null;
  if (driftTarget) {
    try {
      const expected = buildCodexAuthFile(driftTarget);
      drift = !raw || serializeComparable(raw) !== serializeComparable(expected);
    } catch {
      drift = true;
    }
  }

  return {
    auth,
    raw,
    error,
    matchingProfileIds,
    linkedProfileId: matchingProfileIds.length === 1 ? matchingProfileIds[0] : null,
    ambiguous: matchingProfileIds.length > 1,
    drift,
  };
}

function inspectOpenClawRuntime(context, localStore = null) {
  let store = null;
  let error = null;

  try {
    store = context.runtimeAuthStoreExists ? readAuthStore(context.runtimeAuthStorePath) : null;
  } catch (readError) {
    error = toErrorMessage(readError);
  }

  const expected = localStore ? buildRuntimeAuthStore(localStore) : null;
  const drift = Boolean(expected) && serializeComparable(store ? buildRuntimeAuthStore(store) : null) !== serializeComparable(expected);

  return {
    store,
    error,
    drift,
  };
}

function inspectHermesAuthFile(context, localStore = null, options = {}) {
  let auth = null;
  let raw = null;
  let error = null;

  try {
    raw = readHermesAuthRaw(context.hermesAuthPath);
    auth = readHermesAuthFile(context.hermesAuthPath);
  } catch (readError) {
    error = toErrorMessage(readError);
  }

  const projection = extractHermesManagedProjection(raw);
  const managedProfiles = extractHermesManagedProfiles(raw);
  const providerCredential = extractHermesProviderCredential(raw);
  const matchingProfileIds = providerCredential
    ? listCodexProfiles(localStore || buildLocalAuthStore({}))
      .filter((entry) => credentialsShareIdentity(entry.credential, providerCredential))
      .map((entry) => entry.profileId)
    : [];

  let drift = false;
  if (localStore) {
    try {
      const expected = buildHermesAuthFile(localStore, raw || {}, {
        preferredOrder: options.preferredOrder,
        selectedProfileId: options.selectedProfileId,
      });
      drift = serializeComparable(extractHermesManagedProjection(raw)) !== serializeComparable(extractHermesManagedProjection(expected));
    } catch {
      drift = true;
    }
  }

  return {
    auth,
    raw,
    error,
    drift,
    activeProvider: projection.activeProvider,
    providerCredential,
    matchingProfileIds,
    linkedProfileId: matchingProfileIds.length === 1 ? matchingProfileIds[0] : null,
    ambiguous: matchingProfileIds.length > 1,
    selectedProfileId: matchingProfileIds.length === 1 ? matchingProfileIds[0] : null,
    poolProfileIds: managedProfiles.map((entry) => entry.profileId),
  };
}

function buildCodexSummary(context, codexRuntime, options = {}) {
  return {
    exists: context.codexAuthExists,
    path: context.codexAuthPath,
    linkedProfileId: codexRuntime.linkedProfileId,
    openClawSelectedProfileId: options.openClawSelectedProfileId || null,
    accountId: codexRuntime.auth?.tokens?.accountId || null,
    lastRefresh: codexRuntime.auth?.lastRefresh || null,
    error: codexRuntime.error,
    drift: codexRuntime.drift,
  };
}

function buildOpenClawRuntimeSummary(context, runtimeAuth) {
  return {
    exists: context.runtimeAuthStoreExists,
    path: context.runtimeAuthStorePath,
    error: runtimeAuth.error,
    drift: runtimeAuth.drift,
    profileCount: runtimeAuth.store ? listCodexProfiles(runtimeAuth.store).length : 0,
  };
}

function buildHermesSummary(context, hermesRuntime) {
  return {
    exists: context.hermesAuthExists,
    path: context.hermesAuthPath,
    error: hermesRuntime.error,
    drift: hermesRuntime.drift,
    activeProvider: hermesRuntime.activeProvider,
    selectedProfileId: hermesRuntime.selectedProfileId,
    poolProfileIds: hermesRuntime.poolProfileIds,
  };
}

function buildDashboardWarnings(baseWarnings, context, codexRuntime, runtimeAuth, hermesRuntime, localStoreReady) {
  const warnings = [...baseWarnings];

  if (!localStoreReady) {
    warnings.unshift("Local auth store is not initialized yet. Initialize from runtime files or import an encrypted bundle.");
  }

  if (runtimeAuth?.error) {
    warnings.push(`Failed to read OpenClaw auth-profiles.json: ${runtimeAuth.error}`);
  } else if (localStoreReady && runtimeAuth?.drift) {
    warnings.push("OpenClaw runtime auth-profiles.json managed openai-codex entries have drifted from the local canonical store.");
  }

  if (codexRuntime.error) {
    warnings.push(`Failed to read ~/.codex/auth.json: ${codexRuntime.error}`);
  } else if (context.codexAuthExists && codexRuntime.auth && codexRuntime.matchingProfileIds.length === 0) {
    warnings.push("Current ~/.codex/auth.json does not match any stored profile.");
  } else if (codexRuntime.ambiguous) {
    warnings.push("Current ~/.codex/auth.json matches multiple stored profiles.");
  } else if (localStoreReady && codexRuntime.drift) {
    warnings.push("Current ~/.codex/auth.json has drifted from the local canonical selection.");
  }

  if (hermesRuntime?.error) {
    warnings.push(`Failed to read Hermes auth.json: ${hermesRuntime.error}`);
  } else if (localStoreReady && hermesRuntime?.drift) {
    warnings.push("Hermes auth.json managed openai-codex projection has drifted from the local canonical store.");
  } else if (context.hermesAuthExists && hermesRuntime?.providerCredential && hermesRuntime.matchingProfileIds.length === 0) {
    warnings.push("Current Hermes openai-codex provider state does not match any stored profile.");
  } else if (hermesRuntime?.ambiguous) {
    warnings.push("Current Hermes openai-codex provider state matches multiple stored profiles.");
  }

  return warnings;
}

async function updateAuthStore(options, updater) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  fs.mkdirSync(path.dirname(context.localAuthStorePath), { recursive: true });
  return await withFileLock(context.localAuthStorePath, async () => {
    const store = readAuthStore(context.localAuthStorePath);
    const next = updater(store, context);
    writeAuthStore(context.localAuthStorePath, buildLocalAuthStore(next));
    return next;
  });
}

async function updateOpenClawConfig(options, updater) {
  const context = resolvePaths(options);
  fs.mkdirSync(path.dirname(context.configPath), { recursive: true });
  return await withFileLock(context.configPath, async () => {
    const config = readOpenClawConfig(context.configPath);
    const next = updater(config, context);
    writeOpenClawConfig(context.configPath, next);
    return next;
  });
}

async function updateSessionStore(options, updater) {
  const context = resolvePaths(options);
  fs.mkdirSync(path.dirname(context.sessionStorePath), { recursive: true });
  return await withFileLock(context.sessionStorePath, async () => {
    const store = readSessionStore(context.sessionStorePath);
    const next = updater(store, context);
    writeSessionStore(context.sessionStorePath, next);
    return next;
  });
}

async function touchRuntimeSelection(options, preferredProfileId) {
  const context = resolvePaths(options);

  await updateOpenClawConfig(options, (config) => touchOpenClawConfig(config));

  if (context.sessionStoreExists && preferredProfileId) {
    await updateSessionStore(options, (store) =>
      clearAutoAuthProfileOverrides(store, {
        provider: CODEX_PROVIDER,
        preferredProfileId,
      }).store,
    );
  }
}

async function writeCodexSelection(options, credential) {
  const context = resolvePaths(options);
  fs.mkdirSync(path.dirname(context.codexAuthPath), { recursive: true });
  await withFileLock(context.codexAuthPath, async () => {
    writeCodexAuthFile(context.codexAuthPath, credential);
  });
}

async function writeHermesProjection(options, store, projectionOptions = {}) {
  const context = resolvePaths(options);
  fs.mkdirSync(path.dirname(context.hermesAuthPath), { recursive: true });
  await withFileLock(context.hermesAuthPath, async () => {
    writeHermesAuthFile(context.hermesAuthPath, store, projectionOptions);
  });
}

async function writeRuntimeAuthProjection(options, store) {
  const context = resolvePaths(options);
  fs.mkdirSync(path.dirname(context.runtimeAuthStorePath), { recursive: true });
  await withFileLock(context.runtimeAuthStorePath, async () => {
    writeRuntimeAuthStore(context.runtimeAuthStorePath, store);
  });
}

async function syncRuntimeConfig(options, store, configOptions = {}) {
  const preferredOrder = getPreferredOrder(store);
  const runtimeProfileIds = listCodexProfiles(store).map((entry) => entry.profileId);
  await updateOpenClawConfig(options, (config) => {
    const synced = syncCodexIntoConfig(config, runtimeProfileIds, preferredOrder);
    return configOptions.touch ? touchOpenClawConfig(synced) : synced;
  });
}

async function exportRuntimeFromLocal(options, store, exportOptions = {}) {
  const preferredOrder = getPreferredOrder(store);
  const selectedProfileId = exportOptions.preferredProfileId || preferredOrder[0] || null;
  await writeRuntimeAuthProjection(options, store);
  await syncRuntimeConfig(options, store, { touch: Boolean(exportOptions.touchConfig) });
  await writeHermesProjection(options, store, {
    preferredOrder,
    selectedProfileId,
  });

  if (selectedProfileId) {
    await touchRuntimeSelection(options, selectedProfileId);
  }

  if (exportOptions.codexCredential && isCodexCompatibleCredential(exportOptions.codexCredential)) {
    await writeCodexSelection(options, exportOptions.codexCredential);
  }
}

function mergeRefreshedCredential(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    codexAuth: incoming.codexAuth ?? existing.codexAuth,
  };
}

function assertMatchingProfileIdentity(profileId, existing, incoming) {
  const existingAccountId = resolveAccountId(existing);
  const incomingAccountId = resolveAccountId(incoming);
  if (existingAccountId && incomingAccountId && existingAccountId !== incomingAccountId) {
    throw new Error(`Logged-in account does not match profile "${profileId}".`);
  }

  const existingEmail = normalizeEmail(resolveEmail(existing));
  const incomingEmail = normalizeEmail(resolveEmail(incoming));
  if (existingEmail && incomingEmail && existingEmail !== incomingEmail) {
    throw new Error(`Logged-in account does not match profile "${profileId}".`);
  }
}

function credentialHasSameIdentity(left, right) {
  const leftAccountId = resolveAccountId(left);
  const rightAccountId = resolveAccountId(right);
  if (leftAccountId && rightAccountId) {
    return leftAccountId === rightAccountId;
  }

  const leftEmail = normalizeEmail(resolveEmail(left));
  const rightEmail = normalizeEmail(resolveEmail(right));
  if (leftEmail && rightEmail) {
    return leftEmail === rightEmail;
  }

  return false;
}

function exactRefreshMatch(left, right) {
  const leftRefresh = typeof left?.refresh === "string" ? left.refresh.trim() : "";
  const rightRefresh = typeof right?.refresh === "string" ? right.refresh.trim() : "";
  return Boolean(leftRefresh) && leftRefresh === rightRefresh;
}

function shouldMatchImportByAccountId(existingCredential, incomingCredential) {
  const involvesCodex =
    existingCredential?.provider === CODEX_PROVIDER
    || incomingCredential?.provider === CODEX_PROVIDER;

  if (!involvesCodex) {
    return true;
  }

  const existingRefresh = typeof existingCredential?.refresh === "string" ? existingCredential.refresh.trim() : "";
  const incomingRefresh = typeof incomingCredential?.refresh === "string" ? incomingCredential.refresh.trim() : "";

  // Codex exports can contain multiple profiles under one accountId.
  // When refresh tokens differ, each profile should stay independent.
  return !existingRefresh && !incomingRefresh;
}

function resolveImportTargetProfileId(localStore, incomingProfileId, incomingCredential) {
  const profiles = Object.entries(localStore.profiles);
  const sameId = localStore.profiles[incomingProfileId];
  if (sameId && credentialHasSameIdentity(sameId, incomingCredential)) {
    return incomingProfileId;
  }

  const refreshMatches = profiles
    .filter(([, credential]) => exactRefreshMatch(credential, incomingCredential))
    .map(([profileId]) => profileId);
  if (refreshMatches.length === 1) {
    return refreshMatches[0];
  }

  const accountMatches = profiles
    .filter(([, credential]) => {
      if (!shouldMatchImportByAccountId(credential, incomingCredential)) {
        return false;
      }
      const existingAccountId = resolveAccountId(credential);
      const incomingAccountId = resolveAccountId(incomingCredential);
      return Boolean(existingAccountId) && Boolean(incomingAccountId) && existingAccountId === incomingAccountId;
    })
    .map(([profileId]) => profileId);
  if (accountMatches.length === 1) {
    return accountMatches[0];
  }

  const emailMatches = profiles
    .filter(([, credential]) => {
      if (!shouldMatchImportByAccountId(credential, incomingCredential)) {
        return false;
      }
      const existingEmail = normalizeEmail(resolveEmail(credential));
      const incomingEmail = normalizeEmail(resolveEmail(incomingCredential));
      return Boolean(existingEmail) && Boolean(incomingEmail) && existingEmail === incomingEmail;
    })
    .map(([profileId]) => profileId);
  if (emailMatches.length === 1) {
    return emailMatches[0];
  }

  return null;
}

function createImportedProfileId(profileId, existingIds) {
  const suffix = profileId.startsWith(`${CODEX_PROVIDER}:`)
    ? profileId.slice(`${CODEX_PROVIDER}:`.length)
    : profileId;
  const base = `${CODEX_PROVIDER}:${suffix}-imported`;
  if (!existingIds.has(base)) {
    return base;
  }
  let index = 2;
  while (existingIds.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function summarizeImportActions(actions) {
  return actions.reduce((summary, action) => {
    summary.total += 1;
    summary[action.type] = (summary[action.type] || 0) + 1;
    return summary;
  }, {
    total: 0,
    add: 0,
    update: 0,
    skip: 0,
    "renamed-import": 0,
  });
}

function previewBundleImport(localStore, importedStore) {
  const next = buildLocalAuthStore(localStore);
  const existingIds = new Set(Object.keys(next.profiles));
  const idMap = new Map();
  const actions = [];
  const importedOrder = getPreferredOrder(importedStore);

  for (const [incomingProfileId, incomingCredential] of Object.entries(importedStore.profiles)) {
    const targetProfileId = resolveImportTargetProfileId(next, incomingProfileId, incomingCredential);

    if (targetProfileId) {
      const existing = next.profiles[targetProfileId];
      const merged = mergeRefreshedCredential(existing, incomingCredential);
      const type = serializeComparable(existing) === serializeComparable(merged) ? "skip" : "update";
      next.profiles[targetProfileId] = merged;
      idMap.set(incomingProfileId, targetProfileId);
      actions.push({
        type,
        sourceProfileId: incomingProfileId,
        targetProfileId,
      });
      continue;
    }

    const finalProfileId = existingIds.has(incomingProfileId)
      ? createImportedProfileId(incomingProfileId, existingIds)
      : incomingProfileId;
    existingIds.add(finalProfileId);
    next.profiles[finalProfileId] = incomingCredential;
    idMap.set(incomingProfileId, finalProfileId);
    actions.push({
      type: finalProfileId === incomingProfileId ? "add" : "renamed-import",
      sourceProfileId: incomingProfileId,
      targetProfileId: finalProfileId,
    });
  }

  const localOrder = getPreferredOrder(localStore);
  const addedProfileIds = actions
    .filter((action) => action.type === "add" || action.type === "renamed-import")
    .map((action) => action.targetProfileId);
  const mappedImportedOrder = importedOrder
    .map((profileId) => idMap.get(profileId))
    .filter(Boolean);

  next.order = next.order ?? {};
  next.order[CODEX_PROVIDER] = localOrder.length > 0
    ? dedupeStrings([...localOrder, ...mappedImportedOrder.filter((profileId) => addedProfileIds.includes(profileId))])
    : dedupeStrings(mappedImportedOrder);

  const usageStats = isRecord(next.usageStats) ? structuredClone(next.usageStats) : {};
  for (const [sourceProfileId, finalProfileId] of idMap.entries()) {
    if (importedStore.usageStats?.[sourceProfileId]) {
      usageStats[finalProfileId] = importedStore.usageStats[sourceProfileId];
    }
  }
  next.usageStats = Object.keys(usageStats).length > 0 ? usageStats : undefined;

  const localLastGood = localStore.lastGood?.[CODEX_PROVIDER];
  const importedLastGood = importedStore.lastGood?.[CODEX_PROVIDER];
  const mappedImportedLastGood = importedLastGood ? idMap.get(importedLastGood) : null;
  next.lastGood = next.lastGood ?? {};
  if (localLastGood && next.profiles[localLastGood]) {
    next.lastGood[CODEX_PROVIDER] = localLastGood;
  } else if (mappedImportedLastGood && next.profiles[mappedImportedLastGood]) {
    next.lastGood[CODEX_PROVIDER] = mappedImportedLastGood;
  } else if (next.lastGood[CODEX_PROVIDER]) {
    delete next.lastGood[CODEX_PROVIDER];
  }
  if (next.lastGood && Object.keys(next.lastGood).length === 0) {
    next.lastGood = undefined;
  }

  return {
    store: buildLocalAuthStore(next),
    actions,
    summary: summarizeImportActions(actions),
  };
}

function mergeImportedProfiles(localStore, importedProfiles, importedOrder = [], importedLastGood = null) {
  const nextImportedStore = buildLocalAuthStore({
    profiles: importedProfiles,
    order: importedOrder.length > 0
      ? {
          [CODEX_PROVIDER]: importedOrder,
        }
      : undefined,
    lastGood: importedLastGood
      ? {
          [CODEX_PROVIDER]: importedLastGood,
        }
      : undefined,
  });
  return previewBundleImport(localStore, nextImportedStore).store;
}

function mergeHermesSidecarIntoStore(store, hermesRuntime, options = {}) {
  let nextStore = buildLocalAuthStore(store);
  const managedProfiles = extractHermesManagedProfiles(hermesRuntime);
  const managedProfileIds = managedProfiles.map((entry) => entry.profileId);
  const selectedCredential = extractHermesProviderCredential(hermesRuntime);

  if (managedProfiles.length > 0) {
    const importedProfiles = Object.fromEntries(
      managedProfiles.map((entry) => [entry.profileId, entry.credential]),
    );
    nextStore = mergeImportedProfiles(
      nextStore,
      importedProfiles,
      managedProfileIds,
      managedProfileIds.includes(options.selectedProfileId) ? options.selectedProfileId : null,
    );
  }

  if (selectedCredential) {
    const existingIds = new Set(Object.keys(nextStore.profiles));
    const profileId = createBootstrapProfileId(existingIds, selectedCredential, "hermes");
    nextStore = mergeImportedProfiles(nextStore, {
      [profileId]: selectedCredential,
    });

    const matchedProfileIds = listCodexProfiles(nextStore)
      .filter((entry) => credentialsShareIdentity(entry.credential, selectedCredential))
      .map((entry) => entry.profileId);
    if (matchedProfileIds.length === 1) {
      const selectedProfileId = matchedProfileIds[0];
      const currentOrder = getPreferredOrder(nextStore);
      nextStore = applyOrderToAuthStore(nextStore, [
        selectedProfileId,
        ...currentOrder.filter((profileId) => profileId !== selectedProfileId),
      ]);
    }
  }

  return nextStore;
}

function mergeCodexSidecarIntoStore(store, codexAuth) {
  if (!codexAuth) {
    return buildLocalAuthStore(store);
  }

  const matches = listCodexProfiles(store)
    .filter((entry) => codexAuthExactlyMatchesCredential(codexAuth, entry.credential))
    .map((entry) => entry.profileId);
  if (matches.length !== 1) {
    return buildLocalAuthStore(store);
  }

  const nextStore = structuredClone(store);
  nextStore.profiles[matches[0]] = mergeCodexAuthIntoCredential(nextStore.profiles[matches[0]], codexAuth);
  return buildLocalAuthStore(nextStore);
}

export async function loadDashboardState(options = {}, deps = {}) {
  const context = resolvePaths(options);
  const config = readOpenClawConfig(context.configPath);
  const configOrder = getConfigCodexOrder(config);
  const configProfileIds = getConfigCodexProfiles(config);
  const localStoreReady = context.localAuthStoreExists;
  const authStore = localStoreReady ? readLocalAuthStore(context) : buildLocalAuthStore({});
  const profiles = listCodexProfiles(authStore);
  const runtimeProfileIds = profiles.map((entry) => entry.profileId);
  const currentEffectiveOrder = computeEffectiveOrder(authStore, configOrder);

  const usageByProfileId = new Map();
  const usageRequests = [];
  for (const entry of profiles) {
    try {
      usageRequests.push({
        profileId: entry.profileId,
        token: resolveUsageToken(entry.credential),
        accountId: resolveAccountId(entry.credential) ?? undefined,
      });
    } catch (error) {
      usageByProfileId.set(entry.profileId, createEmptyUsage(toErrorMessage(error)));
    }
  }

  const usageBatch = await loadUsageRefreshBatch(usageRequests, {
    fetchImpl: deps.fetchImpl || fetch,
    now: deps.now,
    cacheTtlMs: deps.usageCacheTtlMs,
    concurrency: deps.usageFetchConcurrency,
  });
  for (const [profileId, usage] of usageBatch.usageByProfileId.entries()) {
    usageByProfileId.set(profileId, usage);
  }

  const rows = [];
  for (const entry of profiles) {
    const currentOrderIndex = currentEffectiveOrder.indexOf(entry.profileId);
    const usage = usageByProfileId.get(entry.profileId) || createEmptyUsage();

    const credential = entry.credential;
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

  const finalProfiles = listCodexProfiles(authStore);
  const selectedProfileId = getSelectedProfileId(authStore, configOrder);
  const runtimeAuth = inspectOpenClawRuntime(context, localStoreReady ? authStore : null);
  const codexRuntime = inspectCodexAuthFile(context, finalProfiles);
  const hermesRuntime = inspectHermesAuthFile(context, localStoreReady ? authStore : null, {
    preferredOrder: currentEffectiveOrder,
    selectedProfileId,
  });
  const profileMap = new Map(finalProfiles.map((entry) => [entry.profileId, entry.credential]));

  const storedOrder = getStoredOrder(authStore);
  const recommendedOrder = recommendProfileOrder(rows);
  const rankedRows = rows
    .map((row) => {
      const credential = profileMap.get(row.profileId);
      const recommendationBlockedReason = getRecommendationBlockedReason(row);
      const codexCompatible = isCodexCompatibleCredential(credential);
      const hermesCompatible = isHermesCompatibleCredential(credential);
      const codexStatusReason = getCodexCompatibilityIssue(credential);
      const hermesStatusReason = getHermesCompatibilityIssue(credential);
      const canLinkCurrentCodex =
        !codexCompatible &&
        codexRuntime.matchingProfileIds.length === 1 &&
        codexRuntime.linkedProfileId === row.profileId;

      return {
        ...row,
        recommendedOrderIndex: recommendedOrder.indexOf(row.profileId),
        recommendationEligible: isRecommendationEligible(row),
        recommendationBlockedReason,
        codexCompatible,
        codexStatusReason,
        hermesCompatible,
        hermesStatusReason,
        canLinkCurrentCodex,
        openClawCurrent: row.currentOrderIndex === 0,
        codexCurrent: codexRuntime.linkedProfileId === row.profileId,
        hermesCurrent: hermesRuntime.linkedProfileId === row.profileId,
        isSelectedEverywhere: codexRuntime.linkedProfileId === row.profileId && row.currentOrderIndex === 0,
      };
    })
    .toSorted((left, right) => left.recommendedOrderIndex - right.recommendedOrderIndex);
  const recommendedSelection = buildRecommendedSelection(rankedRows, recommendedOrder);
  const codexRecommendation = recommendCodexProfile(rankedRows, {
    openClawProfileId: recommendedSelection.profileId || selectedProfileId,
  });
  const codexCurrentRow = codexRuntime.linkedProfileId
    ? rankedRows.find((row) => row.profileId === codexRuntime.linkedProfileId) || null
    : null;
  const codexCurrentLowQuota = isCodexLowQuotaRow(codexCurrentRow);
  const codexAutoSwitchSuggested = Boolean(
    codexCurrentLowQuota
    && codexCurrentRow
    && codexRecommendation.profileId
    && codexRecommendation.profileId !== codexCurrentRow.profileId
  );
  const codexAutoSwitchReason = codexAutoSwitchSuggested
    ? `当前 Codex 账号额度偏低，建议切到 ${codexRecommendation.profileId}。`
    : codexCurrentLowQuota
      ? codexRecommendation.blockedReason || "当前 Codex 账号额度偏低，但暂时没有可切换目标。"
      : null;

  const finalRankedRows = rankedRows.map((row) => ({
    ...row,
    codexRecommended: codexRecommendation.profileId === row.profileId,
  }));

  const audit = buildConfigAudit({
    runtimeProfileIds,
    storedOrder,
    configProfileIds,
    configOrder,
  });
  const warnings = buildDashboardWarnings(
    buildWarnings({ rows: finalRankedRows, audit, context }),
    context,
    codexRuntime,
    runtimeAuth,
    hermesRuntime,
    localStoreReady,
  );

  return {
    generatedAt: Date.now(),
    context,
    localStore: {
      exists: localStoreReady,
      path: context.localAuthStorePath,
    },
    maintenance: buildMaintenanceSummary(authStore),
    runtimeAuth: buildOpenClawRuntimeSummary(context, runtimeAuth),
    codexAuth: buildCodexSummary(context, codexRuntime, {
      openClawSelectedProfileId: selectedProfileId,
    }),
    hermesAuth: buildHermesSummary(context, hermesRuntime),
    currentEffectiveOrder,
    storedOrder,
    configOrder,
    recommendedOrder,
    recommendedSelectionProfileId: recommendedSelection.profileId,
    recommendedSelectionBlockedReason: recommendedSelection.blockedReason,
    codexRecommendedProfileId: codexRecommendation.profileId,
    codexRecommendedBlockedReason: codexRecommendation.blockedReason,
    codexCurrentLowQuota,
    codexAutoSwitchSuggested,
    codexAutoSwitchReason,
    codexWouldDivergeFromOpenClaw: Boolean(
      codexRecommendation.profileId
      && selectedProfileId
      && codexRecommendation.profileId !== selectedProfileId
    ),
    rows: finalRankedRows,
    warnings,
    notes: createNotes(),
    audit,
    usageRefreshMetrics: usageBatch.metrics,
    actions: {
      canBootstrap: !localStoreReady,
      canImportBundle: true,
      canExportBundle: localStoreReady,
      canRebuildRuntime: localStoreReady,
      canAbsorbRuntime: localStoreReady && context.runtimeAuthStoreExists,
      canAbsorbHermes: localStoreReady && context.hermesAuthExists,
    },
  };
}

export async function loadTokenExpirySnapshot(options = {}) {
  const context = resolvePaths(options);
  if (!context.localAuthStoreExists) {
    return {
      generatedAt: Date.now(),
      localStore: {
        exists: false,
        path: context.localAuthStorePath,
      },
      profiles: [],
    };
  }

  const store = readLocalAuthStore(context);
  const profiles = listCodexProfiles(store)
    .filter((entry) => entry.credential?.type === "oauth")
    .map((entry) => ({
      profileId: entry.profileId,
      displayLabel: resolveEmail(entry.credential) || entry.profileId,
      email: resolveEmail(entry.credential),
      expiresAt: resolveExpiresAt(entry.credential),
    }))
    .filter((entry) => typeof entry.expiresAt === "number" && Number.isFinite(entry.expiresAt))
    .toSorted((left, right) => left.expiresAt - right.expiresAt);

  return {
    generatedAt: Date.now(),
    localStore: {
      exists: true,
      path: context.localAuthStorePath,
    },
    profiles,
  };
}

export async function applyOrder(options, order, deps = {}) {
  const context = resolvePaths(options);
  const updatedStore = await updateAuthStore(options, (store) => applyOrderToAuthStore(store, order));
  const preferredOrder = getStoredOrder(updatedStore);
  const preferredProfileId = preferredOrder[0] || null;
  let finalStore = updatedStore;
  let codexCredential = null;
  let applyResult = null;

  if (deps.syncCodexSelection) {
    applyResult = createApplyResult({
      codexSelectionAttempted: true,
      codexSelectionProfileId: preferredProfileId,
    });

    if (!preferredProfileId) {
      applyResult.codexSelectionSkippedReason = "没有可同步到 Codex 的推荐账号。";
    } else {
      const preferredCredential = updatedStore.profiles[preferredProfileId];
      if (!preferredCredential) {
        applyResult.codexSelectionSkippedReason = "推荐账号在本地号池中不存在。";
      } else if (!isCodexCompatibleCredential(preferredCredential)) {
        applyResult.codexSelectionSkippedReason = getCodexCompatibilityIssue(preferredCredential);
      } else {
        const codexRuntime = inspectCodexAuthFile(
          context,
          listCodexProfiles(updatedStore),
          preferredCredential,
        );

        if (codexRuntime.linkedProfileId === preferredProfileId && !codexRuntime.drift) {
          applyResult.codexSelectionSkippedReason = "Codex 当前账号已经是推荐第一名。";
        } else {
          try {
            const resolved = await resolveCredentialToken(preferredCredential, {
              proxyConfig: deps.proxyConfig,
              ...(deps.refreshImpl ? { refreshImpl: deps.refreshImpl } : {}),
            });
            if (resolved.updated) {
              finalStore = await updateAuthStore(options, (nextStore) => {
                const next = structuredClone(nextStore);
                next.profiles[preferredProfileId] = mergeRefreshedCredential(
                  next.profiles[preferredProfileId],
                  resolved.credential,
                );
                return next;
              });
              codexCredential = finalStore.profiles[preferredProfileId];
            } else {
              codexCredential = preferredCredential;
            }
            applyResult.codexSelectionUpdated = true;
            applyResult.codexSelectionSkippedReason = null;
          } catch (error) {
            applyResult.codexSelectionSkippedReason = toErrorMessage(error);
          }
        }
      }
    }
  }

  await exportRuntimeFromLocal(options, finalStore, {
    preferredProfileId,
    codexCredential,
  });
  const state = await loadDashboardState(options, deps);
  return applyResult ? { ...state, applyResult } : state;
}

export async function runTokenKeepalive(options, deps = {}) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  const configOrder = context.configExists ? getConfigCodexOrder(readOpenClawConfig(context.configPath)) : [];
  const attemptedAt = new Date().toISOString();
  const oauthProfileIds = [];
  const eligibleProfileIds = [];
  const failedProfiles = [];
  const changedProfileIds = [];
  const refreshedProfileIds = [];
  let exportedRuntime = false;

  const nextStore = buildLocalAuthStore(readLocalAuthStore(context));

  for (const entry of listCodexProfiles(nextStore)) {
    if (entry.credential?.type !== "oauth") {
      continue;
    }

    oauthProfileIds.push(entry.profileId);
    if (shouldRefreshOAuthCredential(entry.credential, TOKEN_KEEPALIVE_REFRESH_WINDOW_MS)) {
      eligibleProfileIds.push(entry.profileId);
    }

    try {
      const resolved = deps.refreshImpl
        ? await resolveCredentialToken(entry.credential, {
          proxyConfig: deps.proxyConfig,
          refreshImpl: deps.refreshImpl,
          refreshWindowMs: TOKEN_KEEPALIVE_REFRESH_WINDOW_MS,
        })
        : await resolveCredentialToken(entry.credential, {
          proxyConfig: deps.proxyConfig,
          refreshWindowMs: TOKEN_KEEPALIVE_REFRESH_WINDOW_MS,
        });

      if (resolved.updated) {
        nextStore.profiles[entry.profileId] = mergeRefreshedCredential(nextStore.profiles[entry.profileId], resolved.credential);
        changedProfileIds.push(entry.profileId);
      }
      if (resolved.refreshed) {
        refreshedProfileIds.push(entry.profileId);
      }
    } catch (error) {
      failedProfiles.push({
        profileId: entry.profileId,
        error: toErrorMessage(error),
      });
    }
  }

  const maintenanceUpdate = {
    lastAttemptAt: attemptedAt,
    lastError: summarizeFailedProfiles(failedProfiles),
    lastChangedProfileIds: changedProfileIds,
  };
  if (refreshedProfileIds.length > 0) {
    maintenanceUpdate.lastSuccessAt = attemptedAt;
  }

  const finalStore = applyMaintenanceUpdate(nextStore, maintenanceUpdate);

  fs.mkdirSync(path.dirname(context.localAuthStorePath), { recursive: true });
  await withFileLock(context.localAuthStorePath, async () => {
    writeAuthStore(context.localAuthStorePath, finalStore);
  });

  if (changedProfileIds.length > 0) {
    const selectedProfileId = getSelectedProfileId(finalStore, configOrder);
    const selectedCredential = selectedProfileId ? finalStore.profiles[selectedProfileId] : null;
    await exportRuntimeFromLocal(options, finalStore, {
      codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
    });
    exportedRuntime = true;
  }

  const skippedProfileIds = oauthProfileIds.filter((profileId) => !eligibleProfileIds.includes(profileId));

  return {
    attemptedAt,
    oauthProfileCount: oauthProfileIds.length,
    eligibleProfileCount: eligibleProfileIds.length,
    skippedProfileCount: skippedProfileIds.length,
    refreshedCount: refreshedProfileIds.length,
    changedProfileIds,
    refreshedProfileIds,
    skippedProfileIds,
    failedProfiles,
    exportedRuntime,
    state: await loadDashboardState(options, deps),
  };
}

export async function switchProfile(options, profileId, deps = {}) {
  const context = resolvePaths(options);
  const store = readLocalAuthStore(context);
  const configOrder = context.configExists ? getConfigCodexOrder(readOpenClawConfig(context.configPath)) : [];
  const currentOrder = computeEffectiveOrder(store, configOrder);
  const credential = store.profiles[profileId];

  if (!credential) {
    throw new Error(`Profile "${profileId}" was not found in the local store.`);
  }

  let exportCredential = credential;
  if (credential?.type === "oauth") {
    const resolved = deps.refreshImpl
      ? await resolveCredentialToken(credential, {
        proxyConfig: deps.proxyConfig,
        refreshImpl: deps.refreshImpl,
      })
      : await resolveCredentialToken(credential, {
        proxyConfig: deps.proxyConfig,
      });
    if (resolved.updated) {
      exportCredential = resolved.credential;
      await updateAuthStore(options, (nextStore) => {
        const next = structuredClone(nextStore);
        next.profiles[profileId] = mergeRefreshedCredential(next.profiles[profileId], resolved.credential);
        return next;
      });
    }
  }

  const order = [profileId, ...currentOrder.filter((entry) => entry !== profileId)];
  const nextStore = await updateAuthStore(options, (nextStore) => applyOrderToAuthStore(nextStore, order));
  await exportRuntimeFromLocal(options, nextStore, {
    preferredProfileId: profileId,
    codexCredential: isCodexCompatibleCredential(exportCredential) ? exportCredential : null,
  });
  return await loadDashboardState(options, deps);
}

export async function switchCodexProfile(options, profileId, deps = {}) {
  const context = resolvePaths(options);
  const store = readLocalAuthStore(context);
  const credential = store.profiles[profileId];

  if (!credential) {
    throw new Error(`Profile "${profileId}" was not found in the local store.`);
  }
  if (!isCodexCompatibleCredential(credential)) {
    throw new Error(`Profile "${profileId}" is not Codex-compatible yet: ${getCodexCompatibilityIssue(credential)}.`);
  }

  let exportCredential = credential;
  let nextStore = store;
  const resolved = deps.refreshImpl
    ? await resolveCredentialToken(credential, {
      proxyConfig: deps.proxyConfig,
      refreshImpl: deps.refreshImpl,
    })
    : await resolveCredentialToken(credential, {
      proxyConfig: deps.proxyConfig,
    });

  if (resolved.updated) {
    exportCredential = resolved.credential;
    nextStore = await updateAuthStore(options, (currentStore) => {
      const next = structuredClone(currentStore);
      next.profiles[profileId] = mergeRefreshedCredential(next.profiles[profileId], resolved.credential);
      return next;
    });
  }

  await writeCodexSelection(options, exportCredential);
  return await loadDashboardState(options, deps);
}

export async function syncConfig(options, deps = {}) {
  const context = resolvePaths(options);
  const store = readLocalAuthStore(context);
  await syncRuntimeConfig(options, store);
  return await loadDashboardState(options, deps);
}

export async function renameProfile(options, profileId, nextProfileId, deps = {}) {
  const nextStore = await updateAuthStore(options, (store) => renameProfileInAuthStore(store, profileId, nextProfileId));
  const selectedProfileId = getSelectedProfileId(nextStore);
  const selectedCredential = selectedProfileId ? nextStore.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, nextStore, {
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });
  return await loadDashboardState(options, deps);
}

export async function deleteProfile(options, profileId, deps = {}) {
  const nextStore = await updateAuthStore(options, (store) => deleteProfileFromAuthStore(store, profileId));
  const selectedProfileId = getSelectedProfileId(nextStore);
  const selectedCredential = selectedProfileId ? nextStore.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, nextStore, {
    preferredProfileId: selectedProfileId,
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });
  return await loadDashboardState(options, deps);
}

export async function linkCurrentCodexToProfile(options, profileId, deps = {}) {
  const context = resolvePaths(options);
  const codexAuth = readCodexAuthFile(context.codexAuthPath);
  if (!codexAuth) {
    throw new Error("Current ~/.codex/auth.json is missing or unreadable.");
  }

  await updateAuthStore(options, (store) => {
    const existing = store.profiles[profileId];
    if (!existing) {
      throw new Error(`Profile "${profileId}" was not found in the local store.`);
    }
    if (!codexAuthExactlyMatchesCredential(codexAuth, existing)) {
      throw new Error("Current ~/.codex/auth.json does not exactly match this stored profile.");
    }

    const next = structuredClone(store);
    next.profiles[profileId] = mergeCodexAuthIntoCredential(existing, codexAuth);
    return next;
  });

  return await loadDashboardState(options, deps);
}

export async function bootstrapLocalStore(options, deps = {}) {
  const context = resolvePaths(options);
  if (context.localAuthStoreExists) {
    throw new Error("Local auth store is already initialized.");
  }

  let nextStore = context.runtimeAuthStoreExists
    ? buildLocalAuthStore(readRuntimeAuthStore(context))
    : buildLocalAuthStore({});

  if (context.hermesAuthExists) {
    nextStore = mergeHermesSidecarIntoStore(nextStore, readHermesAuthFile(context.hermesAuthPath), {
      selectedProfileId: null,
    });
  }

  if (context.codexAuthExists) {
    nextStore = mergeCodexSidecarIntoStore(nextStore, readCodexAuthFile(context.codexAuthPath));
  }

  fs.mkdirSync(path.dirname(context.localAuthStorePath), { recursive: true });
  await withFileLock(context.localAuthStorePath, async () => {
    writeAuthStore(context.localAuthStorePath, nextStore);
  });

  return await loadDashboardState(options, deps);
}

export async function rebuildRuntime(options, deps = {}) {
  const context = resolvePaths(options);
  const store = readLocalAuthStore(context);
  const selectedProfileId = getSelectedProfileId(store);
  const selectedCredential = selectedProfileId ? store.profiles[selectedProfileId] : null;

  await exportRuntimeFromLocal(options, store, {
    preferredProfileId: selectedProfileId,
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });

  return await loadDashboardState(options, deps);
}

export async function absorbOpenClawRuntime(options, deps = {}) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  if (!context.runtimeAuthStoreExists) {
    throw new Error("OpenClaw runtime auth-profiles.json does not exist.");
  }

  const runtimeStore = readRuntimeAuthStore(context);
  await updateAuthStore(options, (store) => {
    const next = buildLocalAuthStore(store);

    for (const [profileId, runtimeCredential] of Object.entries(runtimeStore.profiles)) {
      next.profiles[profileId] = next.profiles[profileId]
        ? mergeRefreshedCredential(next.profiles[profileId], runtimeCredential)
        : runtimeCredential;
    }

    next.order = runtimeStore.order;
    next.lastGood = runtimeStore.lastGood;
    next.usageStats = runtimeStore.usageStats;
    return next;
  });

  return await loadDashboardState(options, deps);
}

export async function absorbHermesRuntime(options, deps = {}) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  if (!context.hermesAuthExists) {
    throw new Error("Hermes auth.json does not exist.");
  }

  const hermesRuntime = readHermesAuthFile(context.hermesAuthPath);
  await updateAuthStore(options, (store) => mergeHermesSidecarIntoStore(store, hermesRuntime, {
    selectedProfileId: null,
  }));

  return await loadDashboardState(options, deps);
}

export async function exportBundle(options, request = {}, deps = {}) {
  const context = resolvePaths(options);
  const store = readLocalAuthStore(context);
  const bundle = createEncryptedExportBundle(store, request.passphrase);
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  return {
    fileName: `codex-auth-bundle-${timestamp}.json`,
    bundle,
    state: await loadDashboardState(options, deps),
  };
}

export async function previewImportBundle(options, request = {}, deps = {}) {
  const context = resolvePaths(options);
  const imported = readEncryptedExportBundle(request.bundle, request.passphrase);
  const localStore = context.localAuthStoreExists ? readLocalAuthStore(context) : buildLocalAuthStore({});
  const preview = previewBundleImport(localStore, imported.store);

  return {
    preview: {
      createdAt: imported.createdAt,
      summary: preview.summary,
      actions: preview.actions,
    },
    state: await loadDashboardState(options, deps),
  };
}

export async function commitImportBundle(options, request = {}, deps = {}) {
  const context = resolvePaths(options);
  const imported = readEncryptedExportBundle(request.bundle, request.passphrase);
  const localStore = context.localAuthStoreExists ? readLocalAuthStore(context) : buildLocalAuthStore({});
  const preview = previewBundleImport(localStore, imported.store);

  fs.mkdirSync(path.dirname(context.localAuthStorePath), { recursive: true });
  await withFileLock(context.localAuthStorePath, async () => {
    writeAuthStore(context.localAuthStorePath, preview.store);
  });

  const selectedProfileId = getSelectedProfileId(preview.store);
  const selectedCredential = selectedProfileId ? preview.store.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, preview.store, {
    preferredProfileId: selectedProfileId,
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });

  return await loadDashboardState(options, deps);
}

export async function saveLoggedInProfile(options, profileId, credentials, saveOptions = {}) {
  const intent = saveOptions.intent === "upgrade" ? "upgrade" : "create";
  const nextCredential = buildStoredCodexCredential(credentials);

  const nextStore = await updateAuthStore(options, (store) => {
    const existing = store.profiles[profileId];
    if (intent === "create") {
      if (existing) {
        throw new Error(`Profile "${profileId}" already exists.`);
      }
      return upsertProfileCredential(store, profileId, nextCredential);
    }

    if (!existing) {
      throw new Error(`Profile "${profileId}" was not found in auth-profiles.json.`);
    }

    assertMatchingProfileIdentity(profileId, existing, nextCredential);
    const next = structuredClone(store);
    next.profiles[profileId] = mergeRefreshedCredential(existing, nextCredential);
    return next;
  });

  const selectedProfileId = getSelectedProfileId(nextStore);
  const selectedCredential = selectedProfileId ? nextStore.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, nextStore, {
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });
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
      intent: task.intent,
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

  start(options, request) {
    const target = typeof request === "string"
      ? { profileId: request, intent: "create" }
      : {
        profileId: typeof request?.profileId === "string" ? request.profileId.trim() : "",
        intent: request?.intent === "upgrade" ? "upgrade" : "create",
      };

    if (!target.profileId.startsWith(`${CODEX_PROVIDER}:`)) {
      throw new Error(`Profile id must start with "${CODEX_PROVIDER}:".`);
    }

    const task = {
      id: randomUUID(),
      profileId: target.profileId,
      intent: target.intent,
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
      task.manualHint = task.intent === "upgrade"
        ? "Authorization code accepted. Updating the profile."
        : "Authorization code accepted. Saving the new profile.";
      task.updatedAt = Date.now();
      await this.saveProfile(options, task.profileId, credentials, { intent: task.intent });
      task.status = "completed";
      task.manualHint = task.intent === "upgrade" ? "Profile upgrade completed." : "OAuth login completed.";
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
