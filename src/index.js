#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { startDashboardServer } from "./server.js";
import { resolvePaths } from "./paths.js";

export function parseArgs(argv) {
  const args = {
    port: 3001,
    open: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--state-dir" && next) {
      args.stateDir = next.trim();
      index += 1;
      continue;
    }
    if (arg === "--config" && next) {
      args.configPath = next.trim();
      index += 1;
      continue;
    }
    if (arg === "--agent" && next) {
      args.agent = next.trim();
      index += 1;
      continue;
    }
    if (arg === "--agent-dir" && next) {
      args.agentDir = next.trim();
      index += 1;
      continue;
    }
    if (arg === "--port" && next) {
      args.port = Number(next) || 3001;
      index += 1;
      continue;
    }
    if (arg === "--open") {
      args.open = true;
    }
  }

  return args;
}

function getOpenCommand(platform) {
  if (platform === "darwin") {
    return { command: "open", args: [] };
  }
  if (platform === "win32") {
    return { command: "cmd", args: ["/c", "start", ""] };
  }
  return { command: "xdg-open", args: [] };
}

export async function openBrowser(url, options = {}) {
  const platform = options.platform ?? process.platform;
  const spawnImpl = options.spawn ?? spawn;
  const logger = options.logger ?? console;
  const { command, args } = getOpenCommand(platform);
  const commandArgs = [...args, url];

  await new Promise((resolve) => {
    const child = spawnImpl(command, commandArgs, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", (error) => {
      const detail = error instanceof Error ? error.message : String(error);
      logger.warn?.(`Could not open browser automatically: ${detail}`);
      resolve();
    });

    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function main() {
  const args = parseArgs(process.argv);
  const context = resolvePaths(args);
  const { url } = await startDashboardServer(args);

  console.log("Codex Auth Dashboard ready");
  console.log(`URL: ${url}`);
  console.log(`Agent: ${context.agentId}`);
  console.log(`Auth store: ${context.authStorePath}`);
  console.log(`Config: ${context.configPath}`);

  if (args.open) {
    await openBrowser(url);
  }
}

const isEntrypoint =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
