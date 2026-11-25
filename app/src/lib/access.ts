import "server-only";
import { db } from "./db";

/** Group ids where this person is an active member. */
export async function myGroupIds(userId: string) {
  const m = await db.membership.findMany({ where: { userId, status: "ACTIVE" }, select: { groupId: true } });
  return m.map((x) => x.groupId);
}

/** A tool is visible to someone if they own it, or it's shared with a group they're an active member of. */
export async function canSeeTool(userId: string, toolId: string) {
  const t = await db.tool.findUnique({ where: { id: toolId }, include: { shares: true } });
  if (!t || t.archived) return null;
  if (t.ownerId === userId) return t;
  const gids = await myGroupIds(userId);
  return t.shares.some((s) => gids.includes(s.groupId)) ? t : null;
}

/** Loans that keep a tool busy over a date range. */
export async function conflicts(toolId: string, start: Date, end: Date, excludeLoanId?: string) {
  return db.loan.findMany({
    where: {
      toolId, id: excludeLoanId ? { not: excludeLoanId } : undefined,
      status: { in: ["APPROVED", "OUT", "RETURNED"] },
      startDate: { lte: end }, dueDate: { gte: start },
    },
  });
}

export const CATEGORIES = ["Power tools", "Hand tools", "Automotive", "Outdoor & yard", "Ladders", "Welding", "Plumbing", "Electrical", "Cleaning", "Painting", "Event & party", "Camping", "Other"];

/** Groups similar tools ("Jack stands (pair)" and "Jack stands, 3 ton") so the basket can count coverage. */
export function needKey(name: string) {
  return name.toLowerCase().split(/[,(\-–]/)[0].replace(/[^a-z ]/g, " ").replace(/\b(\d+|pair|set|of|the|a|an|cordless|electric)\b/g, " ").trim().replace(/\s+/g, " ");
}

export function inviteCode(name: string) {
  const word = (name.toUpperCase().match(/[A-Z]+/g) || ["GROUP"])[0].slice(0, 8);
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function cleanUrl(s: FormDataEntryValue | null) {
  const v = String(s || "").trim();
  if (!v) return null;
  try { const u = new URL(/^https?:\/\//i.test(v) ? v : "https://" + v); return u.protocol.startsWith("http") ? u.toString() : null; }
  catch { return null; }
}
