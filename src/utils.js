export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function dedupeStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Number(value)));
}

export function remainingPercent(usedPercent) {
  if (!Number.isFinite(usedPercent)) {
    return null;
  }
  return Math.max(0, 100 - clampPercent(usedPercent));
}
