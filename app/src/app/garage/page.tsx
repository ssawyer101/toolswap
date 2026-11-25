import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { myGroupIds } from "@/lib/access";
import { loanState, Thumb } from "@/components/bits";
import { togglePause, toggleShare } from "@/app/actions/tools";
export const metadata = { title: "My garage" };

export default async function Garage() {
  const u = await requireUser();
  const gids = await myGroupIds(u.id);
  const [groups, tools] = await Promise.all([
    db.group.findMany({ where: { id: { in: gids } }, orderBy: { name: "asc" } }),
    db.tool.findMany({
      where: { ownerId: u.id, archived: false }, orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, value: true, paused: true, photoVer: true, shares: { select: { groupId: true } },
        loans: { where: { status: { in: ["APPROVED", "OUT", "RETURNED"] } }, include: { borrower: { select: { name: true } } }, orderBy: { startDate: "asc" }, take: 1 } },
    }),
  ]);
  const total = tools.reduce((s, t) => s + (t.value || 0), 0);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>My garage</h1>
        <Link className="btn primary" href="/garage/new">Add a tool</Link>
      </div>
      <p className="lede">{tools.length} tool{tools.length === 1 ? "" : "s"}{total ? `, about $${total.toLocaleString()} in value` : ""}. The squares choose which groups can see each tool. A tool with no squares filled stays private.</p>
      {tools.length === 0 ? <div className="empty">Your garage is empty. <Link href="/garage/new">Add your first tool</Link>. A photo and a &quot;good to know&quot; note make people more comfortable borrowing.</div> : (
        <div className="matrix"><table>
          <thead><tr><th>Tool</th>{groups.map((g) => <th key={g.id} className="c">{g.name}</th>)}<th>Status</th></tr></thead>
          <tbody>{tools.map((t) => {
            const l = t.loans[0], shared = new Set(t.shares.map((s) => s.groupId));
            return (
              <tr key={t.id}>
                <td><div className="row" style={{ flexWrap: "nowrap" }}><Thumb tool={t} /><div>
                  <Link className="tname" style={{ fontSize: 15 }} href={`/garage/${t.id}`}>{t.name}</Link>
                  <div className="meta">{t.value != null && <span className="money">${t.value}</span>}<span>{shared.size ? `${shared.size} group${shared.size > 1 ? "s" : ""}` : "Private"}</span></div>
                </div></div></td>
                {groups.map((g) => (
                  <td key={g.id} className="c">
                    <form action={toggleShare}><input type="hidden" name="toolId" value={t.id} /><input type="hidden" name="groupId" value={g.id} />
                      <button className={`sq ${shared.has(g.id) ? "on" : ""}`} aria-pressed={shared.has(g.id)} aria-label={`${shared.has(g.id) ? "Stop sharing" : "Share"} ${t.name} with ${g.name}`}>{shared.has(g.id) ? "✓" : ""}</button>
                    </form>
                  </td>))}
                <td><div className="stack" style={{ gap: 6, alignItems: "flex-start" }}>
                  {l ? <span className={`pill ${loanState(l)[1]}`}>{l.status === "APPROVED" ? `Promised to ${l.borrower.name.split(" ")[0]}` : `Out with ${l.borrower.name.split(" ")[0]}`}</span>
                    : t.paused ? <span className="pill p-neutral">Paused</span> : <span className="pill p-ok">In garage</span>}
                  <form action={togglePause}><input type="hidden" name="id" value={t.id} /><button className="linklike" style={{ fontSize: 13 }}>{t.paused ? "Start lending again" : "Pause lending"}</button></form>
                </div></td>
              </tr>);
          })}</tbody>
        </table></div>
      )}
      {groups.length === 0 && tools.length > 0 && <p className="meta" style={{ marginTop: 12 }}>Join or start a <Link href="/groups">group</Link> to share these.</p>}
    </>
  );
}
