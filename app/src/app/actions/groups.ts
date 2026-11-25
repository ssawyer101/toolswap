"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inviteCode } from "@/lib/access";
import { notify } from "@/lib/notify";
import type { FormState } from "./auth";

async function adminOf(userId: string, groupId: string) {
  const m = await db.membership.findUnique({ where: { userId_groupId: { userId, groupId } } });
  if (!m || m.role !== "ADMIN" || m.status !== "ACTIVE") throw new Error("Only group admins can do that.");
}

export async function createGroup(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = String(f.get("name") || "").trim();
  if (!name) return { error: "Give the group a name." };
  let code = inviteCode(name);
  while (await db.group.findUnique({ where: { inviteCode: code } })) code = inviteCode(name);
  const g = await db.group.create({ data: { name, inviteCode: code, memberships: { create: { userId: u.id, role: "ADMIN", status: "ACTIVE" } } } });
  redirect(`/groups/${g.id}`);
}

export async function joinGroup(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const code = String(f.get("code") || "").trim().toUpperCase();
  const g = await db.group.findUnique({ where: { inviteCode: code }, include: { memberships: { where: { role: "ADMIN" } } } });
  if (!g) return { error: "No group has that invite code. Check it with the person who sent it." };
  const existing = await db.membership.findUnique({ where: { userId_groupId: { userId: u.id, groupId: g.id } } });
  if (existing) return { ok: existing.status === "ACTIVE" ? `You're already in ${g.name}.` : `Your request to join ${g.name} is waiting for approval.` };
  await db.membership.create({ data: { userId: u.id, groupId: g.id } });
  for (const a of g.memberships) await notify(a.userId, "Request to join", `${u.name} wants to join ${g.name}.`, `/groups/${g.id}`);
  revalidatePath("/groups");
  return { ok: `Request sent. An admin of ${g.name} needs to approve you.` };
}

export async function approveMember(f: FormData) {
  const u = await requireUser();
  const m = await db.membership.findUniqueOrThrow({ where: { id: String(f.get("id")) }, include: { group: true } });
  await adminOf(u.id, m.groupId);
  await db.membership.update({ where: { id: m.id }, data: { status: "ACTIVE" } });
  await notify(m.userId, "You're in", `You've joined ${m.group.name}. Add some tools to share with them.`, `/groups/${m.groupId}`);
  revalidatePath(`/groups/${m.groupId}`);
}

export async function removeMember(f: FormData) {
  const u = await requireUser();
  const m = await db.membership.findUniqueOrThrow({ where: { id: String(f.get("id")) } });
  if (m.userId !== u.id) await adminOf(u.id, m.groupId);
  if (m.role === "ADMIN") {
    const admins = await db.membership.count({ where: { groupId: m.groupId, role: "ADMIN", status: "ACTIVE" } });
    const others = await db.membership.count({ where: { groupId: m.groupId, status: "ACTIVE", id: { not: m.id } } });
    if (admins <= 1 && others > 0) throw new Error("Make someone else an admin before you leave.");
  }
  await db.membership.delete({ where: { id: m.id } });
  // Their tools stop being shared with this group.
  await db.toolShare.deleteMany({ where: { groupId: m.groupId, tool: { ownerId: m.userId } } });
  if (m.userId === u.id) redirect("/groups");
  revalidatePath(`/groups/${m.groupId}`);
}

export async function makeAdmin(f: FormData) {
  const u = await requireUser();
  const m = await db.membership.findUniqueOrThrow({ where: { id: String(f.get("id")) } });
  await adminOf(u.id, m.groupId);
  await db.membership.update({ where: { id: m.id }, data: { role: "ADMIN" } });
  revalidatePath(`/groups/${m.groupId}`);
}

export async function newInviteCode(f: FormData) {
  const u = await requireUser();
  const g = await db.group.findUniqueOrThrow({ where: { id: String(f.get("id")) } });
  await adminOf(u.id, g.id);
  await db.group.update({ where: { id: g.id }, data: { inviteCode: inviteCode(g.name) } });
  revalidatePath(`/groups/${g.id}`);
}
