import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { buildLocalAuthStore } from "./auth-store.js";
import {
  EXPORT_BUNDLE_KIND,
  EXPORT_BUNDLE_VERSION,
} from "./constants.js";
import { isRecord } from "./utils.js";

const CIPHER_NAME = "aes-256-gcm";
const KDF_NAME = "scrypt";
const KDF_PARAMS = {
  cost: 16_384,
  blockSize: 8,
  parallelization: 1,
};

function requirePassphrase(passphrase) {
  const value = typeof passphrase === "string" ? passphrase : "";
  if (!value.trim()) {
    throw new Error("Passphrase is required.");
  }
  return value;
}

function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, {
    N: KDF_PARAMS.cost,
    r: KDF_PARAMS.blockSize,
    p: KDF_PARAMS.parallelization,
  });
}

function parseBundleInput(bundleInput) {
  if (isRecord(bundleInput)) {
    return bundleInput;
  }
  if (typeof bundleInput !== "string" || !bundleInput.trim()) {
    throw new Error("Bundle payload is required.");
  }

  try {
    const parsed = JSON.parse(bundleInput);
    if (!isRecord(parsed)) {
      throw new Error("Bundle JSON must be an object.");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === "Bundle JSON must be an object."
        ? error.message
        : "Bundle is not valid JSON.",
    );
  }
}

function decodeBase64(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Bundle is missing ${label}.`);
  }
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new Error(`Bundle ${label} is not valid base64.`);
  }
}

export function createEncryptedExportBundle(store, passphrase, options = {}) {
  const normalizedPassphrase = requirePassphrase(passphrase);
  const snapshot = buildLocalAuthStore(store, { includeMaintenance: false });
  const payload = {
    createdAt: new Date().toISOString(),
    appVersion: typeof options.appVersion === "string" ? options.appVersion : undefined,
    store: snapshot,
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(normalizedPassphrase, salt);
  const cipher = createCipheriv(CIPHER_NAME, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    kind: EXPORT_BUNDLE_KIND,
    version: EXPORT_BUNDLE_VERSION,
    createdAt: payload.createdAt,
    cipher: CIPHER_NAME,
    kdf: {
      name: KDF_NAME,
      ...KDF_PARAMS,
      salt: salt.toString("base64"),
    },
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function readEncryptedExportBundle(bundleInput, passphrase) {
  const bundle = parseBundleInput(bundleInput);
  const normalizedPassphrase = requirePassphrase(passphrase);

  if (bundle.kind !== EXPORT_BUNDLE_KIND || bundle.version !== EXPORT_BUNDLE_VERSION) {
    throw new Error("Bundle format is not supported.");
  }
  if (bundle.cipher !== CIPHER_NAME) {
    throw new Error("Bundle cipher is not supported.");
  }
  if (!isRecord(bundle.kdf) || bundle.kdf.name !== KDF_NAME) {
    throw new Error("Bundle KDF is not supported.");
  }

  const salt = decodeBase64(bundle.kdf.salt, "kdf.salt");
  const iv = decodeBase64(bundle.iv, "iv");
  const tag = decodeBase64(bundle.tag, "tag");
  const ciphertext = decodeBase64(bundle.ciphertext, "ciphertext");
  const key = deriveKey(normalizedPassphrase, salt);

  try {
    const decipher = createDecipheriv(CIPHER_NAME, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(plaintext.toString("utf8"));
    if (!isRecord(payload) || !isRecord(payload.store)) {
      throw new Error("Bundle payload is invalid.");
    }
    return {
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : null,
      appVersion: typeof payload.appVersion === "string" ? payload.appVersion : null,
      store: buildLocalAuthStore(payload.store, { includeMaintenance: false }),
    };
  } catch {
    throw new Error("Passphrase is incorrect or bundle is corrupted.");
  }
}

export function bundleContainsPlaintext(bundleInput, snippet) {
  const bundle = parseBundleInput(bundleInput);
  const target = Buffer.from(typeof snippet === "string" ? snippet : "", "utf8");
  if (target.length === 0) {
    return false;
  }
  const haystack = Buffer.from(JSON.stringify(bundle), "utf8");
  if (haystack.length < target.length) {
    return false;
  }
  for (let index = 0; index <= haystack.length - target.length; index += 1) {
    if (timingSafeEqual(haystack.subarray(index, index + target.length), target)) {
      return true;
    }
  }
  return false;
}
