import { readJsonFile, writeJsonFileAtomic } from "./json-files.js";
import { isRecord } from "./utils.js";

const DEFAULT_AUTH_MODE = "chatgpt";

function readTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLastRefresh(value) {
  const normalized = readTrimmedString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeCodexTokens(value) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    idToken: readTrimmedString(value.id_token),
    accessToken: readTrimmedString(value.access_token),
    refreshToken: readTrimmedString(value.refresh_token),
    accountId: readTrimmedString(value.account_id),
  };
}

export function normalizeCodexAuthMetadata(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  const authMode = readTrimmedString(value.authMode) || DEFAULT_AUTH_MODE;
  const idToken = readTrimmedString(value.idToken);
  const lastRefresh = normalizeLastRefresh(value.lastRefresh);

  if (!idToken) {
    return undefined;
  }

  return {
    authMode,
    idToken,
    lastRefresh: lastRefresh || new Date().toISOString(),
  };
}

export function readCodexAuthFile(filePath) {
  const raw = readJsonFile(filePath, null);
  if (!isRecord(raw)) {
    return null;
  }

  const tokens = normalizeCodexTokens(raw.tokens);
  const authMode = readTrimmedString(raw.auth_mode) || DEFAULT_AUTH_MODE;
  const lastRefresh = normalizeLastRefresh(raw.last_refresh);

  if (!tokens?.accessToken || !tokens.refreshToken) {
    return null;
  }

  return {
    authMode,
    lastRefresh,
    openAiApiKey: raw.OPENAI_API_KEY ?? null,
    tokens,
  };
}

export function getCodexCompatibilityIssue(credential) {
  if (!isRecord(credential)) {
    return "账号数据无效";
  }
  if (credential.provider !== "openai-codex") {
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
  if (!readTrimmedString(credential.accountId)) {
    return "缺少 accountId";
  }
  if (!readTrimmedString(credential.codexAuth?.idToken)) {
    return "缺少 Codex id_token";
  }
  return null;
}

export function isCodexCompatibleCredential(credential) {
  return !getCodexCompatibilityIssue(credential);
}

export function buildCodexAuthFile(credential, options = {}) {
  const issue = getCodexCompatibilityIssue(credential);
  if (issue) {
    throw new Error(`Profile cannot be exported to Codex auth.json: ${issue}.`);
  }

  const authMode = readTrimmedString(options.authMode)
    || readTrimmedString(credential.codexAuth?.authMode)
    || DEFAULT_AUTH_MODE;
  const lastRefresh = normalizeLastRefresh(options.lastRefresh)
    || normalizeLastRefresh(credential.codexAuth?.lastRefresh)
    || new Date().toISOString();

  return {
    auth_mode: authMode,
    OPENAI_API_KEY: null,
    tokens: {
      id_token: credential.codexAuth.idToken,
      access_token: credential.access,
      refresh_token: credential.refresh,
      account_id: credential.accountId,
    },
    last_refresh: lastRefresh,
  };
}

export function writeCodexAuthFile(filePath, credential, options = {}) {
  writeJsonFileAtomic(filePath, buildCodexAuthFile(credential, options));
}

function accountIdsMatch(left, right) {
  if (!left || !right) {
    return true;
  }
  return left === right;
}

export function codexAuthExactlyMatchesCredential(codexAuth, credential) {
  if (!codexAuth || !isRecord(credential)) {
    return false;
  }

  const storedAccess = readTrimmedString(credential.access);
  const storedRefresh = readTrimmedString(credential.refresh);
  const storedAccountId = readTrimmedString(credential.accountId);
  const authAccess = readTrimmedString(codexAuth.tokens?.accessToken);
  const authRefresh = readTrimmedString(codexAuth.tokens?.refreshToken);
  const authAccountId = readTrimmedString(codexAuth.tokens?.accountId);

  if (storedRefresh && authRefresh && storedRefresh === authRefresh && accountIdsMatch(storedAccountId, authAccountId)) {
    return true;
  }

  if (storedAccess && authAccess && storedAccess === authAccess && accountIdsMatch(storedAccountId, authAccountId)) {
    return true;
  }

  return false;
}

export function mergeCodexAuthIntoCredential(credential, codexAuth) {
  if (!isRecord(credential) || !codexAuth) {
    return credential;
  }

  const authMode = readTrimmedString(codexAuth.authMode) || DEFAULT_AUTH_MODE;
  const idToken = readTrimmedString(codexAuth.tokens?.idToken);
  const lastRefresh = normalizeLastRefresh(codexAuth.lastRefresh) || new Date().toISOString();

  if (!idToken) {
    throw new Error("Current ~/.codex/auth.json is missing id_token.");
  }

  return {
    ...credential,
    access: readTrimmedString(codexAuth.tokens?.accessToken) || credential.access,
    refresh: readTrimmedString(codexAuth.tokens?.refreshToken) || credential.refresh,
    accountId: readTrimmedString(codexAuth.tokens?.accountId) || credential.accountId,
    codexAuth: {
      authMode,
      idToken,
      lastRefresh,
    },
  };
}
