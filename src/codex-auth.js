import { loginOpenAICodex, refreshOpenAICodexToken } from "@mariozechner/pi-ai/oauth";
import { createUsageFetch } from "./usage-fetch.js";

const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";
const OPENAI_PROFILE_CLAIM = "https://api.openai.com/profile";

async function withTemporaryFetch(fetchImpl, action) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await action();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function enhanceOAuthError(error, proxyConfig) {
  const message = error instanceof Error ? error.message : String(error);
  if (message !== "Token exchange failed") {
    return error instanceof Error ? error : new Error(message);
  }

  const hint = proxyConfig?.enabled
    ? " Check the proxy URL and confirm the dashboard process can reach OpenAI's OAuth token endpoint."
    : " If you're on WSL or a proxied network, restart the dashboard after running proxy setup, or enable the dashboard proxy before adding the account.";

  return new Error(message + hint);
}

function parseManualAuthorizationInput(input) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) {
    return {};
  }

  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("code") ?? undefined,
      state: url.searchParams.get("state") ?? undefined,
    };
  } catch {
    // Not a full URL, continue with text-only parsing.
  }

  if (value.includes("#")) {
    const [code, state] = value.split("#", 2);
    return {
      code: code?.trim() || undefined,
      state: state?.trim() || undefined,
    };
  }

  if (value.includes("code=")) {
    const params = new URLSearchParams(value);
    return {
      code: params.get("code") ?? undefined,
      state: params.get("state") ?? undefined,
    };
  }

  if (/\s/.test(value)) {
    return {};
  }

  return { code: value };
}

export function normalizeManualAuthorizationInput(input) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) {
    throw new Error("Manual code cannot be empty.");
  }

  const parsed = parseManualAuthorizationInput(value);
  if (!parsed.code || !parsed.code.trim()) {
    throw new Error("Paste the full localhost callback URL or the authorization code.");
  }

  return value;
}

function readTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function decodeJwtPayload(token) {
  const value = readTrimmedString(token);
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

export function extractOpenAIIdentityFromAccessToken(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const auth = payload?.[OPENAI_AUTH_CLAIM];
  const profile = payload?.[OPENAI_PROFILE_CLAIM];

  return {
    accountId: readTrimmedString(auth?.chatgpt_account_id),
    email: readTrimmedString(profile?.email),
  };
}

export function enrichOpenAICodexCredential(credential) {
  if (!credential || typeof credential !== "object") {
    return credential;
  }

  const identity = extractOpenAIIdentityFromAccessToken(credential.access);
  const storedAccountId = readTrimmedString(credential.accountId) || readTrimmedString(credential.metadata?.accountId);
  const storedEmail = readTrimmedString(credential.email) || readTrimmedString(credential.metadata?.email);

  let nextCredential = credential;

  if (identity.accountId && !storedAccountId) {
    nextCredential = {
      ...nextCredential,
      accountId: identity.accountId,
    };
  }

  if (identity.email && !storedEmail) {
    nextCredential = {
      ...nextCredential,
      email: identity.email,
    };
  }

  return nextCredential;
}

export async function resolveCredentialToken(credential, options = {}) {
  const refreshImpl = options.refreshImpl ?? refreshOpenAICodexToken;
  const proxyFetch = createUsageFetch(options.proxyConfig);

  if (credential?.type === "oauth") {
    const enrichedCredential = enrichOpenAICodexCredential(credential);

    if (typeof enrichedCredential.access !== "string" || !enrichedCredential.access.trim()) {
      throw new Error("OAuth profile is missing access token");
    }
    const expiresAt = typeof enrichedCredential.expires === "number" ? enrichedCredential.expires : 0;
    if (expiresAt > Date.now() + 30_000) {
      return {
        token: enrichedCredential.access,
        credential: enrichedCredential,
        updated: enrichedCredential !== credential,
      };
    }
    if (typeof enrichedCredential.refresh !== "string" || !enrichedCredential.refresh.trim()) {
      throw new Error("OAuth profile is expired and missing refresh token");
    }
    const refreshed = await withTemporaryFetch(proxyFetch, async () => await refreshImpl(enrichedCredential.refresh));
    const nextCredential = enrichOpenAICodexCredential({
      ...enrichedCredential,
      ...refreshed,
      type: "oauth",
      provider: "openai-codex",
    });
    return {
      token: nextCredential.access,
      credential: nextCredential,
      updated: true,
    };
  }

  if (credential?.type === "token") {
    if (typeof credential.token !== "string" || !credential.token.trim()) {
      throw new Error("Token profile is missing bearer token");
    }
    return {
      token: credential.token,
      credential,
      refreshed: false,
    };
  }

  throw new Error(`Unsupported credential type: ${credential?.type ?? "unknown"}`);
}

export async function loginWithCodex({
  onAuth,
  waitForManualCode,
  onManualCodeRequested,
  proxyConfig,
  loginImpl = loginOpenAICodex,
}) {
  const proxyFetch = createUsageFetch(proxyConfig);

  try {
    return await withTemporaryFetch(proxyFetch, async () =>
      await loginImpl({
        originator: "codex-auth-dashboard",
        onAuth,
        onPrompt: async (prompt) => {
          const message = prompt?.message || "Paste the authorization code or full redirect URL:";
          await onManualCodeRequested?.(message);
          return await waitForManualCode(message);
        },
      }),
    );
  } catch (error) {
    throw enhanceOAuthError(error, proxyConfig);
  }
}
