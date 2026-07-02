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

const ENCRYPTION_KEY = crypto.scryptSync(SESSION_SECRET, "salt", 32);
const IV_LENGTH = 12;

const authSchema = z.object({
  email: z.string().email("فرمت آدرس ایمیل وارد شده معتبر نیست").max(255),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل حاوی ۸ کاراکتر باشد")
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
    let decrypted = decipher.update(encryptedText).toString("utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

function checkRuntimeSecret() {
  if (
    process.env.NODE_ENV === "production" &&
    SESSION_SECRET === "vita-space-default-secret-key-2026"
  ) {
    throw new Error("SESSION_SECRET must be configured in production!");
  }
}

export async function signUpAction(email: string, password: string) {
  try {
    checkRuntimeSecret();
    const lowerEmail = email.toLowerCase();
    const validation = authSchema.safeParse({ email: lowerEmail, password });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (existingUser) {
      return { success: false, error: "این آدرس ایمیل قبلاً ثبت‌نام شده است" };
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
      err instanceof Error ? err.message : "یک خطای غیرمنتظره رخ داده است";
    return {
      success: false,
      error: message,
    };
  }
}

export async function signInAction(email: string, password: string) {
  try {
    checkRuntimeSecret();
    const lowerEmail = email.toLowerCase();
    const validation = authSchema.safeParse({ email: lowerEmail, password });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (!userRecord) {
      return { success: false, error: "آدرس ایمیل یا رمز عبور اشتباه است" };
    }

    const [salt, storedHash] = userRecord.passwordHash.split(":");
    const isMatch = await verifyPassword(password, salt, storedHash);
    if (!isMatch) {
      return { success: false, error: "آدرس ایمیل یا رمز عبور اشتباه است" };
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
      err instanceof Error ? err.message : "یک خطای غیرمنتظره رخ داده است";
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

export async function requestPasswordResetAction(email: string) {
  try {
    checkRuntimeSecret();
    const lowerEmail = email.toLowerCase();
    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (!userRecord) {
      return { success: true };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db
      .update(users)
      .set({
        resetToken: code,
        resetTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRecord.id));

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY limits. Active recovery code:", code);
      return {
        success: false,
        error: "سرویس ارسال ایمیل در محیط محلی پیکربندی نشده است",
      };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vita Kit <onboarding@resend.dev>",
        to: lowerEmail,
        subject: "بازیابی رمز عبور - ویتا ",
        html: `
          <div dir="rtl" style="font-family: Tahoma, Geneva, sans-serif; text-align: right; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
            <h2 style="color: #8B5CF6; font-size: 20px; margin-bottom: 16px;">بازیابی رمز عبور ویتا</h2>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">کد یکبار مصرف بازیابی رمز عبور شما در ویتابرابر است با:</p>
            <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #8B5CF6; margin: 24px 0;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 16px;">این کد به مدت ۱۵ دقیقه معتبر است. اگر شما این درخواست را ارسال نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        error: "خطا در برقراری ارتباط با درگاه ارسال ایمیل",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطای غیرمنتظره در سرور",
    };
  }
}

export async function resetPasswordWithCodeAction(
  email: string,
  code: string,
  newPassword: string,
) {
  try {
    checkRuntimeSecret();
    const lowerEmail = email.toLowerCase();
    const validation = authSchema.safeParse({
      email: lowerEmail,
      password: newPassword,
    });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (
      !userRecord ||
      !userRecord.resetToken ||
      !userRecord.resetTokenExpiresAt
    ) {
      return { success: false, error: "کد بازیابی نامعتبر یا منقضی شده است" };
    }

    const now = new Date();
    if (
      userRecord.resetToken !== code ||
      userRecord.resetTokenExpiresAt < now
    ) {
      return { success: false, error: "کد بازیابی نامعتبر یا منقضی شده است" };
    }

    const { hash, salt } = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: `${salt}:${hash}`,
        resetToken: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRecord.id));

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
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطای غیرمنتظره رخ داده است",
    };
  }
}

export async function updateAccountAction(
  newEmail?: string,
  currentPassword?: string,
  newPassword?: string,
) {
  try {
    const sessionUser = await getCurrentUserAction();
    if (!sessionUser) {
      return { success: false, error: "شما وارد حساب کاربری خود نشده‌اید" };
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, sessionUser.id),
    });

    if (!userRecord) {
      return { success: false, error: "کاربر پیدا نشد" };
    }

    const updateFields: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (newEmail) {
      const lowerEmail = newEmail.toLowerCase();
      const emailValidation = z
        .string()
        .email("فرمت آدرس ایمیل وارد شده معتبر نیست")
        .max(255)
        .safeParse(lowerEmail);
      if (!emailValidation.success) {
        return {
          success: false,
          error: emailValidation.error.issues[0].message,
        };
      }

      if (lowerEmail !== userRecord.email) {
        const emailTaken = await db.query.users.findFirst({
          where: eq(users.email, lowerEmail),
        });
        if (emailTaken) {
          return {
            success: false,
            error: "این آدرس ایمیل توسط کاربر دیگری استفاده شده است",
          };
        }
        updateFields.email = lowerEmail;
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return {
          success: false,
          error: "برای تغییر رمز عبور، وارد کردن رمز عبور فعلی الزامی است",
        };
      }

      const passwordValidation = z
        .string()
        .min(8, "رمز عبور باید حداقل حاوی ۸ کاراکتر باشد")
        .max(100)
        .safeParse(newPassword);
      if (!passwordValidation.success) {
        return {
          success: false,
          error: passwordValidation.error.issues[0].message,
        };
      }

      const [salt, storedHash] = userRecord.passwordHash.split(":");
      const isMatch = await verifyPassword(currentPassword, salt, storedHash);
      if (!isMatch) {
        return { success: false, error: "رمز عبور فعلی اشتباه است" };
      }

      const { hash, salt: newSalt } = await hashPassword(newPassword);
      updateFields.passwordHash = `${newSalt}:${hash}`;
    }

    if (Object.keys(updateFields).length > 1) {
      await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, userRecord.id));
      return { success: true };
    }

    return { success: false, error: "تغییری برای اعمال ارسال نشده است" };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطای غیرمنتظره رخ داده است",
    };
  }
}
