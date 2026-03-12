#!/usr/bin/env node

import { spawn } from "node:child_process";
import { startDashboardServer } from "./server.js";
import { resolvePaths } from "./paths.js";

function parseArgs(argv) {
  const args = {
    port: 0,
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
      args.port = Number(next) || 0;
      index += 1;
      continue;
    }
    if (arg === "--open") {
      args.open = true;
    }
  }

  return args;
}

async function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const commandArgs = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, commandArgs, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function main() {
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
