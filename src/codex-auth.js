import { loginOpenAICodex, refreshOpenAICodexToken } from "@mariozechner/pi-ai/oauth";
import { createUsageFetch } from "./usage-fetch.js";

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

export async function resolveCredentialToken(credential, options = {}) {
  const refreshImpl = options.refreshImpl ?? refreshOpenAICodexToken;
  const proxyFetch = createUsageFetch(options.proxyConfig);

  if (credential?.type === "oauth") {
    if (typeof credential.access !== "string" || !credential.access.trim()) {
      throw new Error("OAuth profile is missing access token");
    }
    const expiresAt = typeof credential.expires === "number" ? credential.expires : 0;
    if (expiresAt > Date.now() + 30_000) {
      return {
        token: credential.access,
        credential,
        refreshed: false,
      };
    }
    if (typeof credential.refresh !== "string" || !credential.refresh.trim()) {
      throw new Error("OAuth profile is expired and missing refresh token");
    }
    const refreshed = await withTemporaryFetch(proxyFetch, async () => await refreshImpl(credential.refresh));
    return {
      token: refreshed.access,
      credential: {
        ...credential,
        ...refreshed,
        type: "oauth",
        provider: "openai-codex",
      },
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

export async function loginWithCodex({ onAuth, waitForManualCode, proxyConfig, loginImpl = loginOpenAICodex }) {
  const proxyFetch = createUsageFetch(proxyConfig);

  try {
    return await withTemporaryFetch(proxyFetch, async () =>
      await loginImpl({
        originator: "codex-auth-dashboard",
        onAuth,
        onManualCodeInput: async () => await waitForManualCode("Paste the authorization code or full redirect URL:"),
        onPrompt: async (prompt) => await waitForManualCode(prompt?.message || "Paste the authorization code or full redirect URL:"),
      }),
    );
  } catch (error) {
    throw enhanceOAuthError(error, proxyConfig);
  }
}
