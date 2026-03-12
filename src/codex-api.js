import { DEFAULT_TIMEOUT_MS } from "./constants.js";
import { clampPercent, remainingPercent } from "./utils.js";

const WEEKLY_RESET_GAP_SECONDS = 3 * 24 * 60 * 60;

function buildWindow(label = null, usedPercent = null, resetAt = null) {
  return {
    label,
    usedPercent,
    remainingPercent: remainingPercent(usedPercent),
    resetAt,
  };
}

function resolveSecondaryWindowLabel({ windowHours, primaryResetAt, secondaryResetAt }) {
  if (windowHours >= 168) {
    return "Week";
  }
  if (windowHours < 24) {
    return `${windowHours}h`;
  }
  if (
    Number.isFinite(primaryResetAt) &&
    Number.isFinite(secondaryResetAt) &&
    secondaryResetAt - primaryResetAt >= WEEKLY_RESET_GAP_SECONDS
  ) {
    return "Week";
  }
  return "Day";
}

export async function fetchCodexUsage({ token, accountId, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "codex-auth-dashboard",
    };
    if (accountId) {
      headers["ChatGPT-Account-Id"] = accountId;
    }

    const response = await fetchImpl("https://chatgpt.com/backend-api/wham/usage", {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        primary: buildWindow(),
        secondary: buildWindow(),
        plan: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const primary = data?.rate_limit?.primary_window;
    const secondary = data?.rate_limit?.secondary_window;
    const primaryResetAt = Number.isFinite(primary?.reset_at) ? primary.reset_at : null;

    const primaryWindow = primary
      ? buildWindow(
          `${Math.round((primary.limit_window_seconds || 10_800) / 3600)}h`,
          clampPercent(primary.used_percent || 0),
          primaryResetAt,
        )
      : buildWindow();

    const secondaryWindow = secondary
      ? buildWindow(
          resolveSecondaryWindowLabel({
            windowHours: Math.round((secondary.limit_window_seconds || 86_400) / 3600),
            primaryResetAt,
            secondaryResetAt: secondary.reset_at,
          }),
          clampPercent(secondary.used_percent || 0),
          Number.isFinite(secondary.reset_at) ? secondary.reset_at : null,
        )
      : buildWindow();

    let plan = typeof data?.plan_type === "string" ? data.plan_type : null;
    if (data?.credits?.balance !== undefined && data?.credits?.balance !== null) {
      const balance = Number(data.credits.balance);
      const balanceLabel = Number.isFinite(balance) ? `$${balance.toFixed(2)}` : String(data.credits.balance);
      plan = plan ? `${plan} (${balanceLabel})` : balanceLabel;
    }

    return {
      primary: primaryWindow,
      secondary: secondaryWindow,
      plan,
      error: null,
    };
  } catch (error) {
    return {
      primary: buildWindow(),
      secondary: buildWindow(),
      plan: null,
      error: error?.name === "AbortError" ? "Request timed out" : (error instanceof Error ? error.message : String(error)),
    };
  } finally {
    clearTimeout(timer);
  }
}
