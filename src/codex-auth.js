import { loginOpenAICodex, refreshOpenAICodexToken } from "@mariozechner/pi-ai/oauth";

export async function resolveCredentialToken(credential) {
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
    const refreshed = await refreshOpenAICodexToken(credential.refresh);
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

export async function loginWithCodex({ onAuth, waitForManualCode }) {
  return await loginOpenAICodex({
    originator: "codex-auth-dashboard",
    onAuth,
    onManualCodeInput: async () => await waitForManualCode("Paste the authorization code or full redirect URL:"),
    onPrompt: async (prompt) => await waitForManualCode(prompt?.message || "Paste the authorization code or full redirect URL:"),
  });
}
