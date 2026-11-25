"use server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function savePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const u = await requireUser();
  if (!sub?.endpoint?.startsWith("https://")) throw new Error("Bad subscription");
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: u.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId: u.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  await notify(u.id, "Notifications are on", "You'll get reminders and requests on this device.", "/notifications");
}

export async function removePush(endpoint: string) {
  const u = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: u.id } });
}

export async function markAllRead() {
  const u = await requireUser();
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
