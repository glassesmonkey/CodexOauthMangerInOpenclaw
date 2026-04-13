import { PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT } from "./constants.js";

export function buildQuotaBoardSummary(rows) {
  function normalizeRemainingPercent(windowData) {
    return typeof windowData?.remainingPercent === "number" && Number.isFinite(windowData.remainingPercent)
      ? Math.max(0, Math.min(100, windowData.remainingPercent))
      : null;
  }

  function normalizeResetAt(windowData) {
    if (!windowData?.resetAt) {
      return null;
    }
    const timestamp = windowData.resetAt > 10_000_000_000 ? windowData.resetAt : windowData.resetAt * 1000;
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function shouldIncludePrimaryWindow(row, remainingPercent) {
    if (row?.error || remainingPercent == null) {
      return false;
    }

    const secondaryRemaining = normalizeRemainingPercent(row?.secondary);
    if (secondaryRemaining == null || secondaryRemaining <= 0) {
      return false;
    }

    return remainingPercent > PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT;
  }

  function buildWindowSummary(items, windowKey, label) {
    const segments = [];
    let totalRemaining = 0;
    let readableCount = 0;
    let nextResetAt = null;

    for (const row of Array.isArray(items) ? items : []) {
      const remainingPercent = normalizeRemainingPercent(row?.[windowKey]);
      if (remainingPercent == null) {
        continue;
      }

      if (windowKey === "primary" && !shouldIncludePrimaryWindow(row, remainingPercent)) {
        continue;
      }

      readableCount += 1;
      totalRemaining += remainingPercent;

      const resetAt = normalizeResetAt(row?.[windowKey]);
      if (resetAt != null && (nextResetAt == null || resetAt < nextResetAt)) {
        nextResetAt = resetAt;
      }

      segments.push({
        profileId: row?.profileId || "-",
        displayLabel: row?.displayLabel || row?.profileId || "-",
        remainingPercent,
        secondaryRemainingPercent: normalizeRemainingPercent(row?.secondary),
        sharePercent: 0,
      });
    }

    const totalCapacity = readableCount * 100;
    for (const segment of segments) {
      segment.sharePercent = totalCapacity > 0 ? (segment.remainingPercent / totalCapacity) * 100 : 0;
    }

    return {
      key: windowKey,
      label,
      totalRemaining,
      totalCapacity,
      readableCount,
      nextResetAt,
      segments,
    };
  }

  const normalizedRows = Array.isArray(rows) ? rows : [];
  return {
    totalAccounts: normalizedRows.length,
    secondary: buildWindowSummary(normalizedRows, "secondary", "7d"),
    primary: buildWindowSummary(normalizedRows, "primary", "5h"),
  };
}
