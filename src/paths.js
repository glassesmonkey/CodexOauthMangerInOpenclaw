import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_LOCAL_STATE_DIRNAME, DEFAULT_STATE_DIRNAME } from "./constants.js";
import { readJsonObject } from "./json-files.js";
import { dedupeStrings, isRecord } from "./utils.js";

function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

function listAgentIdsFromFilesystem(stateDir) {
  const agentsDir = path.join(stateDir, "agents");
  if (!pathExists(agentsDir)) {
    return [];
  }
  return fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listRuntimeAuthTargetAgentIds(stateDir, fallbackAgentId) {
  const filesystemAgentIds = [...listAgentIdsFromFilesystem(stateDir)].sort((left, right) => left.localeCompare(right));
  if (filesystemAgentIds.length > 0) {
    return filesystemAgentIds;
  }
  return fallbackAgentId ? [fallbackAgentId] : [];
}

function listAgentIdsFromConfig(config) {
  const list = config?.agents?.list;
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((entry) => (isRecord(entry) && typeof entry.id === "string" ? entry.id.trim() : ""))
    .filter(Boolean);
}

function resolveDefaultAgentId(agentIds, config) {
  if (agentIds.includes("main")) {
    return "main";
  }
  const configDefault = config?.agents?.defaults?.id;
  if (typeof configDefault === "string" && configDefault.trim()) {
    return configDefault.trim();
  }
  return agentIds[0] || "main";
}

export function resolvePaths(options = {}) {
  const localStateDir =
    options.localStateDir ||
    process.env.CODEX_DASHBOARD_LOCAL_STATE_DIR ||
    path.join(process.cwd(), DEFAULT_LOCAL_STATE_DIRNAME);
  const stateDir =
    options.stateDir ||
    process.env.OPENCLAW_STATE_DIR ||
    path.join(os.homedir(), DEFAULT_STATE_DIRNAME);
  const configPath =
    options.configPath || process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, "openclaw.json");
  const configExists = pathExists(configPath);
  const config = configExists ? readJsonObject(configPath, {}) : {};
  const availableAgentIds = dedupeStrings([
    ...listAgentIdsFromFilesystem(stateDir),
    ...listAgentIdsFromConfig(config),
  ]);
  const agentId =
    options.agent ||
    resolveDefaultAgentId(availableAgentIds, config);
  const explicitAgentDir =
    options.agentDir ||
    process.env.OPENCLAW_AGENT_DIR ||
    process.env.PI_CODING_AGENT_DIR ||
    "";
  const agentDir =
    explicitAgentDir ||
    path.join(stateDir, "agents", agentId, "agent");
  const runtimeAuthTargetAgentIds = explicitAgentDir
    ? [agentId]
    : listRuntimeAuthTargetAgentIds(stateDir, agentId);
  const runtimeAuthTargetPaths = explicitAgentDir
    ? [path.join(agentDir, "auth-profiles.json")]
    : runtimeAuthTargetAgentIds.map((targetAgentId) =>
      path.join(stateDir, "agents", targetAgentId, "agent", "auth-profiles.json")
    );
  const sessionStoreTargetAgentIds = [...runtimeAuthTargetAgentIds];
  const sessionStoreTargetPaths = sessionStoreTargetAgentIds.map((targetAgentId) =>
    path.join(stateDir, "agents", targetAgentId, "sessions", "sessions.json")
  );
  const codexAuthPath =
    options.codexAuthPath ||
    process.env.CODEX_AUTH_PATH ||
    path.join(os.homedir(), ".codex", "auth.json");
  const hermesHome =
    options.hermesHome ||
    process.env.HERMES_HOME ||
    path.join(os.homedir(), ".hermes");
  const hermesAuthPath =
    options.hermesAuthPath ||
    process.env.HERMES_AUTH_PATH ||
    path.join(hermesHome, "auth.json");
  const localAuthStorePath = path.join(localStateDir, "auth-store.json");
  const runtimeAuthStorePath = path.join(agentDir, "auth-profiles.json");
  const sessionsDir = path.join(stateDir, "agents", agentId, "sessions");
  const sessionStorePath = path.join(sessionsDir, "sessions.json");

  return {
    localStateDir,
    localAuthStorePath,
    localAuthStoreExists: pathExists(localAuthStorePath),
    stateDir,
    configPath,
    configExists,
    config,
    availableAgentIds,
    agentId,
    agentDir,
    runtimeAuthTargetAgentIds,
    runtimeAuthTargetPaths,
    sessionStoreTargetAgentIds,
    sessionStoreTargetPaths,
    codexAuthPath,
    hermesHome,
    hermesAuthPath,
    authStorePath: localAuthStorePath,
    runtimeAuthStorePath,
    sessionsDir,
    sessionStorePath,
    codexAuthExists: pathExists(codexAuthPath),
    hermesAuthExists: pathExists(hermesAuthPath),
    authStoreExists: pathExists(localAuthStorePath),
    runtimeAuthStoreExists: pathExists(runtimeAuthStorePath),
    sessionStoreExists: pathExists(sessionStorePath),
  };
}
