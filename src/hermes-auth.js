import { buildCodexAuthFile } from "./codex-cli-auth.js";
import { readJsonObject, writeJsonFileAtomic } from "./json-files.js";
import { isRecord } from "./utils.js";

const HERMES_PROVIDER = "openai-codex";

function buildHermesProviderAuth(credential, options = {}) {
  const codexAuth = buildCodexAuthFile(credential, options);
  return {
    tokens: codexAuth.tokens,
    last_refresh: codexAuth.last_refresh,
    auth_mode: codexAuth.auth_mode,
  };
}

export function buildHermesAuthFile(credential, currentAuth = {}, options = {}) {
  const next = structuredClone(isRecord(currentAuth) ? currentAuth : {});
  const nextProviders = isRecord(next.providers) ? { ...next.providers } : {};
  const existingProvider = isRecord(nextProviders[HERMES_PROVIDER]) ? nextProviders[HERMES_PROVIDER] : {};

  next.version = typeof next.version === "number" ? next.version : 1;
  next.providers = nextProviders;
  next.providers[HERMES_PROVIDER] = {
    ...existingProvider,
    ...buildHermesProviderAuth(credential, options),
  };
  next.active_provider = HERMES_PROVIDER;
  next.updated_at = new Date().toISOString();

  return next;
}

export function writeHermesAuthFile(filePath, credential, options = {}) {
  const currentAuth = readJsonObject(filePath, {});
  writeJsonFileAtomic(filePath, buildHermesAuthFile(credential, currentAuth, options));
}
