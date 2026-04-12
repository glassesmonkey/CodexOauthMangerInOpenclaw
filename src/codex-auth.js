import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import { OAUTH_REFRESH_WINDOW_MS } from "./constants.js";
import { createUsageFetch } from "./usage-fetch.js";

const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";
const OPENAI_PROFILE_CLAIM = "https://api.openai.com/profile";
const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";
const OPENAI_REDIRECT_URI = "http://localhost:1455/auth/callback";
const OPENAI_SCOPE = "openid profile email offline_access";
const DEFAULT_AUTH_MODE = "chatgpt";
const CALLBACK_POLL_MS = 100;
const CALLBACK_TIMEOUT_MS = 60_000;
const SUCCESS_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authentication successful</title>
</head>
<body>
  <p>Authentication successful. Return to your terminal to continue.</p>
</body>
</html>`;

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

function normalizeIsoString(value) {
  const trimmed = readTrimmedString(value);
  if (!trimmed) {
    return null;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
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

function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function createOpenAIState() {
  return randomBytes(16).toString("hex");
}

function createOpenAIAuthorizationUrl(originator = "codex-auth-dashboard") {
  const { verifier, challenge } = createPkcePair();
  const state = createOpenAIState();
  const url = new URL(OPENAI_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", OPENAI_CLIENT_ID);
  url.searchParams.set("redirect_uri", OPENAI_REDIRECT_URI);
  url.searchParams.set("scope", OPENAI_SCOPE);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", originator);
  return {
    verifier,
    state,
    url: url.toString(),
  };
}

function startLocalOAuthServer(expectedState) {
  let lastCode = null;
  let cancelled = false;
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url || "", "http://localhost");
      if (url.pathname !== "/auth/callback") {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }
      if (url.searchParams.get("state") !== expectedState) {
        response.statusCode = 400;
        response.end("State mismatch");
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        response.statusCode = 400;
        response.end("Missing authorization code");
        return;
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(SUCCESS_HTML);
      lastCode = code;
    } catch {
      response.statusCode = 500;
      response.end("Internal error");
    }
  });

  return new Promise((resolve) => {
    server
      .listen(1455, "127.0.0.1", () => {
        resolve({
          close: () => server.close(),
          cancelWait: () => {
            cancelled = true;
          },
          waitForCode: async () => {
            const deadline = Date.now() + CALLBACK_TIMEOUT_MS;
            while (Date.now() <= deadline) {
              if (lastCode) {
                return { code: lastCode };
              }
              if (cancelled) {
                return null;
              }
              await new Promise((nextResolve) => setTimeout(nextResolve, CALLBACK_POLL_MS));
            }
            return null;
          },
        });
      })
      .once("error", () => {
        resolve({
          close: () => {
            try {
              server.close();
            } catch {
              // Ignore cleanup errors.
            }
          },
          cancelWait: () => {},
          waitForCode: async () => null,
        });
      });
  });
}

async function exchangeAuthorizationCode(code, verifier, redirectUri = OPENAI_REDIRECT_URI) {
  const response = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OPENAI_CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    return { ok: false };
  }

  const json = await response.json();
  const access = readTrimmedString(json.access_token);
  const refresh = readTrimmedString(json.refresh_token);
  const idToken = readTrimmedString(json.id_token);
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : null;

  if (!access || !refresh || !idToken || !expiresIn) {
    return { ok: false };
  }

  return {
    ok: true,
    access,
    refresh,
    idToken,
    expires: Date.now() + expiresIn * 1000,
  };
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: OPENAI_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh OpenAI Codex token");
  }

  const json = await response.json();
  const access = readTrimmedString(json.access_token);
  const refresh = readTrimmedString(json.refresh_token);
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : null;

  if (!access || !refresh || !expiresIn) {
    throw new Error("Failed to refresh OpenAI Codex token");
  }

  return {
    access,
    refresh,
    expires: Date.now() + expiresIn * 1000,
  };
}

function buildStoredCodexAuthMetadata(credentials) {
  const idToken = readTrimmedString(credentials?.idToken) || readTrimmedString(credentials?.codexAuth?.idToken);
  if (!idToken) {
    return undefined;
  }

  return {
    authMode: readTrimmedString(credentials?.authMode)
      || readTrimmedString(credentials?.codexAuth?.authMode)
      || DEFAULT_AUTH_MODE,
    idToken,
    lastRefresh: normalizeIsoString(credentials?.lastRefresh)
      || normalizeIsoString(credentials?.codexAuth?.lastRefresh)
      || new Date().toISOString(),
  };
}

export function buildStoredCodexCredential(credentials) {
  const nextCredential = enrichOpenAICodexCredential({
    access: credentials?.access,
    refresh: credentials?.refresh,
    expires: credentials?.expires,
    accountId: credentials?.accountId,
    email: credentials?.email,
    metadata: credentials?.metadata,
    type: "oauth",
    provider: "openai-codex",
  });
  const codexAuth = buildStoredCodexAuthMetadata(credentials);
  if (!codexAuth) {
    delete nextCredential.codexAuth;
    return nextCredential;
  }

  return {
    ...nextCredential,
    codexAuth,
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

export function shouldRefreshOAuthCredential(credential, refreshWindowMs = OAUTH_REFRESH_WINDOW_MS) {
  const expiresAt = typeof credential?.expires === "number" ? credential.expires : 0;
  return expiresAt <= Date.now() + Math.max(0, refreshWindowMs);
}

export async function resolveCredentialToken(credential, options = {}) {
  const refreshImpl = options.refreshImpl ?? refreshAccessToken;
  const refreshWindowMs = options.refreshWindowMs ?? OAUTH_REFRESH_WINDOW_MS;
  const proxyFetch = createUsageFetch(options.proxyConfig);

  if (credential?.type === "oauth") {
    const enrichedCredential = enrichOpenAICodexCredential(credential);

    if (typeof enrichedCredential.access !== "string" || !enrichedCredential.access.trim()) {
      throw new Error("OAuth profile is missing access token");
    }
    if (!shouldRefreshOAuthCredential(enrichedCredential, refreshWindowMs)) {
      return {
        token: enrichedCredential.access,
        credential: enrichedCredential,
        updated: enrichedCredential !== credential,
        refreshed: false,
      };
    }
    if (typeof enrichedCredential.refresh !== "string" || !enrichedCredential.refresh.trim()) {
      throw new Error("OAuth profile is expired and missing refresh token");
    }

    const refreshed = await withTemporaryFetch(proxyFetch, async () => await refreshImpl(enrichedCredential.refresh));
    const nextCredential = buildStoredCodexCredential({
      ...enrichedCredential,
      ...refreshed,
      codexAuth: enrichedCredential.codexAuth
        ? {
          ...enrichedCredential.codexAuth,
          lastRefresh: new Date().toISOString(),
        }
        : enrichedCredential.codexAuth,
    });

    return {
      token: nextCredential.access,
      credential: nextCredential,
      updated: true,
      refreshed: true,
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

async function defaultCodexLoginImpl({
  onAuth,
  onManualCodeRequested,
  waitForManualCode,
  originator = "codex-auth-dashboard",
}) {
  const { verifier, state, url } = createOpenAIAuthorizationUrl(originator);
  const server = await startLocalOAuthServer(state);

  onAuth?.({
    url,
    instructions: "A browser window should open. Complete login to finish.",
  });

  try {
    let code = null;
    const callback = await server.waitForCode();
    if (callback?.code) {
      code = callback.code;
    }

    if (!code) {
      const message = "Paste the authorization code or full redirect URL:";
      await onManualCodeRequested?.(message);
      const manualInput = await waitForManualCode(message);
      const parsed = parseManualAuthorizationInput(manualInput);
      if (parsed.state && parsed.state !== state) {
        throw new Error("State mismatch");
      }
      code = parsed.code || null;
    }

    if (!code) {
      throw new Error("Missing authorization code");
    }

    const tokenResult = await exchangeAuthorizationCode(code, verifier);
    if (!tokenResult.ok) {
      throw new Error("Token exchange failed");
    }

    const identity = extractOpenAIIdentityFromAccessToken(tokenResult.access);
    if (!identity.accountId) {
      throw new Error("Failed to extract accountId from token");
    }

    return {
      access: tokenResult.access,
      refresh: tokenResult.refresh,
      expires: tokenResult.expires,
      accountId: identity.accountId,
      email: identity.email,
      idToken: tokenResult.idToken,
      authMode: DEFAULT_AUTH_MODE,
      lastRefresh: new Date().toISOString(),
    };
  } finally {
    server.close();
  }
}

export async function loginWithCodex({
  onAuth,
  waitForManualCode,
  onManualCodeRequested,
  proxyConfig,
  loginImpl = defaultCodexLoginImpl,
}) {
  const proxyFetch = createUsageFetch(proxyConfig);

  try {
    return await withTemporaryFetch(proxyFetch, async () =>
      await loginImpl({
        originator: "codex-auth-dashboard",
        onAuth,
        waitForManualCode,
        onManualCodeRequested,
      }),
    );
  } catch (error) {
    throw enhanceOAuthError(error, proxyConfig);
  }
}
