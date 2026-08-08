"use server";

import "server-only";
import { db } from "@/lib/db/server";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  hashPassword,
  encryptSession,
  checkRuntimeSecret,
} from "@/lib/auth/crypto";
import { authSchema } from "@/lib/auth/schemas";

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
