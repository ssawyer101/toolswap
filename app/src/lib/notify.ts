import "server-only";
import * as webpush from "web-push";
import { db } from "./db";

let configured = false;
function setup() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_CONTACT: contact } = process.env;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact || "mailto:admin@example.com", pub, priv);
  return (configured = true);
}

/** Saves an in-app notification and pushes it to every device the person turned notifications on for. */
export async function notify(userId: string, title: string, body: string, url: string) {
  await db.notification.create({ data: { userId, title, body, url } });
  if (!setup()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({ title, body, url });
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
    } catch (e: any) {
      // 404/410 mean the device unsubscribed or the browser data was cleared.
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      else console.error("Push failed", e?.statusCode, e?.body);
    }
  }));
}
