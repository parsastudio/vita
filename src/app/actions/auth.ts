"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db/server";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "vita-space-default-secret-key-2026";
const ENCRYPTION_KEY = crypto.scryptSync(SESSION_SECRET, "salt", 32);
const IV_LENGTH = 16;

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return verifyHash === hash;
}

function encryptSession(userId: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(userId, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptSession(sessionText: string): string | null {
  try {
    const parts = sessionText.split(":");
    const iv = Buffer.from(parts.shift() || "", "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export async function signUpAction(email: string, password: string) {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return { success: false, error: "Email is already registered" };
    }

    const { hash, salt } = hashPassword(password);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email,
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
      user: { id: userId, email },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred",
    };
  }
}

export async function signInAction(email: string, password: string) {
  try {
    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!userRecord) {
      return { success: false, error: "Invalid email or password" };
    }

    const [salt, storedHash] = userRecord.passwordHash.split(":");
    if (!verifyPassword(password, salt, storedHash)) {
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
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred",
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
