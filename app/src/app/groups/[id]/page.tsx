import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { approveMember, makeAdmin, newInviteCode, removeMember } from "@/app/actions/groups";
import { ConfirmButton } from "@/components/Confirm";
import { CopyText } from "@/components/CopyText";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const me = await db.membership.findUnique({ where: { userId_groupId: { userId: u.id, groupId: id } } });
  if (!me || me.status !== "ACTIVE") notFound();
  const g = await db.group.findUniqueOrThrow({
    where: { id },
    include: { memberships: { include: { user: { select: { name: true, area: true, _count: { select: { tools: { where: { archived: false, shares: { some: { groupId: id } } } } } } } } }, orderBy: { createdAt: "asc" } } },
  });
  const admin = me.role === "ADMIN";
  const active = g.memberships.filter((m) => m.status === "ACTIVE"), pending = g.memberships.filter((m) => m.status === "PENDING");
  const myShared = await db.toolShare.count({ where: { groupId: id, tool: { ownerId: u.id, archived: false } } });
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><Link href="/groups">← Groups</Link></div>
      <div>
        <h1>{g.name}</h1>
        <div className="meta"><span>{active.length} members</span><span>You share {myShared} tool{myShared === 1 ? "" : "s"} here · <Link href="/garage">change</Link></span><Link href={`/search?g=${g.id}`}>Browse this group&apos;s tools</Link></div>
      </div>
      <div className="panel stack" style={{ gap: 8 }}>
        <div className="tname">Invite people</div>
        <div className="meta">Text or email them this code. They sign up, go to Groups and enter it{admin ? ", then you approve them" : ", then an admin approves them"}.</div>
        <CopyText text={g.inviteCode} />
        {admin && <form action={newInviteCode}><input type="hidden" name="id" value={g.id} /><button className="linklike" style={{ fontSize: 14 }}>Make a new code (the old one stops working)</button></form>}
      </div>
      {admin && pending.length > 0 && <>
        <h2>Waiting to join</h2>
        <div className="box">{pending.map((m) => (
          <div className="li" key={m.id}>
            <div><b>{m.user.name}</b>{m.user.area && <span className="meta" style={{ display: "inline" }}> · {m.user.area}</span>}</div>
            <div className="row">
              <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className="small">Turn down</button></form>
              <form action={approveMember}><input type="hidden" name="id" value={m.id} /><button className="small primary">Let in</button></form>
            </div>
          </div>))}</div>
      </>}
      <h2>Members</h2>
      <div className="box">{active.map((m) => (
        <div className="li" key={m.id}>
          <div><b>{m.userId === u.id ? "You" : m.user.name}</b> <span className="meta" style={{ display: "inline" }}>{m.user.area ? `· ${m.user.area} ` : ""}· {m.user._count.tools} tools shared</span> {m.role === "ADMIN" && <span className="pill p-accent">Admin</span>}</div>
          {admin && m.userId !== u.id && (
            <div className="row">
              {m.role !== "ADMIN" && <form action={makeAdmin}><input type="hidden" name="id" value={m.id} /><button className="small">Make admin</button></form>}
              <form action={removeMember}><input type="hidden" name="id" value={m.id} /><ConfirmButton label="Take out of group" confirm={`Take ${m.user.name.split(" ")[0]} out?`} className="small danger" /></form>
            </div>)}
        </div>))}</div>
      <form action={removeMember}><input type="hidden" name="id" value={me.id} /><ConfirmButton label="Leave this group" confirm="Leave? Your tools stop being shared here." className="small danger" /></form>
    </div>
  );
}
