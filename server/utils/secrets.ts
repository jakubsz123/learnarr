import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./dataDir";

/**
 * Read a key from the environment, else from `<DATA_DIR>/<name>.key`, creating it
 * on first use. A fresh install needs no environment variables, and a backup of
 * the data folder carries the keys with it.
 */
export function getOrCreateKey(name: "auth" | "encryption", envVar: string, dir = DATA_DIR): string {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;

  const file = path.join(dir, `${name}.key`);
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  fs.mkdirSync(dir, { recursive: true });
  const key = crypto.randomBytes(32).toString("hex");
  // "wx" so two processes starting at once can't both write a different key.
  try {
    fs.writeFileSync(file, key, { mode: 0o600, flag: "wx" });
    return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return fs.readFileSync(file, "utf8").trim();
    throw error;
  }
}

const PREFIX = "enc:v1:";

let cachedKey: Buffer | undefined;

function encryptionKey(): Buffer {
  cachedKey ??= crypto.scryptSync(getOrCreateKey("encryption", "ENCRYPTION_KEY"), "learnarr-secrets", 32);
  return cachedKey;
}

/** For tests: use a fixed key instead of the data folder's. */
export function setEncryptionKeyForTests(raw: string | undefined): void {
  cachedKey = raw === undefined ? undefined : crypto.scryptSync(raw, "learnarr-secrets", 32);
}

/** AES-256-GCM, as `enc:v1:<iv>:<tag>:<ciphertext>` in hex. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${data.toString("hex")}`;
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) throw new Error("Not an encrypted value");
  const [iv, tag, data] = value.slice(PREFIX.length).split(":");
  if (!iv || !tag || !data) throw new Error("Malformed encrypted value");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString("utf8");
}
