import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { createGroup, joinGroup } from "@/app/actions/groups";
export const metadata = { title: "Groups" };

export default async function Groups() {
  const u = await requireUser();
  const mems = await db.membership.findMany({
    where: { userId: u.id }, orderBy: { group: { name: "asc" } },
    include: { group: { include: { _count: { select: { memberships: { where: { status: "ACTIVE" } }, shares: true } } } } },
  });
  const active = mems.filter((m) => m.status === "ACTIVE"), pending = mems.filter((m) => m.status === "PENDING");
  return (
    <>
      <h1>Groups</h1>
      <p className="lede">A group is a circle of people you trust: your church, car club, riding crew, or street. Members only see the tools you choose to share with that group.</p>
      {active.length === 0 && <div className="empty" style={{ marginBottom: 16 }}>You&apos;re not in a group yet. Enter an invite code someone sent you, or start a group and invite people.</div>}
      <div className="grid2">
        {active.map((m) => (
          <Link key={m.id} href={`/groups/${m.groupId}`} className="panel" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="tname">{m.group.name}</div>
            <div className="meta"><span>{m.group._count.memberships} member{m.group._count.memberships === 1 ? "" : "s"}</span><span>{m.group._count.shares} tools shared</span>{m.role === "ADMIN" && <span className="pill p-accent">Admin</span>}</div>
          </Link>
        ))}
        {pending.map((m) => (
          <div key={m.id} className="panel"><div className="tname">{m.group.name}</div><div className="meta"><span className="pill p-warn">Waiting for an admin to let you in</span></div></div>
        ))}
      </div>
      <div className="grid2" style={{ marginTop: 20 }}>
        <ActionForm action={joinGroup} className="panel stack" resetOnOk>
          <div className="tname">Join with an invite code</div>
          <label className="f">Invite code<input id="code" name="code" required placeholder="HOTROD-1932" autoCapitalize="characters" /></label>
          <button className="primary">Ask to join</button>
        </ActionForm>
        <ActionForm action={createGroup} className="panel stack">
          <div className="tname">Start a new group</div>
          <label className="f">Group name<input id="gname" name="name" required placeholder="Maple Court neighbors" /></label>
          <button className="primary">Create group</button>
          <div className="meta">You get an invite code to text people. You approve each person who asks to join.</div>
        </ActionForm>
      </div>
    </>
  );
}
