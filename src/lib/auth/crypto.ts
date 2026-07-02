import "server-only";
import crypto from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(crypto.pbkdf2);

export const SESSION_SECRET =
  process.env.SESSION_SECRET || "vita-space-default-secret-key-2026";

export const ENCRYPTION_KEY = crypto.scryptSync(SESSION_SECRET, "salt", 32);
export const IV_LENGTH = 12;

export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await pbkdf2Async(password, salt, 100000, 64, "sha512");
  const hash = derivedKey.toString("hex");
  return { hash, salt };
}

export async function verifyPassword(
  password: string,
  salt: string,
  hash: string,
): Promise<boolean> {
  const derivedKey = await pbkdf2Async(password, salt, 100000, 64, "sha512");
  const verifyHash = derivedKey.toString("hex");
  return verifyHash === hash;
}

export function encryptSession(userId: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(userId, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + authTag + ":" + encrypted;
}

export function decryptSession(sessionText: string): string | null {
  try {
    const parts = sessionText.split(":");
    if (parts.length < 3) return null;
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText).toString("utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export function checkRuntimeSecret() {
  if (
    process.env.NODE_ENV === "production" &&
    SESSION_SECRET === "vita-space-default-secret-key-2026"
  ) {
    throw new Error("SESSION_SECRET must be configured in production!");
  }
}
