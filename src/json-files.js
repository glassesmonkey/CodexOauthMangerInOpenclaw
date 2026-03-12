import fs from "node:fs";
import path from "node:path";
import { isRecord } from "./utils.js";

export function readJsonFile(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.trim()) {
    return fallback;
  }
  return JSON.parse(text);
}

export function readJsonObject(filePath, fallback = {}) {
  const value = readJsonFile(filePath, fallback);
  return isRecord(value) ? value : fallback;
}

export function writeJsonFileAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}
