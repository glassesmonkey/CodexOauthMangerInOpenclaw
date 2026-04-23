/**
 * Dashboard-level user configuration: cloud vs offline store mode, D1
 * connection, device id, and optional encryption passphrase.
 *
 * Persisted at <localStateDir>/dashboard-config.json. The file is written with
 * 0600 permissions because it holds a Cloudflare API token and, optionally, a
 * store passphrase. If you'd rather keep those out of disk, leave the fields
 * empty in the file and export CODEX_DASHBOARD_* env vars instead; we read
 * those as overrides when a field is missing.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJsonObject } from "./json-files.js";
import { resolvePaths } from "./paths.js";
import { isRecord } from "./utils.js";

export const STORE_MODES = Object.freeze(["offline", "cloud"]);
export const DEFAULT_STORE_MODE = "offline";

export const CONFIG_FILENAME = "dashboard-config.json";

function readTrimmedEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeStoreMode(value) {
  return STORE_MODES.includes(value) ? value : DEFAULT_STORE_MODE;
}

function normalizeD1Settings(raw) {
  const record = isRecord(raw) ? raw : {};
  return {
    accountId: typeof record.accountId === "string" ? record.accountId.trim() : "",
    databaseId: typeof record.databaseId === "string" ? record.databaseId.trim() : "",
    apiToken: typeof record.apiToken === "string" ? record.apiToken.trim() : "",
    baseUrl: typeof record.baseUrl === "string" ? record.baseUrl.trim() : "",
    timeoutMs: Number.isInteger(record.timeoutMs) && record.timeoutMs > 0 ? record.timeoutMs : 15_000,
  };
}

function applyEnvOverrides(d1) {
  return {
    accountId: d1.accountId || readTrimmedEnv("CLOUDFLARE_ACCOUNT_ID") || readTrimmedEnv("CODEX_DASHBOARD_D1_ACCOUNT_ID"),
    databaseId: d1.databaseId || readTrimmedEnv("CODEX_DASHBOARD_D1_DATABASE_ID"),
    apiToken: d1.apiToken || readTrimmedEnv("CLOUDFLARE_API_TOKEN") || readTrimmedEnv("CODEX_DASHBOARD_D1_API_TOKEN"),
    baseUrl: d1.baseUrl || readTrimmedEnv("CODEX_DASHBOARD_D1_BASE_URL") || "",
    timeoutMs: d1.timeoutMs,
  };
}

function coerceDeviceId(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  const host = os.hostname().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 32) || "device";
  return `${host}-${randomUUID().slice(0, 8)}`;
}

export function getDashboardConfigPath(options = {}) {
  const context = resolvePaths(options);
  return path.join(context.localStateDir, CONFIG_FILENAME);
}

function readRawConfig(configPath) {
  return isRecord(readJsonObject(configPath, {})) ? readJsonObject(configPath, {}) : {};
}

export function loadDashboardConfig(options = {}) {
  const configPath = getDashboardConfigPath(options);
  const raw = readRawConfig(configPath);
  const storeMode = normalizeStoreMode(raw.storeMode);
  const d1 = applyEnvOverrides(normalizeD1Settings(raw.d1));
  const passphrase = typeof raw.storePassphrase === "string" && raw.storePassphrase.trim()
    ? raw.storePassphrase
    : readTrimmedEnv("CODEX_DASHBOARD_STORE_PASSPHRASE");
  const deviceId = coerceDeviceId(raw.deviceId);

  return {
    path: configPath,
    exists: fs.existsSync(configPath),
    storeMode,
    d1,
    deviceId,
    hasPassphrase: Boolean(passphrase),
    passphrase,
    raw,
  };
}

function writeConfigFile(configPath, record) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const serialized = JSON.stringify(record, null, 2);
  fs.writeFileSync(configPath, `${serialized}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(configPath, 0o600);
  } catch {
    // Best effort: some filesystems (e.g. FAT) don't support chmod.
  }
}

export function saveDashboardConfig(options = {}, update = {}) {
  const current = loadDashboardConfig(options);
  const configPath = current.path;
  const next = {
    ...current.raw,
    storeMode: normalizeStoreMode(update.storeMode ?? current.storeMode),
    deviceId: current.raw.deviceId || current.deviceId,
  };

  if (Object.prototype.hasOwnProperty.call(update, "d1") && isRecord(update.d1)) {
    const incomingD1 = normalizeD1Settings(update.d1);
    // Preserve existing apiToken when caller omits it (so UI can hide it).
    const existingD1 = normalizeD1Settings(current.raw.d1);
    const preservedToken = incomingD1.apiToken || existingD1.apiToken || "";
    next.d1 = {
      ...existingD1,
      ...incomingD1,
      apiToken: preservedToken,
    };
  }

  if (Object.prototype.hasOwnProperty.call(update, "storePassphrase")) {
    const value = typeof update.storePassphrase === "string" ? update.storePassphrase : "";
    if (value.trim()) {
      next.storePassphrase = value;
    } else {
      delete next.storePassphrase;
    }
  }

  if (Object.prototype.hasOwnProperty.call(update, "deviceId") && typeof update.deviceId === "string" && update.deviceId.trim()) {
    next.deviceId = update.deviceId.trim();
  }

  writeConfigFile(configPath, next);
  return loadDashboardConfig(options);
}

export function summarizeDashboardConfigForClient(config) {
  const d1 = config.d1 ?? {};
  return {
    storeMode: config.storeMode,
    deviceId: config.deviceId,
    hasPassphrase: Boolean(config.hasPassphrase),
    d1: {
      accountId: d1.accountId || "",
      databaseId: d1.databaseId || "",
      hasApiToken: Boolean(d1.apiToken),
      baseUrl: d1.baseUrl || "",
      timeoutMs: d1.timeoutMs ?? 15_000,
    },
  };
}

export function requireCloudReady(config) {
  if (config.storeMode !== "cloud") {
    throw new Error("Dashboard is in offline mode; cloud operation is not allowed.");
  }
  const d1 = config.d1 ?? {};
  const missing = [
    d1.accountId ? null : "accountId",
    d1.databaseId ? null : "databaseId",
    d1.apiToken ? null : "apiToken",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Cloud mode is missing D1 settings: ${missing.join(", ")}`);
  }
}
