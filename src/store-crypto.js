/**
 * Row-level passphrase encryption for cloud-synced credentials.
 *
 * Shares the same AES-256-GCM + scrypt parameters as src/auth-bundle.js so the
 * dashboard's existing export passphrase can double as the cloud store
 * passphrase. Each encrypted row carries its own salt + iv because D1 rows are
 * updated independently.
 *
 * The produced payload format is JSON:
 *   { v: 1, iv, salt, tag, ct }  all base64
 * When stored in the `profiles` table we split salt/iv into separate columns
 * (so they are easy to observe) and keep tag+ct in the blob itself.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const CIPHER = "aes-256-gcm";
const KEY_LENGTH = 32;
const KDF_PARAMS = { cost: 16_384, blockSize: 8, parallelization: 1 };

export class StoreCryptoError extends Error {
  constructor(message) {
    super(message);
    this.name = "StoreCryptoError";
  }
}

function requireNonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new StoreCryptoError(`${label} is required.`);
  }
  return value;
}

function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, KEY_LENGTH, {
    N: KDF_PARAMS.cost,
    r: KDF_PARAMS.blockSize,
    p: KDF_PARAMS.parallelization,
  });
}

/**
 * Encrypt a JSON-serializable value with the given passphrase.
 * Returns { ciphertext, iv, salt, tag } — all base64 strings.
 */
export function encryptJsonValue(value, passphrase) {
  requireNonEmpty(passphrase, "passphrase");
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv(CIPHER, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt the output of encryptJsonValue. Throws StoreCryptoError on bad
 * passphrase / corrupt payload.
 */
export function decryptJsonValue({ ciphertext, iv, salt, tag }, passphrase) {
  requireNonEmpty(passphrase, "passphrase");
  try {
    const ivBuf = Buffer.from(requireNonEmpty(iv, "iv"), "base64");
    const saltBuf = Buffer.from(requireNonEmpty(salt, "salt"), "base64");
    const tagBuf = Buffer.from(requireNonEmpty(tag, "tag"), "base64");
    const ctBuf = Buffer.from(requireNonEmpty(ciphertext, "ciphertext"), "base64");
    const key = deriveKey(passphrase, saltBuf);
    const decipher = createDecipheriv(CIPHER, key, ivBuf);
    decipher.setAuthTag(tagBuf);
    const plaintext = Buffer.concat([decipher.update(ctBuf), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch (error) {
    if (error instanceof StoreCryptoError) {
      throw error;
    }
    throw new StoreCryptoError("Passphrase is incorrect or encrypted payload is corrupted.");
  }
}

/**
 * Serialize a credential for D1 storage.
 *  - When passphrase is a non-empty string, encrypt the full credential and
 *    produce `{ blob: ciphertext+tag JSON, iv, salt, isEncrypted: true }`.
 *  - When passphrase is null/empty, produce a plaintext JSON blob with
 *    `isEncrypted: false`. We warn callers at the boundary if they are
 *    shipping plaintext secrets to D1.
 */
export function serializeCredentialForRemote(credential, passphrase) {
  if (typeof passphrase === "string" && passphrase.trim()) {
    const { ciphertext, iv, salt, tag } = encryptJsonValue(credential, passphrase);
    return {
      blob: JSON.stringify({ v: 1, ct: ciphertext, tag }),
      iv,
      salt,
      isEncrypted: true,
    };
  }
  return {
    blob: JSON.stringify(credential),
    iv: null,
    salt: null,
    isEncrypted: false,
  };
}

/**
 * Inverse of serializeCredentialForRemote.
 */
export function deserializeCredentialFromRemote({ blob, iv, salt, isEncrypted }, passphrase) {
  if (typeof blob !== "string" || !blob) {
    throw new StoreCryptoError("blob is required.");
  }
  if (isEncrypted) {
    if (!passphrase) {
      throw new StoreCryptoError("Encrypted credential requires a store passphrase to decrypt.");
    }
    let parsed;
    try {
      parsed = JSON.parse(blob);
    } catch {
      throw new StoreCryptoError("Encrypted blob is not valid JSON.");
    }
    if (!parsed || typeof parsed.ct !== "string" || typeof parsed.tag !== "string") {
      throw new StoreCryptoError("Encrypted blob is missing ct/tag.");
    }
    return decryptJsonValue({
      ciphertext: parsed.ct,
      iv,
      salt,
      tag: parsed.tag,
    }, passphrase);
  }
  try {
    return JSON.parse(blob);
  } catch {
    throw new StoreCryptoError("Plaintext blob is not valid JSON.");
  }
}
