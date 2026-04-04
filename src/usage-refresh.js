import { USAGE_CACHE_TTL_MS, USAGE_FETCH_CONCURRENCY } from "./constants.js";
import { fetchCodexUsage } from "./codex-api.js";

const usageCache = new Map();

function resolveNow(now) {
  if (typeof now === "function") {
    return Number(now()) || Date.now();
  }
  if (Number.isFinite(now)) {
    return Number(now);
  }
  return Date.now();
}

function buildCacheFingerprint(entry) {
  return JSON.stringify([entry.token, entry.accountId || null]);
}

function cloneUsage(usage) {
  return structuredClone(usage);
}

function readCachedUsage(entry, now, cacheTtlMs) {
  const cached = usageCache.get(entry.profileId);
  if (!cached) {
    return null;
  }

  const fingerprint = buildCacheFingerprint(entry);
  if (cached.fingerprint !== fingerprint || now - cached.fetchedAt > cacheTtlMs) {
    usageCache.delete(entry.profileId);
    return null;
  }

  return cloneUsage(cached.usage);
}

function writeCachedUsage(entry, usage, now) {
  usageCache.set(entry.profileId, {
    fingerprint: buildCacheFingerprint(entry),
    fetchedAt: now,
    usage: cloneUsage(usage),
  });
}

export function clearUsageRefreshCache() {
  usageCache.clear();
}

export async function loadUsageRefreshBatch(entries, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cacheTtlMs = Number.isFinite(options.cacheTtlMs) ? Math.max(0, Number(options.cacheTtlMs)) : USAGE_CACHE_TTL_MS;
  const concurrencyLimit = Number.isFinite(options.concurrency)
    ? Math.max(1, Math.floor(Number(options.concurrency)))
    : USAGE_FETCH_CONCURRENCY;
  const nowSource = options.now;
  const startedAt = resolveNow(nowSource);

  const usageByProfileId = new Map();
  const remoteEntries = [];
  let cacheHitCount = 0;

  for (const entry of entries) {
    const cachedUsage = readCachedUsage(entry, resolveNow(nowSource), cacheTtlMs);
    if (cachedUsage) {
      usageByProfileId.set(entry.profileId, cachedUsage);
      cacheHitCount += 1;
      continue;
    }
    remoteEntries.push(entry);
  }

  let cursor = 0;
  async function worker() {
    while (cursor < remoteEntries.length) {
      const entry = remoteEntries[cursor];
      cursor += 1;
      const usage = await fetchCodexUsage({
        token: entry.token,
        accountId: entry.accountId,
        fetchImpl,
      });
      usageByProfileId.set(entry.profileId, usage);
      writeCachedUsage(entry, usage, resolveNow(nowSource));
    }
  }

  const workerCount = Math.min(concurrencyLimit, remoteEntries.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    usageByProfileId,
    metrics: {
      totalProfiles: entries.length,
      remoteFetchCount: remoteEntries.length,
      cacheHitCount,
      durationMs: Math.max(0, resolveNow(nowSource) - startedAt),
      concurrencyLimit,
      cacheTtlMs,
    },
  };
}
