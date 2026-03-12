import { dedupeStrings } from "./utils.js";

function compareNullableDesc(left, right) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return right - left;
}

function compareNullableAsc(left, right) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return left - right;
}

export function recommendProfileOrder(rows) {
  return rows
    .toSorted((left, right) => {
      const leftErrored = Boolean(left.error);
      const rightErrored = Boolean(right.error);
      if (leftErrored !== rightErrored) {
        return leftErrored ? 1 : -1;
      }

      // Prefer the profile whose long-window quota resets sooner to reduce waste.
      const secondaryReset = compareNullableAsc(left.secondary.resetAt, right.secondary.resetAt);
      if (secondaryReset !== 0) {
        return secondaryReset;
      }

      const secondary = compareNullableDesc(left.secondary.remainingPercent, right.secondary.remainingPercent);
      if (secondary !== 0) {
        return secondary;
      }

      const primary = compareNullableDesc(left.primary.remainingPercent, right.primary.remainingPercent);
      if (primary !== 0) {
        return primary;
      }

      const primaryReset = compareNullableAsc(left.primary.resetAt, right.primary.resetAt);
      if (primaryReset !== 0) {
        return primaryReset;
      }

      if (left.currentOrderIndex !== right.currentOrderIndex) {
        return left.currentOrderIndex - right.currentOrderIndex;
      }

      return left.profileId.localeCompare(right.profileId);
    })
    .map((row) => row.profileId);
}

export function buildConfigAudit({ runtimeProfileIds, storedOrder, configProfileIds, configOrder }) {
  const configProfiles = new Set(configProfileIds);
  const configOrderSet = new Set(configOrder);
  const storedOrderSet = new Set(storedOrder);
  const runtimeSet = new Set(runtimeProfileIds);

  return {
    missingConfigProfiles: runtimeProfileIds.filter((profileId) => !configProfiles.has(profileId)),
    missingConfigOrderProfiles: runtimeProfileIds.filter(
      (profileId) => configOrder.length > 0 && !configOrderSet.has(profileId),
    ),
    extraConfigOrderProfiles: configOrder.filter((profileId) => !runtimeSet.has(profileId)),
    missingStoredOrderProfiles: runtimeProfileIds.filter(
      (profileId) => storedOrder.length > 0 && !storedOrderSet.has(profileId),
    ),
  };
}

export function buildWarnings({ rows, audit, context }) {
  const warnings = [];

  if (!context.authStoreExists) {
    warnings.push("auth-profiles.json was not found at the resolved path yet.");
  }
  if (!context.configExists) {
    warnings.push("openclaw.json was not found at the resolved path.");
  }
  if (rows.length === 0) {
    warnings.push("No openai-codex profiles were found in auth-profiles.json.");
  }
  if (audit.missingConfigProfiles.length > 0) {
    warnings.push(`openclaw.json auth.profiles is missing: ${audit.missingConfigProfiles.join(", ")}`);
  }
  if (audit.missingConfigOrderProfiles.length > 0) {
    warnings.push(`openclaw.json auth.order omits: ${audit.missingConfigOrderProfiles.join(", ")}`);
  }
  if (audit.extraConfigOrderProfiles.length > 0) {
    warnings.push(`openclaw.json auth.order references unknown profiles: ${audit.extraConfigOrderProfiles.join(", ")}`);
  }
  if (audit.missingStoredOrderProfiles.length > 0) {
    warnings.push(`auth-profiles.json order omits: ${audit.missingStoredOrderProfiles.join(", ")}`);
  }

  const defaultNames = rows
    .map((row) => row.profileId)
    .filter((profileId) => profileId.endsWith(":default"));
  if (defaultNames.length > 0) {
    warnings.push(`Profiles still using :default should be renamed: ${dedupeStrings(defaultNames).join(", ")}`);
  }

  return warnings;
}
