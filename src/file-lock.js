import fs from "node:fs/promises";
import { LOCK_RETRY_MS, LOCK_TIMEOUT_MS } from "./constants.js";
import { sleep } from "./utils.js";

export async function withFileLock(filePath, fn, options = {}) {
  const lockPath = `${filePath}.lock`;
  const timeoutMs = options.timeoutMs ?? LOCK_TIMEOUT_MS;
  const retryMs = options.retryMs ?? LOCK_RETRY_MS;
  const startedAt = Date.now();

  while (true) {
    let handle;
    try {
      handle = await fs.open(lockPath, "wx");
      try {
        return await fn();
      } finally {
        await handle.close().catch(() => {});
        await fs.unlink(lockPath).catch(() => {});
      }
    } catch (error) {
      if (error && error.code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(`Timed out waiting for lock: ${filePath}`);
      }
      await sleep(retryMs);
    }
  }
}
