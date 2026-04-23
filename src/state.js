import { randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import {
  CODEX_PROVIDER,
  MIN_TOKEN_REFRESH_INTERVAL_SECONDS,
  PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT,
  TOKEN_KEEPALIVE_MANUAL_COOLDOWN_MS,
  TOKEN_KEEPALIVE_MANUAL_WINDOW_MS,
  TOKEN_KEEPALIVE_SCHEDULED_BUFFER_MS,
  TOKEN_REFRESH_EXPIRY_GRACE_MS,
} from "./constants.js";
import {
  applyOrderToAuthStore,
  buildLocalAuthStore,
  buildRuntimeAuthStore,
  computeEffectiveOrder,
  deleteProfilesFromAuthStore,
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
import {
  clearAutoAuthProfileOverrides,
  readSessionStore,
  summarizeAutoAuthProfileOverrides,
  writeSessionStore,
} from "./session-store.js";
import { loadUsageRefreshBatch } from "./usage-refresh.js";
import { dedupeStrings, isRecord, toErrorMessage } from "./utils.js";
import {
  bootstrapCloudFromLocal,
  checkCloudHealth,
  deleteCloudProfiles,
  isCloudMode,
  loadCloudContext,
  pullCloudStore,
  pushProfileCloudUpdate,
  pushMetaCloudUpdate,
  syncLocalStoreToCloud,
  withRefreshLease,
} from "./cloud-gate.js";
import { loadDashboardConfig, saveDashboardConfig, summarizeDashboardConfigForClient } from "./dashboard-config.js";

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

function decodeJwtPayload(token) {
  if (typeof token !== "string" || !token.trim()) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const normalized = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getJwtOpenAIAuthClaims(token) {
  const payload = decodeJwtPayload(token);
  const authClaims = payload?.["https://api.openai.com/auth"];
  return isRecord(authClaims) ? authClaims : null;
}

function resolveCodexUserId(credential) {
  const accessClaims = getJwtOpenAIAuthClaims(credential?.access);
  if (typeof accessClaims?.chatgpt_user_id === "string" && accessClaims.chatgpt_user_id.trim()) {
    return accessClaims.chatgpt_user_id.trim();
  }

  const idTokenClaims = getJwtOpenAIAuthClaims(credential?.codexAuth?.idToken);
  if (typeof idTokenClaims?.chatgpt_user_id === "string" && idTokenClaims.chatgpt_user_id.trim()) {
    return idTokenClaims.chatgpt_user_id.trim();
  }

  return null;
}

function involvesCodexProvider(left, right) {
  return left?.provider === CODEX_PROVIDER || right?.provider === CODEX_PROVIDER;
}

function resolveCredentialIdentityKey(credential) {
  if (!isRecord(credential)) {
    return null;
  }

  if (credential.provider === CODEX_PROVIDER) {
    const codexUserId = resolveCodexUserId(credential);
    if (codexUserId) {
      return `codex-user:${codexUserId}`;
    }

    const email = normalizeEmail(resolveEmail(credential));
    if (email) {
      return `email:${email}`;
    }
  }

  const refresh = typeof credential.refresh === "string" && credential.refresh.trim()
    ? credential.refresh.trim()
    : null;
  if (refresh) {
    return `refresh:${refresh}`;
  }

  if (!involvesCodexProvider(credential, credential)) {
    const accountId = resolveAccountId(credential);
    if (accountId) {
      return `account:${accountId}`;
    }
  }

  const email = normalizeEmail(resolveEmail(credential));
  return email ? `email:${email}` : null;
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

  const leftCodexUserId = resolveCodexUserId(left);
  const rightCodexUserId = resolveCodexUserId(right);
  if (leftCodexUserId && rightCodexUserId) {
    return leftCodexUserId === rightCodexUserId;
  }

  const leftEmail = normalizeEmail(resolveEmail(left));
  const rightEmail = normalizeEmail(resolveEmail(right));
  if (leftEmail && rightEmail) {
    return leftEmail === rightEmail;
  }

  if (involvesCodexProvider(left, right)) {
    return false;
  }

  const leftAccountId = resolveAccountId(left);
  const rightAccountId = resolveAccountId(right);
  if (leftAccountId && rightAccountId) {
    return leftAccountId === rightAccountId;
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
    lastRefreshByProfileId: {},
  };
}

function buildMaintenanceSummary(store) {
  return {
    ...createEmptyMaintenance(),
    ...(isRecord(store?.maintenance) ? store.maintenance : {}),
    lastChangedProfileIds: Array.isArray(store?.maintenance?.lastChangedProfileIds)
      ? store.maintenance.lastChangedProfileIds.filter((entry) => typeof entry === "string" && entry.trim())
      : [],
    lastRefreshByProfileId: isRecord(store?.maintenance?.lastRefreshByProfileId)
      ? Object.fromEntries(
        Object.entries(store.maintenance.lastRefreshByProfileId)
          .filter(([profileId, timestamp]) => typeof profileId === "string" && profileId.trim() && typeof timestamp === "string" && timestamp.trim()),
      )
      : {},
  };
}

function normalizeKeepaliveTrigger(value) {
  return value === "scheduled" ? "scheduled" : "manual";
}

function normalizeTokenRefreshIntervalSeconds(value) {
  const intervalSeconds = Math.floor(Number(value) || 0);
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return 0;
  }
  return Math.max(MIN_TOKEN_REFRESH_INTERVAL_SECONDS, intervalSeconds);
}

function getKeepaliveScheduledIntervalSeconds(trigger, value) {
  if (normalizeKeepaliveTrigger(trigger) !== "scheduled") {
    return 0;
  }
  return normalizeTokenRefreshIntervalSeconds(value) || MIN_TOKEN_REFRESH_INTERVAL_SECONDS;
}

function getKeepaliveCooldownExpiryMs(maintenance, profileId) {
  const lastRefresh = typeof maintenance?.lastRefreshByProfileId?.[profileId] === "string"
    ? Date.parse(maintenance.lastRefreshByProfileId[profileId])
    : Number.NaN;
  if (!Number.isFinite(lastRefresh)) {
    return null;
  }
  return lastRefresh + TOKEN_KEEPALIVE_MANUAL_COOLDOWN_MS;
}

function evaluateKeepaliveEligibility(profileId, credential, maintenance, trigger, intervalSeconds, nowMs) {
  const expiresAt = resolveExpiresAt(credential);
  const urgent = typeof expiresAt === "number" && expiresAt <= nowMs + TOKEN_REFRESH_EXPIRY_GRACE_MS;

  if (!Number.isFinite(expiresAt)) {
    return { shouldRefresh: true, reason: "missing-expiry" };
  }

  if (normalizeKeepaliveTrigger(trigger) === "scheduled") {
    const scheduledWindowMs = getKeepaliveScheduledIntervalSeconds("scheduled", intervalSeconds) * 1_000
      + TOKEN_KEEPALIVE_SCHEDULED_BUFFER_MS;
    return expiresAt <= nowMs + scheduledWindowMs
      ? { shouldRefresh: true, reason: urgent ? "urgent" : "scheduled-window" }
      : { shouldRefresh: false, reason: "too-early" };
  }

  if (!urgent && expiresAt > nowMs + TOKEN_KEEPALIVE_MANUAL_WINDOW_MS) {
    return { shouldRefresh: false, reason: "too-early" };
  }

  const cooldownExpiresAt = getKeepaliveCooldownExpiryMs(maintenance, profileId);
  if (!urgent && typeof cooldownExpiresAt === "number" && cooldownExpiresAt > nowMs) {
    return { shouldRefresh: false, reason: "cooldown" };
  }

  return { shouldRefresh: true, reason: urgent ? "urgent" : "manual-window" };
}

function compareProfilePriority(leftProfileId, rightProfileId, orderIndexById) {
  const leftOrderIndex = orderIndexById.get(leftProfileId) ?? Number.MAX_SAFE_INTEGER;
  const rightOrderIndex = orderIndexById.get(rightProfileId) ?? Number.MAX_SAFE_INTEGER;
  if (leftOrderIndex !== rightOrderIndex) {
    return leftOrderIndex - rightOrderIndex;
  }
  return leftProfileId.localeCompare(rightProfileId);
}

function mergeDuplicateCredential(preferred, incoming) {
  const preferredExpiresAt = resolveExpiresAt(preferred) ?? 0;
  const incomingExpiresAt = resolveExpiresAt(incoming) ?? 0;
  const primary = incomingExpiresAt > preferredExpiresAt ? incoming : preferred;
  const secondary = primary === preferred ? incoming : preferred;
  return {
    ...secondary,
    ...primary,
    codexAuth: primary.codexAuth ?? secondary.codexAuth,
  };
}

function remapAuthStoreReferences(store, idMap) {
  const next = buildLocalAuthStore(store);

  const remapProfileId = (profileId) => idMap.get(profileId) || profileId;

  const currentOrder = getStoredOrder(next);
  if (currentOrder.length > 0) {
    next.order = next.order ?? {};
    next.order[CODEX_PROVIDER] = dedupeStrings(
      currentOrder
        .map((profileId) => remapProfileId(profileId))
        .filter((profileId) => next.profiles[profileId]),
    );
  }

  if (next.lastGood?.[CODEX_PROVIDER]) {
    const remappedLastGood = remapProfileId(next.lastGood[CODEX_PROVIDER]);
    if (next.profiles[remappedLastGood]) {
      next.lastGood[CODEX_PROVIDER] = remappedLastGood;
    } else {
      delete next.lastGood[CODEX_PROVIDER];
      if (Object.keys(next.lastGood).length === 0) {
        next.lastGood = undefined;
      }
    }
  }

  if (isRecord(next.usageStats)) {
    const nextUsageStats = {};
    for (const [profileId, stats] of Object.entries(next.usageStats)) {
      const remappedProfileId = remapProfileId(profileId);
      if (!next.profiles[remappedProfileId]) {
        continue;
      }
      nextUsageStats[remappedProfileId] = stats;
    }
    next.usageStats = Object.keys(nextUsageStats).length > 0 ? nextUsageStats : undefined;
  }

  return next;
}

function collectDuplicateProfileGroups(store) {
  const groups = new Map();

  for (const entry of listCodexProfiles(store)) {
    const identityKey = resolveCredentialIdentityKey(entry.credential);
    if (!identityKey) {
      continue;
    }
    const current = groups.get(identityKey) ?? [];
    current.push(entry);
    groups.set(identityKey, current);
  }

  return [...groups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([identityKey, entries]) => ({
      identityKey,
      profileIds: entries.map((entry) => entry.profileId),
      entries,
    }));
}

function buildDuplicateProfileSummary(store) {
  const groups = collectDuplicateProfileGroups(store);
  const duplicateProfileCount = groups.reduce((sum, group) => sum + Math.max(0, group.profileIds.length - 1), 0);
  return {
    groupCount: groups.length,
    duplicateProfileCount,
    groups: groups.map((group) => ({
      identityKey: group.identityKey,
      profileIds: group.profileIds,
    })),
  };
}

function normalizeDuplicateProfiles(store) {
  const next = buildLocalAuthStore(store);
  const preferredOrder = getPreferredOrder(next);
  const orderIndexById = new Map(preferredOrder.map((profileId, index) => [profileId, index]));
  const duplicateGroups = collectDuplicateProfileGroups(next);

  if (duplicateGroups.length === 0) {
    return {
      store: next,
      actions: [],
      summary: buildDuplicateProfileSummary(next),
    };
  }

  const idMap = new Map();
  const actions = [];

  for (const group of duplicateGroups) {
    const sortedProfileIds = [...group.profileIds].sort((left, right) =>
      compareProfilePriority(left, right, orderIndexById),
    );
    const canonicalProfileId = sortedProfileIds[0];

    for (const duplicateProfileId of sortedProfileIds.slice(1)) {
      next.profiles[canonicalProfileId] = mergeDuplicateCredential(
        next.profiles[canonicalProfileId],
        next.profiles[duplicateProfileId],
      );
      delete next.profiles[duplicateProfileId];
      idMap.set(duplicateProfileId, canonicalProfileId);
      actions.push({
        type: "cleanup-duplicate",
        sourceProfileId: duplicateProfileId,
        targetProfileId: canonicalProfileId,
      });
    }
  }

  const remappedStore = remapAuthStoreReferences(next, idMap);
  return {
    store: remappedStore,
    actions,
    summary: buildDuplicateProfileSummary(remappedStore),
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
  const existing = buildMaintenanceSummary(next);
  const updated = {
    ...createEmptyMaintenance(),
    ...existing,
    ...(isRecord(maintenance) ? maintenance : {}),
    lastChangedProfileIds: Array.isArray(maintenance?.lastChangedProfileIds)
      ? dedupeStrings(maintenance.lastChangedProfileIds)
      : existing.lastChangedProfileIds,
    lastRefreshByProfileId: isRecord(maintenance?.lastRefreshByProfileId)
      ? {
        ...existing.lastRefreshByProfileId,
        ...maintenance.lastRefreshByProfileId,
      }
      : existing.lastRefreshByProfileId,
  };

  next.maintenance = updated.lastAttemptAt
    || updated.lastSuccessAt
    || updated.lastError
    || updated.lastChangedProfileIds.length > 0
    || Object.keys(updated.lastRefreshByProfileId).length > 0
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
    "Applying order updates the local store, every managed OpenClaw runtime auth-profiles.json slice, and the managed Hermes slice. ~/.codex/auth.json is only rewritten when the selected account is Codex-compatible.",
    "Runtime rebuild keeps conversation transcripts intact. It only clears auto-selected openai-codex session overrides so existing sessions can follow the refreshed order again.",
    "Setting a profile as current updates every OpenClaw runtime auth-profiles.json first, then Hermes if the account is OAuth-compatible, and finally Codex CLI if the account also carries a Codex id_token.",
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

function inspectSessionOverrideTargets(context) {
  const targets = context.sessionStoreTargetPaths.map((sessionStorePath, index) => {
    const agentId = context.sessionStoreTargetAgentIds[index] || `agent-${index + 1}`;
    const exists = fs.existsSync(sessionStorePath);
    if (!exists) {
      return {
        agentId,
        path: sessionStorePath,
        exists: false,
        error: null,
        autoOverrideCount: 0,
        mostRecentAutoOverride: null,
      };
    }

    try {
      const store = readSessionStore(sessionStorePath);
      const summary = summarizeAutoAuthProfileOverrides(store, {
        provider: CODEX_PROVIDER,
      });
      return {
        agentId,
        path: sessionStorePath,
        exists: true,
        error: null,
        autoOverrideCount: summary.autoOverrideCount,
        mostRecentAutoOverride: summary.mostRecentAutoOverride,
      };
    } catch (readError) {
      return {
        agentId,
        path: sessionStorePath,
        exists: true,
        error: toErrorMessage(readError),
        autoOverrideCount: 0,
        mostRecentAutoOverride: null,
      };
    }
  });

  const affectedTargets = targets.filter((target) => target.autoOverrideCount > 0);
  const mostRecentAutoOverride = affectedTargets
    .flatMap((target) =>
      target.mostRecentAutoOverride
        ? [{
          agentId: target.agentId,
          path: target.path,
          ...target.mostRecentAutoOverride,
        }]
        : []
    )
    .sort((left, right) => (right.updatedAt ?? -1) - (left.updatedAt ?? -1))[0] || null;

  return {
    targets,
    totalAutoOverrideCount: affectedTargets.reduce((total, target) => total + target.autoOverrideCount, 0),
    affectedAgentCount: affectedTargets.length,
    mostRecentAutoOverride,
  };
}

function buildSessionOverridesSummary(sessionOverrides) {
  return {
    totalAutoOverrideCount: sessionOverrides.totalAutoOverrideCount,
    affectedAgentCount: sessionOverrides.affectedAgentCount,
    mostRecentAutoOverride: sessionOverrides.mostRecentAutoOverride,
    targets: sessionOverrides.targets,
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

function buildDashboardWarnings(
  baseWarnings,
  context,
  codexRuntime,
  runtimeAuth,
  hermesRuntime,
  localStoreReady,
  sessionOverrides,
  duplicateSummary,
) {
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

  if (sessionOverrides) {
    for (const target of sessionOverrides.targets) {
      if (target.error) {
        warnings.push(`Failed to read OpenClaw session store for agent "${target.agentId}": ${target.error}`);
      }
    }

    if (sessionOverrides.totalAutoOverrideCount > 0) {
      warnings.push(
        `OpenClaw session auto auth profile overrides can ignore the configured order: ${sessionOverrides.totalAutoOverrideCount} auto openai-codex overrides across ${sessionOverrides.affectedAgentCount} agents.`,
      );
    }
  }

  if (duplicateSummary?.duplicateProfileCount > 0) {
    warnings.push(
      `Local store contains ${duplicateSummary.duplicateProfileCount} duplicate openai-codex profiles across ${duplicateSummary.groupCount} identity group(s). Run duplicate cleanup before importing more accounts.`,
    );
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

async function clearSessionOverrideTargets(options, preferredProfileId = null) {
  const context = resolvePaths(options);
  const targets = [];

  for (let index = 0; index < context.sessionStoreTargetPaths.length; index += 1) {
    const sessionStorePath = context.sessionStoreTargetPaths[index];
    const agentId = context.sessionStoreTargetAgentIds[index] || `agent-${index + 1}`;
    if (!fs.existsSync(sessionStorePath)) {
      targets.push({ agentId, path: sessionStorePath, exists: false, clearedCount: 0 });
      continue;
    }

    const result = await withFileLock(sessionStorePath, async () => {
      const store = readSessionStore(sessionStorePath);
      const next = clearAutoAuthProfileOverrides(store, {
        provider: CODEX_PROVIDER,
        preferredProfileId,
      });
      if (next.clearedCount > 0) {
        writeSessionStore(sessionStorePath, next.store);
      }
      return next;
    });

    targets.push({
      agentId,
      path: sessionStorePath,
      exists: true,
      clearedCount: result.clearedCount,
    });
  }

  return {
    targets,
    totalClearedCount: targets.reduce((total, target) => total + target.clearedCount, 0),
  };
}

async function touchRuntimeSelection(options, preferredProfileId) {
  await updateOpenClawConfig(options, (config) => touchOpenClawConfig(config));
  return await clearSessionOverrideTargets(options, preferredProfileId);
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
  for (const runtimeAuthTargetPath of context.runtimeAuthTargetPaths) {
    fs.mkdirSync(path.dirname(runtimeAuthTargetPath), { recursive: true });
    await withFileLock(runtimeAuthTargetPath, async () => {
      writeRuntimeAuthStore(runtimeAuthTargetPath, store);
    });
  }
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

  // Best-effort sync of the canonical local store to the cloud backend when
  // cloud mode is enabled. We intentionally upsert (NOT replace) so this
  // device cannot wipe out rows another device has written in the window
  // between the last pull and this local mutation. Deletes flow through
  // explicit deleteCloudProfiles calls in the delete paths instead.
  if (exportOptions.skipCloudSync !== true) {
    try {
      const result = await syncLocalStoreToCloud(options, store, { replace: false });
      if (!result.skipped && result.error) {
        lastCloudSyncError = {
          at: new Date().toISOString(),
          error: result.error,
        };
      } else if (!result.skipped) {
        mergeKnownCloudProfileIds(options, Object.keys(store.profiles || {}));
        lastCloudSyncError = null;
      }
    } catch (error) {
      lastCloudSyncError = {
        at: new Date().toISOString(),
        error: toErrorMessage(error),
      };
    }
  }
}

let lastCloudSyncError = null;

export function getLastCloudSyncError() {
  return lastCloudSyncError;
}

function mergeRefreshedCredential(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    codexAuth: incoming.codexAuth ?? existing.codexAuth,
  };
}

function hasAnyStoreData(store) {
  if (!store || !isRecord(store)) {
    return false;
  }
  return Object.keys(store.profiles || {}).length > 0
    || Object.keys(store.order || {}).length > 0
    || Object.keys(store.lastGood || {}).length > 0
    || Object.keys(store.usageStats || {}).length > 0
    || Object.keys(store.maintenance || {}).length > 0;
}

function getKnownCloudProfileIds(options) {
  return loadDashboardConfig(options).cloudKnownProfileIds ?? [];
}

function replaceKnownCloudProfileIds(options, profileIds) {
  saveDashboardConfig(options, {
    cloudKnownProfileIds: dedupeStrings(
      Array.isArray(profileIds) ? profileIds.filter((entry) => typeof entry === "string") : [],
    ),
  });
}

function mergeKnownCloudProfileIds(options, profileIds) {
  const known = getKnownCloudProfileIds(options);
  replaceKnownCloudProfileIds(options, [
    ...known,
    ...(Array.isArray(profileIds) ? profileIds : []),
  ]);
}

function forgetKnownCloudProfileIds(options, profileIds) {
  const removals = new Set(
    Array.isArray(profileIds)
      ? profileIds.filter((entry) => typeof entry === "string" && entry.trim())
      : [],
  );
  if (removals.size === 0) {
    return;
  }
  replaceKnownCloudProfileIds(
    options,
    getKnownCloudProfileIds(options).filter((profileId) => !removals.has(profileId)),
  );
}

function mergeDefinedRecord(primary, secondary) {
  const primaryRecord = isRecord(primary) ? primary : null;
  const secondaryRecord = isRecord(secondary) ? secondary : null;

  if (!primaryRecord && !secondaryRecord) {
    return primary ?? secondary;
  }

  const merged = {};
  const keys = new Set([
    ...Object.keys(secondaryRecord ?? {}),
    ...Object.keys(primaryRecord ?? {}),
  ]);

  for (const key of keys) {
    const primaryValue = primaryRecord?.[key];
    if (primaryValue !== undefined) {
      merged[key] = primaryValue;
      continue;
    }
    const secondaryValue = secondaryRecord?.[key];
    if (secondaryValue !== undefined) {
      merged[key] = secondaryValue;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeCredentialByPriority(primary, secondary) {
  const primaryCredential = isRecord(primary) ? primary : {};
  const secondaryCredential = isRecord(secondary) ? secondary : {};
  const merged = {};
  const keys = new Set([
    ...Object.keys(secondaryCredential),
    ...Object.keys(primaryCredential),
  ]);

  for (const key of keys) {
    if (key === "codexAuth" || key === "metadata") {
      const nested = mergeDefinedRecord(primaryCredential[key], secondaryCredential[key]);
      if (nested !== undefined) {
        merged[key] = nested;
      }
      continue;
    }

    const primaryValue = primaryCredential[key];
    if (primaryValue !== undefined) {
      merged[key] = primaryValue;
      continue;
    }

    const secondaryValue = secondaryCredential[key];
    if (secondaryValue !== undefined) {
      merged[key] = secondaryValue;
    }
  }

  return merged;
}

function mergeImportedCredential(existing, incoming) {
  const existingExpiresAt = resolveExpiresAt(existing);
  const incomingExpiresAt = resolveExpiresAt(incoming);
  const preferIncoming = existingExpiresAt !== null
    && incomingExpiresAt !== null
    && incomingExpiresAt > existingExpiresAt;

  return preferIncoming
    ? mergeCredentialByPriority(incoming, existing)
    : mergeCredentialByPriority(existing, incoming);
}

function assertMatchingProfileIdentity(profileId, existing, incoming) {
  const existingCodexUserId = resolveCodexUserId(existing);
  const incomingCodexUserId = resolveCodexUserId(incoming);
  if (existingCodexUserId && incomingCodexUserId && existingCodexUserId !== incomingCodexUserId) {
    throw new Error(`Logged-in account does not match profile "${profileId}".`);
  }

  if (!involvesCodexProvider(existing, incoming)) {
  const existingAccountId = resolveAccountId(existing);
  const incomingAccountId = resolveAccountId(incoming);
  if (existingAccountId && incomingAccountId && existingAccountId !== incomingAccountId) {
    throw new Error(`Logged-in account does not match profile "${profileId}".`);
  }
  }

  const existingEmail = normalizeEmail(resolveEmail(existing));
  const incomingEmail = normalizeEmail(resolveEmail(incoming));
  if (existingEmail && incomingEmail && existingEmail !== incomingEmail) {
    throw new Error(`Logged-in account does not match profile "${profileId}".`);
  }
}

function credentialHasSameIdentity(left, right) {
  if (exactRefreshMatch(left, right)) {
    return true;
  }

  const leftIdentityKey = resolveCredentialIdentityKey(left);
  const rightIdentityKey = resolveCredentialIdentityKey(right);
  if (leftIdentityKey && rightIdentityKey) {
    return leftIdentityKey === rightIdentityKey;
  }

  return false;
}

function exactRefreshMatch(left, right) {
  const leftRefresh = typeof left?.refresh === "string" ? left.refresh.trim() : "";
  const rightRefresh = typeof right?.refresh === "string" ? right.refresh.trim() : "";
  return Boolean(leftRefresh) && leftRefresh === rightRefresh;
}

function exactCodexUserMatch(left, right) {
  const leftUserId = resolveCodexUserId(left);
  const rightUserId = resolveCodexUserId(right);
  return Boolean(leftUserId) && Boolean(rightUserId) && leftUserId === rightUserId;
}

function exactEmailMatch(left, right) {
  const leftEmail = normalizeEmail(resolveEmail(left));
  const rightEmail = normalizeEmail(resolveEmail(right));
  return Boolean(leftEmail) && Boolean(rightEmail) && leftEmail === rightEmail;
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

  const userMatches = profiles
    .filter(([, credential]) => exactCodexUserMatch(credential, incomingCredential))
    .map(([profileId]) => profileId);
  if (userMatches.length === 1) {
    return userMatches[0];
  }

  const emailMatches = profiles
    .filter(([, credential]) => exactEmailMatch(credential, incomingCredential))
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
    "cleanup-duplicate": 0,
  });
}

function previewBundleImport(localStore, importedStore, options = {}) {
  const normalizedLocal = normalizeDuplicateProfiles(localStore);
  const next = buildLocalAuthStore(normalizedLocal.store);
  const existingIds = new Set(Object.keys(next.profiles));
  const idMap = new Map();
  const actions = [...normalizedLocal.actions];
  const importedOrder = getPreferredOrder(importedStore);
  const preferLaterImportedExpiry = options.preferLaterImportedExpiry !== false;

  for (const [incomingProfileId, incomingCredential] of Object.entries(importedStore.profiles)) {
    const targetProfileId = resolveImportTargetProfileId(next, incomingProfileId, incomingCredential);

    if (targetProfileId) {
      const existing = next.profiles[targetProfileId];
      const merged = preferLaterImportedExpiry
        ? mergeImportedCredential(existing, incomingCredential)
        : mergeRefreshedCredential(existing, incomingCredential);
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
  return previewBundleImport(localStore, nextImportedStore, {
    preferLaterImportedExpiry: false,
  }).store;
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
  const duplicateSummary = buildDuplicateProfileSummary(authStore);
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
  const sessionOverrides = inspectSessionOverrideTargets(context);
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
    sessionOverrides,
    duplicateSummary,
  );

  return {
    generatedAt: Date.now(),
    context,
    localStore: {
      exists: localStoreReady,
      path: context.localAuthStorePath,
    },
    maintenance: buildMaintenanceSummary(authStore),
    duplicateProfiles: duplicateSummary,
    runtimeAuth: buildOpenClawRuntimeSummary(context, runtimeAuth),
    sessionOverrides: buildSessionOverridesSummary(sessionOverrides),
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
      canCleanupDuplicates: localStoreReady && duplicateSummary.duplicateProfileCount > 0,
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
  await refreshLocalStoreFromCloud(options);
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

// In-flight keepalive runs keyed by the resolved local store path. Concurrent
// callers (manual click racing with scheduled timer, double-submitted clicks,
// etc.) share the same promise instead of each issuing their own refresh
// request for the same credential — otherwise the first request rotates the
// refresh_token on OpenAI's side and the second one fails with 401
// refresh_token_reused.
const activeKeepaliveByStorePath = new Map();

async function doRunTokenKeepalive(options, deps = {}) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  const configOrder = context.configExists ? getConfigCodexOrder(readOpenClawConfig(context.configPath)) : [];
  const attemptedAt = new Date().toISOString();
  const attemptedAtMs = Date.parse(attemptedAt);
  const trigger = normalizeKeepaliveTrigger(deps.trigger);
  const scheduledIntervalSeconds = getKeepaliveScheduledIntervalSeconds(trigger, deps.intervalSeconds);
  const failedProfiles = [];
  const changedProfileIds = [];
  const leaseSkippedProfiles = [];
  let checkedCount = 0;
  let skippedTooEarlyCount = 0;
  let skippedCooldownCount = 0;
  let skippedLeaseCount = 0;
  let exportedRuntime = false;

  // In cloud mode, pull the latest D1 snapshot first so the local store picks
  // up any credentials that another device rotated since we last wrote. We
  // prefer whichever side has the later `expires` per profile.
  const cloudContext = await loadCloudContext(options);
  const cloudEnabled = Boolean(cloudContext.client);
  let cloudPrePullError = null;
  if (cloudEnabled) {
    try {
      const remote = await pullCloudStore(options);
      await updateAuthStore(options, (localStore) => mergeRemoteIntoLocal(localStore, remote));
    } catch (error) {
      cloudPrePullError = toErrorMessage(error);
    }
  }

  const nextStore = buildLocalAuthStore(readLocalAuthStore(context));
  const maintenance = buildMaintenanceSummary(nextStore);
  const lastRefreshByProfileId = { ...maintenance.lastRefreshByProfileId };

  for (const entry of listCodexProfiles(nextStore)) {
    if (entry.credential?.type !== "oauth") {
      continue;
    }
    checkedCount += 1;

    const eligibility = evaluateKeepaliveEligibility(
      entry.profileId,
      entry.credential,
      maintenance,
      trigger,
      scheduledIntervalSeconds,
      attemptedAtMs,
    );
    if (!eligibility.shouldRefresh) {
      if (eligibility.reason === "cooldown") {
        skippedCooldownCount += 1;
      } else {
        skippedTooEarlyCount += 1;
      }
      continue;
    }

    const performRefresh = async () => {
      return deps.refreshImpl
        ? await resolveCredentialToken(entry.credential, {
          proxyConfig: deps.proxyConfig,
          forceRefresh: true,
          refreshImpl: deps.refreshImpl,
        })
        : await resolveCredentialToken(entry.credential, {
          proxyConfig: deps.proxyConfig,
          forceRefresh: true,
        });
    };

    try {
      const leaseOutcome = await withRefreshLease(options, entry.profileId, performRefresh, { ttlMs: 30_000 });
      if (!leaseOutcome.ran) {
        skippedLeaseCount += 1;
        leaseSkippedProfiles.push(entry.profileId);
        continue;
      }
      const resolved = leaseOutcome.result;
      if (resolved.updated) {
        nextStore.profiles[entry.profileId] = mergeRefreshedCredential(nextStore.profiles[entry.profileId], resolved.credential);
        changedProfileIds.push(entry.profileId);
        lastRefreshByProfileId[entry.profileId] = attemptedAt;

        // Push the single refreshed profile upstream immediately so sibling
        // devices see the new refresh_token without waiting for the trailing
        // full-store sync at the end of this run.
        if (cloudEnabled) {
          await pushProfileCloudUpdate(options, entry.profileId, nextStore.profiles[entry.profileId]);
        }
      }
    } catch (error) {
      failedProfiles.push({
        profileId: entry.profileId,
        error: toErrorMessage(error),
      });
    }
  }

  const finalStore = applyMaintenanceUpdate(nextStore, {
    lastAttemptAt: attemptedAt,
    lastSuccessAt: attemptedAt,
    lastError: summarizeFailedProfiles(failedProfiles),
    lastChangedProfileIds: changedProfileIds,
    lastRefreshByProfileId,
  });

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
  } else if (cloudEnabled) {
    // Maintenance meta moved even though no credentials changed; make sure
    // the other devices see the updated lastAttemptAt / lastError.
    await pushMetaCloudUpdate(options, "maintenance", finalStore.maintenance ?? null);
  }

  return {
    attemptedAt,
    trigger,
    intervalSeconds: scheduledIntervalSeconds,
    checkedCount,
    refreshedCount: changedProfileIds.length,
    skippedTooEarlyCount,
    skippedCooldownCount,
    skippedLeaseCount,
    failedCount: failedProfiles.length,
    changedProfileIds,
    failedProfiles,
    leaseSkippedProfiles,
    exportedRuntime,
    storeMode: cloudContext.config.storeMode,
    cloudPrePullError,
    state: await loadDashboardState(options, deps),
  };
}

function mergeProfileByFreshestExpiry(localCredential, remoteCredential) {
  if (!localCredential) {
    return remoteCredential;
  }
  if (!remoteCredential) {
    return localCredential;
  }
  const localExpires = resolveExpiresAt(localCredential) ?? 0;
  const remoteExpires = resolveExpiresAt(remoteCredential) ?? 0;
  return remoteExpires > localExpires
    ? mergeRefreshedCredential(localCredential, remoteCredential)
    : localCredential;
}

function mergeRemoteIntoLocal(localStore, remote) {
  const merged = buildLocalAuthStore(localStore);
  if (!remote) {
    return merged;
  }

  const remoteProfiles = isRecord(remote.profiles) ? remote.profiles : {};
  for (const [profileId, remoteCredential] of Object.entries(remoteProfiles)) {
    merged.profiles[profileId] = mergeProfileByFreshestExpiry(
      merged.profiles[profileId],
      remoteCredential,
    );
  }

  if (isRecord(remote.order)) {
    merged.order = remote.order;
  }
  if (isRecord(remote.lastGood)) {
    merged.lastGood = remote.lastGood;
  }
  if (isRecord(remote.usageStats)) {
    merged.usageStats = remote.usageStats;
  }
  if (isRecord(remote.maintenance)) {
    merged.maintenance = remote.maintenance;
  }

  return merged;
}

function buildMergedOrderWithLocalPriority(localStore, remoteStore, profiles) {
  const existingIds = new Set(Object.keys(profiles || {}));
  const localOrder = Array.isArray(localStore?.order?.[CODEX_PROVIDER])
    ? localStore.order[CODEX_PROVIDER]
    : [];
  const remoteOrder = Array.isArray(remoteStore?.order?.[CODEX_PROVIDER])
    ? remoteStore.order[CODEX_PROVIDER]
    : [];
  const mergedOrder = dedupeStrings([
    ...localOrder,
    ...remoteOrder,
    ...Object.keys(profiles || {}),
  ]).filter((profileId) => existingIds.has(profileId));

  return mergedOrder.length > 0
    ? {
      [CODEX_PROVIDER]: mergedOrder,
    }
    : undefined;
}

function mergeUsageStatsWithLocalPriority(localUsageStats, remoteUsageStats) {
  const merged = {
    ...(isRecord(remoteUsageStats) ? remoteUsageStats : {}),
    ...(isRecord(localUsageStats) ? localUsageStats : {}),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeMaintenanceWithLocalPriority(localMaintenance, remoteMaintenance) {
  const seed = buildLocalAuthStore({
    maintenance: isRecord(remoteMaintenance) ? remoteMaintenance : undefined,
  });
  return applyMaintenanceUpdate(seed, localMaintenance).maintenance;
}

function mergeRemoteIntoLocalPreservingLocalMeta(localStore, remote) {
  const merged = mergeRemoteIntoLocal(localStore, remote);

  merged.order = buildMergedOrderWithLocalPriority(localStore, remote, merged.profiles);

  const localLastGood = localStore?.lastGood?.[CODEX_PROVIDER];
  const remoteLastGood = remote?.lastGood?.[CODEX_PROVIDER];
  if (typeof localLastGood === "string" && merged.profiles[localLastGood]) {
    merged.lastGood = { [CODEX_PROVIDER]: localLastGood };
  } else if (typeof remoteLastGood === "string" && merged.profiles[remoteLastGood]) {
    merged.lastGood = { [CODEX_PROVIDER]: remoteLastGood };
  } else {
    merged.lastGood = undefined;
  }

  merged.usageStats = mergeUsageStatsWithLocalPriority(localStore?.usageStats, remote?.usageStats);
  merged.maintenance = mergeMaintenanceWithLocalPriority(localStore?.maintenance, remote?.maintenance);

  return merged;
}

function buildCloudCanonicalStore(localStore, remote, knownCloudProfileIds = []) {
  const local = buildLocalAuthStore(localStore);
  const remoteProfiles = isRecord(remote?.profiles) ? remote.profiles : {};
  const knownIds = new Set(
    Array.isArray(knownCloudProfileIds)
      ? knownCloudProfileIds.filter((entry) => typeof entry === "string" && entry.trim())
      : [],
  );
  const remoteHasData = hasAnyStoreData(remote);
  if (!remoteHasData && knownIds.size === 0) {
    return local;
  }

  const merged = buildLocalAuthStore(remoteHasData ? remote : {});
  for (const [profileId, localCredential] of Object.entries(local.profiles)) {
    if (remoteProfiles[profileId]) {
      merged.profiles[profileId] = mergeProfileByFreshestExpiry(
        localCredential,
        remoteProfiles[profileId],
      );
      continue;
    }
    if (!knownIds.has(profileId)) {
      merged.profiles[profileId] = localCredential;
    }
  }

  return merged;
}

async function refreshLocalStoreFromCloud(options, { mode = "canonical" } = {}) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  const cloudContext = await loadCloudContext(options);
  if (!cloudContext.client) {
    return readLocalAuthStore(context);
  }

  const remote = await pullCloudStore(options);
  const nextStore = await updateAuthStore(options, (localStore) => {
    if (mode === "preserve-local-meta") {
      return mergeRemoteIntoLocalPreservingLocalMeta(localStore, remote);
    }
    return buildCloudCanonicalStore(localStore, remote, getKnownCloudProfileIds(options));
  });
  replaceKnownCloudProfileIds(options, Object.keys(remote.profiles || {}));
  return nextStore;
}
export function runTokenKeepalive(options, deps = {}) {
  const context = resolvePaths(options);
  const key = context.localAuthStorePath;
  const existing = activeKeepaliveByStorePath.get(key);
  if (existing) {
    return existing;
  }

  const pending = (async () => {
    try {
      return await doRunTokenKeepalive(options, deps);
    } finally {
      activeKeepaliveByStorePath.delete(key);
    }
  })();
  activeKeepaliveByStorePath.set(key, pending);
  return pending;
}

export async function switchProfile(options, profileId, deps = {}) {
  const context = resolvePaths(options);
  const store = await refreshLocalStoreFromCloud(options);
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
  const store = await refreshLocalStoreFromCloud(options);
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
  await refreshLocalStoreFromCloud(options);
  const nextStore = await updateAuthStore(options, (store) => renameProfileInAuthStore(store, profileId, nextProfileId));
  const selectedProfileId = getSelectedProfileId(nextStore);
  const selectedCredential = selectedProfileId ? nextStore.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, nextStore, {
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });
  return await loadDashboardState(options, deps);
}

export async function deleteProfile(options, profileId, deps = {}) {
  return await deleteProfiles(options, [profileId], deps);
}

export async function deleteProfiles(options, profileIds, deps = {}) {
  await refreshLocalStoreFromCloud(options);
  const nextStore = await updateAuthStore(options, (store) => deleteProfilesFromAuthStore(store, profileIds));
  const selectedProfileId = getSelectedProfileId(nextStore);
  const selectedCredential = selectedProfileId ? nextStore.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, nextStore, {
    preferredProfileId: selectedProfileId,
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });
  // Propagate the removal to D1 as well; offline mode no-ops.
  const deleteResult = await deleteCloudProfiles(options, profileIds);
  if (!deleteResult.skipped && !deleteResult.error) {
    forgetKnownCloudProfileIds(options, profileIds);
  }
  return await loadDashboardState(options, deps);
}

export async function linkCurrentCodexToProfile(options, profileId, deps = {}) {
  const context = resolvePaths(options);
  const codexAuth = readCodexAuthFile(context.codexAuthPath);
  if (!codexAuth) {
    throw new Error("Current ~/.codex/auth.json is missing or unreadable.");
  }

  await refreshLocalStoreFromCloud(options);
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
  const store = await refreshLocalStoreFromCloud(options);
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

function collectCleanupRemovedProfileIds(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }
  const removed = new Set();
  for (const action of actions) {
    if (action?.type === "cleanup-duplicate" && typeof action.sourceProfileId === "string" && action.sourceProfileId.trim()) {
      removed.add(action.sourceProfileId.trim());
    }
  }
  return [...removed];
}

export async function commitImportBundle(options, request = {}, deps = {}) {
  const imported = readEncryptedExportBundle(request.bundle, request.passphrase);
  const context = resolvePaths(options);
  const localStore = context.localAuthStoreExists
    ? await refreshLocalStoreFromCloud(options)
    : buildLocalAuthStore({});
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

  // Import may have merged duplicates away locally; make sure D1 follows the
  // same removals so we don't resurrect them on the next pull.
  const removedByImport = collectCleanupRemovedProfileIds(preview.actions);
  if (removedByImport.length > 0) {
    const deleteResult = await deleteCloudProfiles(options, removedByImport);
    if (!deleteResult.skipped && !deleteResult.error) {
      forgetKnownCloudProfileIds(options, removedByImport);
    }
  }

  return await loadDashboardState(options, deps);
}

export async function cleanupDuplicateProfiles(options, deps = {}) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);

  const currentStore = await refreshLocalStoreFromCloud(options);
  const normalized = normalizeDuplicateProfiles(currentStore);

  if (normalized.actions.length === 0) {
    return {
      summary: normalized.summary,
      actions: normalized.actions,
      state: await loadDashboardState(options, deps),
    };
  }

  fs.mkdirSync(path.dirname(context.localAuthStorePath), { recursive: true });
  await withFileLock(context.localAuthStorePath, async () => {
    writeAuthStore(context.localAuthStorePath, normalized.store);
  });

  const selectedProfileId = getSelectedProfileId(normalized.store);
  const selectedCredential = selectedProfileId ? normalized.store.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, normalized.store, {
    preferredProfileId: selectedProfileId,
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
  });

  // Dedup removed the `sourceProfileId` side of each group; mirror those
  // removals to D1 so the cleanup isn't silently undone by the full-store
  // upsert or the next pull.
  const removedIds = collectCleanupRemovedProfileIds(normalized.actions);
  if (removedIds.length > 0) {
    const deleteResult = await deleteCloudProfiles(options, removedIds);
    if (!deleteResult.skipped && !deleteResult.error) {
      forgetKnownCloudProfileIds(options, removedIds);
    }
  }

  return {
    summary: normalized.summary,
    actions: normalized.actions,
    state: await loadDashboardState(options, deps),
  };
}

export function getStoreConfig(options) {
  const config = loadDashboardConfig(options);
  return {
    ...summarizeDashboardConfigForClient(config),
    lastCloudSyncError: getLastCloudSyncError(),
  };
}

export function updateStoreConfig(options, update = {}) {
  const nextConfig = saveDashboardConfig(options, update);
  return {
    ...summarizeDashboardConfigForClient(nextConfig),
    lastCloudSyncError: getLastCloudSyncError(),
  };
}

export async function bootstrapCloudStore(options) {
  const context = resolvePaths(options);
  ensureLocalStoreInitialized(context);
  const store = readLocalAuthStore(context);
  const result = await bootstrapCloudFromLocal(options, store);
  replaceKnownCloudProfileIds(options, Object.keys(store.profiles || {}));
  return {
    ...result,
    config: getStoreConfig(options),
  };
}

export async function pullCloudStoreIntoLocal(options) {
  const remote = await pullCloudStore(options);
  const nextStore = await updateAuthStore(options, (localStore) =>
    mergeRemoteIntoLocalPreservingLocalMeta(localStore, remote));
  replaceKnownCloudProfileIds(options, Object.keys(remote.profiles || {}));
  const selectedProfileId = getSelectedProfileId(nextStore);
  const selectedCredential = selectedProfileId ? nextStore.profiles[selectedProfileId] : null;
  await exportRuntimeFromLocal(options, nextStore, {
    preferredProfileId: selectedProfileId,
    codexCredential: isCodexCompatibleCredential(selectedCredential) ? selectedCredential : null,
    skipCloudSync: true,
  });
  return {
    pulledProfileCount: Object.keys(remote.profiles || {}).length,
    config: getStoreConfig(options),
  };
}

export async function cloudHealth(options) {
  return await checkCloudHealth(options);
}

export async function saveLoggedInProfile(options, profileId, credentials, saveOptions = {}) {
  const intent = saveOptions.intent === "upgrade" ? "upgrade" : "create";
  const nextCredential = buildStoredCodexCredential(credentials);

  await refreshLocalStoreFromCloud(options);
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
