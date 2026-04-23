/**
 * Minimal Cloudflare D1 REST client.
 *
 * We talk to the control plane endpoint:
 *   POST /accounts/{account_id}/d1/database/{database_id}/query
 * with Bearer token authentication.
 *
 * This is intentionally tiny — the dashboard only needs CRUD against a handful
 * of tables. We surface the real D1 error payload in exceptions the same way
 * refreshAccessToken does for OpenAI responses, so callers can distinguish
 * "schema not applied" from "token invalid" from "overloaded" at a glance.
 */

const DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";

export class D1Error extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "D1Error";
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.errors = Array.isArray(options.errors) ? options.errors : [];
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function summarizeD1Errors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "";
  }
  return errors
    .map((entry) => {
      const code = entry?.code != null ? `[${entry.code}]` : "";
      const message = typeof entry?.message === "string" ? entry.message : "";
      return [code, message].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join("; ");
}

async function extractHttpErrorDetail(response) {
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }
  const statusLabel = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  if (!body) {
    return { message: statusLabel, errors: [], code: null };
  }
  try {
    const parsed = JSON.parse(body);
    const errors = Array.isArray(parsed?.errors) ? parsed.errors : [];
    const summary = summarizeD1Errors(errors);
    const firstCode = errors.find((entry) => entry?.code != null)?.code ?? null;
    const combined = summary ? `${statusLabel} ${summary}` : statusLabel;
    return { message: combined, errors, code: firstCode };
  } catch {
    return {
      message: `${statusLabel} ${body.replace(/\s+/g, " ").trim().slice(0, 200)}`,
      errors: [],
      code: null,
    };
  }
}

export function createD1Client(options = {}) {
  const accountId = requireString(options.accountId, "accountId");
  const databaseId = requireString(options.databaseId, "databaseId");
  const apiToken = requireString(options.apiToken, "apiToken");
  const baseUrl = typeof options.baseUrl === "string" && options.baseUrl.trim()
    ? options.baseUrl.trim().replace(/\/+$/, "")
    : DEFAULT_BASE_URL;
  const fetchImpl = typeof options.fetchImpl === "function" ? options.fetchImpl : globalThis.fetch;
  const timeoutMs = Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 15_000;

  const queryUrl = `${baseUrl}/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`;

  async function performPost(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(queryUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error?.name === "AbortError") {
        throw new D1Error(`D1 request timed out after ${timeoutMs}ms`);
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new D1Error(`D1 request failed: ${message}`);
    }
    clearTimeout(timer);

    if (!response.ok) {
      const detail = await extractHttpErrorDetail(response);
      throw new D1Error(`D1 request failed: ${detail.message}`, {
        status: response.status,
        code: detail.code,
        errors: detail.errors,
      });
    }

    let parsed;
    try {
      parsed = await response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new D1Error(`D1 response was not JSON: ${reason}`, { status: response.status });
    }

    if (parsed?.success !== true) {
      const errors = Array.isArray(parsed?.errors) ? parsed.errors : [];
      const summary = summarizeD1Errors(errors) || "D1 returned success=false";
      const firstCode = errors.find((entry) => entry?.code != null)?.code ?? null;
      throw new D1Error(summary, { status: response.status, code: firstCode, errors });
    }

    return parsed.result ?? [];
  }

  async function query(sql, params = []) {
    const statement = requireString(sql, "sql");
    const bound = Array.isArray(params) ? params : [];
    const results = await performPost({ sql: statement, params: bound });
    return Array.isArray(results) && results.length > 0 ? results[0] : { results: [], meta: {}, success: true };
  }

  async function batch(statements) {
    if (!Array.isArray(statements) || statements.length === 0) {
      return [];
    }
    const normalized = statements.map((entry) => ({
      sql: requireString(entry?.sql, "sql"),
      params: Array.isArray(entry?.params) ? entry.params : [],
    }));
    return await performPost({ batch: normalized });
  }

  async function ping() {
    // Lightweight health-check. Uses schema_version if present, otherwise
    // falls back to a trivial expression.
    try {
      const result = await query("SELECT version FROM schema_version WHERE id = 1;");
      const row = Array.isArray(result?.results) ? result.results[0] : null;
      return { ok: true, schemaVersion: row?.version ?? null };
    } catch (error) {
      if (error instanceof D1Error && /no such table/i.test(error.message)) {
        return { ok: false, schemaVersion: null, reason: "schema-not-applied" };
      }
      throw error;
    }
  }

  return {
    query,
    batch,
    ping,
    describe: { accountId, databaseId },
  };
}
