import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { myGroupIds } from "@/lib/access";
import { fmt, today } from "@/lib/dates";
import { Links, Thumb, Tip } from "@/components/bits";
import { toggleBasket } from "@/app/actions/loans";
import { PushToggle } from "@/components/PushToggle";
export const metadata = { title: "Find tools" };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; g?: string }> }) {
  const u = await requireUser();
  const { q = "", g = "" } = await searchParams;
  const gids = await myGroupIds(u.id);
  if (!gids.length) return (
    <>
      <h1>Find a tool</h1>
      <div className="empty">You're not in any groups yet, so there's nothing to borrow. <Link href="/groups">Join a group with an invite code</Link> or start your own.</div>
    </>
  );
  const groups = await db.group.findMany({ where: { id: { in: gids } }, orderBy: { name: "asc" } });
  const active = g && gids.includes(g) ? [g] : gids;
  const words = q.trim().split(/\s+/).filter(Boolean);
  const tools = await db.tool.findMany({
    where: {
      archived: false, ownerId: { not: u.id },
      shares: { some: { groupId: { in: active } } },
      AND: words.map((w) => ({ OR: [{ name: { contains: w, mode: "insensitive" as const } }, { category: { contains: w, mode: "insensitive" as const } }, { description: { contains: w, mode: "insensitive" as const } }] })),
    },
    select: {
      id: true, name: true, category: true, value: true, tip: true, link: true, video: true, paused: true, photoVer: true,
      owner: { select: { name: true, area: true } },
      shares: { where: { groupId: { in: active } }, select: { group: { select: { name: true } } } },
      loans: { where: { status: { in: ["APPROVED", "OUT", "RETURNED"] }, dueDate: { gte: today() } }, orderBy: { startDate: "asc" }, take: 1, select: { startDate: true, dueDate: true, status: true } },
      basket: { where: { userId: u.id }, select: { userId: true } },
    },
    orderBy: [{ name: "asc" }],
    take: 200,
  });
  const qs = (gg: string) => `/search?${new URLSearchParams({ ...(q && { q }), ...(gg && { g: gg }) })}`;
  return (
    <>
      <h1>Find a tool</h1>
      <p className="lede">You only see tools that people chose to share with groups you're in. Add what you need to your basket, and it shows who can cover the most in one trip.</p>
      <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY || ""} compact />
      <form className="row" style={{ marginBottom: 10 }}>
        {g && <input type="hidden" name="g" value={g} />}
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search, like jack stands or drill" aria-label="Search tools" style={{ flex: 1, minWidth: 200 }} />
        <button type="submit">Search</button>
      </form>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link className={`chip ${!g ? "on" : ""}`} href={qs("")}>All my groups</Link>
        {groups.map((x) => <Link key={x.id} className={`chip ${g === x.id ? "on" : ""}`} href={qs(x.id)}>{x.name}</Link>)}
      </div>
      <div className="list">
        {tools.length === 0 && <div className="empty">{q ? `Nothing matches "${q}". Try a shorter word, or check all groups.` : "Nobody has shared tools with your groups yet. Be the first: add tools to your garage."}</div>}
        {tools.map((t) => {
          const busy = t.loans[0], inBasket = t.basket.length > 0;
          const now = busy && +busy.startDate <= +today();
          return (
            <div className="tool" key={t.id}>
              <Thumb tool={t} />
              <div>
                <Link className="tname" href={`/tools/${t.id}`}>{t.name}</Link>
                <div className="meta"><span>{t.owner.name}{t.owner.area ? ` · ${t.owner.area}` : ""}</span><span>via {t.shares.map((s) => s.group.name).join(", ")}</span></div>
                <Tip text={t.tip} />
                <Links link={t.link} video={t.video} />
              </div>
              <div className="side">
                {t.value != null && <span className="money">Value ${t.value.toLocaleString()}</span>}
                {t.paused ? <span className="pill p-neutral">Not lending right now</span>
                  : busy ? <span className="pill p-warn">{now ? `Out until ${fmt(busy.dueDate)}` : `Booked ${fmt(busy.startDate)}–${fmt(busy.dueDate)}`}</span>
                  : <span className="pill p-ok">Available</span>}
                {!t.paused && (
                  <form action={toggleBasket}><input type="hidden" name="toolId" value={t.id} />
                    <button className={`small ${inBasket ? "" : "primary"}`}>{inBasket ? "In basket ✓" : "Add to basket"}</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
