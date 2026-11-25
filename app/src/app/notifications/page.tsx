import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { markAllRead } from "@/app/actions/push";
import { PushToggle } from "@/components/PushToggle";
export const metadata = { title: "Alerts" };

export default async function Notifications() {
  const u = await requireUser();
  const list = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = list.some((n) => !n.readAt);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Alerts</h1>
        {unread && <form action={markAllRead}><button className="small">Mark all as read</button></form>}
      </div>
      <p className="lede">Requests, approvals, messages and due-date reminders. Turn on notifications to get these on your phone too.</p>
      <div className="panel" style={{ marginBottom: 16 }}><PushToggle publicKey={process.env.VAPID_PUBLIC_KEY || ""} /></div>
      {list.length === 0 ? <div className="empty">Nothing yet.</div> : (
        <div className="box">{list.map((n) => (
          <Link key={n.id} href={n.url} className={`notif ${n.readAt ? "" : "unread"}`}>
            <div style={{ flex: 1, minWidth: 0 }}><b>{n.title}</b><div>{n.body}</div></div>
            <span className="when">{n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </Link>))}</div>
      )}
    </>
  );
}
