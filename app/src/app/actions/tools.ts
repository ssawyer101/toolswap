"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, cleanUrl, myGroupIds } from "@/lib/access";
import type { FormState } from "./auth";

export async function saveTool(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const id = String(f.get("id") || "");
  const name = String(f.get("name") || "").trim();
  if (!name) return { error: "Give the tool a name." };
  const category = CATEGORIES.includes(String(f.get("category"))) ? String(f.get("category")) : "Other";
  const valueRaw = String(f.get("value") || "").replace(/[$,\s]/g, "");
  const value = valueRaw ? Math.max(0, Math.round(Number(valueRaw))) : null;
  if (valueRaw && !Number.isFinite(value)) return { error: "Value should be a number of dollars, like 120." };
  const linkIn = String(f.get("link") || "").trim(), videoIn = String(f.get("video") || "").trim();
  const link = cleanUrl(linkIn), video = cleanUrl(videoIn);
  if (linkIn && !link) return { error: "The product link doesn't look like a web address." };
  if (videoIn && !video) return { error: "The video link doesn't look like a web address." };

  const mine = await myGroupIds(u.id);
  const groupIds = f.getAll("groups").map(String).filter((g) => mine.includes(g));
  const data: any = {
    name, category, value, link, video,
    description: String(f.get("description") || "").trim() || null,
    tip: String(f.get("tip") || "").trim() || null,
  };
  const photo = f.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "The photo has to be an image file." };
    if (photo.size > 5e6) return { error: "That photo is too big. Try one under 5 MB." };
    data.photo = Buffer.from(await photo.arrayBuffer());
    data.photoType = photo.type;
    data.photoVer = { increment: 1 };
  } else if (f.get("removePhoto")) {
    data.photo = null; data.photoType = null;
  }

  if (id) {
    const t = await db.tool.findUnique({ where: { id } });
    if (!t || t.ownerId !== u.id) return { error: "You can only edit your own tools." };
    await db.tool.update({ where: { id }, data });
    await db.toolShare.deleteMany({ where: { toolId: id } });
    await db.toolShare.createMany({ data: groupIds.map((groupId) => ({ toolId: id, groupId })) });
  } else {
    await db.tool.create({ data: { ...data, photoVer: data.photo ? 1 : 0, ownerId: u.id, shares: { create: groupIds.map((groupId) => ({ groupId })) } } });
  }
  redirect("/garage");
}

export async function toggleShare(f: FormData) {
  const u = await requireUser();
  const toolId = String(f.get("toolId")), groupId = String(f.get("groupId"));
  const t = await db.tool.findUnique({ where: { id: toolId } });
  if (!t || t.ownerId !== u.id || !(await myGroupIds(u.id)).includes(groupId)) return;
  const key = { toolId_groupId: { toolId, groupId } };
  if (await db.toolShare.findUnique({ where: key })) await db.toolShare.delete({ where: key });
  else await db.toolShare.create({ data: { toolId, groupId } });
  revalidatePath("/garage");
}

export async function togglePause(f: FormData) {
  const u = await requireUser();
  const t = await db.tool.findUnique({ where: { id: String(f.get("id")) } });
  if (!t || t.ownerId !== u.id) return;
  await db.tool.update({ where: { id: t.id }, data: { paused: !t.paused } });
  revalidatePath("/garage");
}

export async function deleteTool(f: FormData) {
  const u = await requireUser();
  const t = await db.tool.findUnique({ where: { id: String(f.get("id")) } });
  if (!t || t.ownerId !== u.id) return;
  const busy = await db.loan.count({ where: { toolId: t.id, status: { in: ["APPROVED", "OUT", "RETURNED"] } } });
  if (busy) throw new Error("This tool is lent out or about to be. Finish that loan first.");
  // Keep loan history: hide the tool instead of erasing it.
  await db.$transaction([
    db.loan.updateMany({ where: { toolId: t.id, status: "REQUESTED" }, data: { status: "DECLINED" } }),
    db.toolShare.deleteMany({ where: { toolId: t.id } }),
    db.basketItem.deleteMany({ where: { toolId: t.id } }),
    db.tool.update({ where: { id: t.id }, data: { archived: true } }),
  ]);
  redirect("/garage");
}
