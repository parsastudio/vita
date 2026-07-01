"use server";

import crypto from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { db } from "@/lib/db/server";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const pbkdf2Async = promisify(crypto.pbkdf2);

const SESSION_SECRET =
  process.env.SESSION_SECRET || "vita-space-default-secret-key-2026";

if (
  process.env.NODE_ENV === "production" &&
  SESSION_SECRET === "vita-space-default-secret-key-2026"
) {
  throw new Error("SESSION_SECRET must be configured in production!");
}

const ENCRYPTION_KEY = crypto.scryptSync(SESSION_SECRET, "salt", 32);
const IV_LENGTH = 12;

const authSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
});

async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await pbkdf2Async(password, salt, 100000, 64, "sha512");
  const hash = derivedKey.toString("hex");
  return { hash, salt };
}

async function verifyPassword(
  password: string,
  salt: string,
  hash: string,
): Promise<boolean> {
  const derivedKey = await pbkdf2Async(password, salt, 100000, 64, "sha512");
  const verifyHash = derivedKey.toString("hex");
  return verifyHash === hash;
}

function encryptSession(userId: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(userId, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + authTag + ":" + encrypted;
}

function decryptSession(sessionText: string): string | null {
  try {
    const parts = sessionText.split(":");
    if (parts.length < 3) return null;
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export async function signUpAction(email: string, password: string) {
  try {
    const lowerEmail = email.toLowerCase();
    const validation = authSchema.safeParse({ email: lowerEmail, password });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (existingUser) {
      return { success: false, error: "Email is already registered" };
    }

    const { hash, salt } = await hashPassword(password);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email: lowerEmail,
      passwordHash: `${salt}:${hash}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const sessionToken = encryptSession(userId);
    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return {
      success: true,
      user: { id: userId, email: lowerEmail },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function signInAction(email: string, password: string) {
  try {
    const lowerEmail = email.toLowerCase();
    const validation = authSchema.safeParse({ email: lowerEmail, password });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (!userRecord) {
      return { success: false, error: "Invalid email or password" };
    }

    const [salt, storedHash] = userRecord.passwordHash.split(":");
    const isMatch = await verifyPassword(password, salt, storedHash);
    if (!isMatch) {
      return { success: false, error: "Invalid email or password" };
    }

    const sessionToken = encryptSession(userRecord.id);
    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return {
      success: true,
      user: { id: userRecord.id, email: userRecord.email },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return {
      success: false,
      error: message,
    };
  }
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  return { success: true };
}

export async function getCurrentUserAction() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) return null;

    const userId = decryptSession(sessionToken);
    if (!userId) return null;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userRecord) return null;

    return {
      id: userRecord.id,
      email: userRecord.email,
    };
  } catch {
    return null;
  }
}
