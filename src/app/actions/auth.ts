"use server";

import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db/server";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  hashPassword,
  verifyPassword,
  encryptSession,
  decryptSession,
  checkRuntimeSecret,
} from "@/lib/auth/crypto";
import { authSchema } from "@/lib/auth/schemas";

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
