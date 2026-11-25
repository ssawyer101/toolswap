"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, hashToken, newToken, startSession, requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";

export type FormState = { error?: string; ok?: string } | undefined;
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function signup(_: FormState, f: FormData): Promise<FormState> {
  const name = String(f.get("name") || "").trim();
  const email = String(f.get("email") || "").trim().toLowerCase();
  const password = String(f.get("password") || "");
  const area = String(f.get("area") || "").trim() || null;
  if (!name) return { error: "Enter your name so friends know who you are." };
  if (!emailOk(email)) return { error: "That email address doesn't look right." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (await db.user.findUnique({ where: { email } })) return { error: "There's already an account with that email. Try logging in, or reset your password." };
  const u = await db.user.create({ data: { name, email, area, passwordHash: await bcrypt.hash(password, 11) } });
  await startSession(u.id);
  redirect(String(f.get("next") || "") || "/groups");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = String(f.get("email") || "").trim().toLowerCase();
  const password = String(f.get("password") || "");
  const u = await db.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return { error: "Email or password is wrong." };
  await startSession(u.id);
  const next = String(f.get("next") || "");
  redirect(next.startsWith("/") ? next : "/search");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function requestReset(_: FormState, f: FormData): Promise<FormState> {
  const email = String(f.get("email") || "").trim().toLowerCase();
  const u = await db.user.findUnique({ where: { email } });
  if (u) {
    const token = newToken();
    await db.passwordReset.create({ data: { id: hashToken(token), userId: u.id, expiresAt: new Date(Date.now() + 3600e3) } });
    const link = `${process.env.APP_URL || "http://localhost:3000"}/reset/${token}`;
    await sendEmail(u.email, "Reset your ToolSwap password",
      `Hi ${u.name},\n\nUse this link to choose a new password. It works for 1 hour:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`);
  }
  // Same answer either way, so nobody can use this form to find out who has an account.
  return { ok: "If that email has an account, a reset link is on its way. Check your inbox and spam folder." };
}

export async function resetPassword(_: FormState, f: FormData): Promise<FormState> {
  const token = String(f.get("token") || "");
  const password = String(f.get("password") || "");
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  const r = await db.passwordReset.findUnique({ where: { id: hashToken(token) } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return { error: "This reset link has expired or was already used. Ask for a new one." };
  await db.$transaction([
    db.user.update({ where: { id: r.userId }, data: { passwordHash: await bcrypt.hash(password, 11) } }),
    db.passwordReset.update({ where: { id: r.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: r.userId } }), // log out everywhere
  ]);
  await startSession(r.userId);
  redirect("/search");
}

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = String(f.get("name") || "").trim();
  if (!name) return { error: "Name can't be empty." };
  await db.user.update({ where: { id: u.id }, data: { name, area: String(f.get("area") || "").trim() || null } });
  return { ok: "Saved." };
}

export async function changePassword(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!(await bcrypt.compare(String(f.get("current") || ""), u.passwordHash))) return { error: "Your current password is wrong." };
  const pw = String(f.get("password") || "");
  if (pw.length < 8) return { error: "Use a password with at least 8 characters." };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(pw, 11) } });
  return { ok: "Password changed." };
}
