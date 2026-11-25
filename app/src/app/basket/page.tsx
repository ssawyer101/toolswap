import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { needKey } from "@/lib/access";
import { addDays, dayStr, fmt, today } from "@/lib/dates";
import { Thumb } from "@/components/bits";
import { ActionForm } from "@/components/ActionForm";
import { sendRequest, toggleBasket } from "@/app/actions/loans";
export const metadata = { title: "Basket" };

export default async function Basket() {
  const u = await requireUser();
  const items = await db.basketItem.findMany({
    where: { userId: u.id, tool: { archived: false } },
    include: { tool: { select: { id: true, name: true, category: true, photoVer: true, ownerId: true, owner: { select: { name: true, area: true } },
      loans: { where: { status: { in: ["APPROVED", "OUT", "RETURNED"] }, dueDate: { gte: today() } }, select: { startDate: true, dueDate: true }, orderBy: { startDate: "asc" } } } } },
  });
  if (!items.length) return (
    <>
      <h1>Basket</h1>
      <div className="empty">Your basket is empty. <Link href="/search">Find tools</Link> and add them here.<br /><br />
        Tip: if two people both have jack stands, add both. The basket then shows which single trip covers the most of your list.</div>
    </>
  );
  const needs = [...new Set(items.map((i) => needKey(i.tool.name)))];
  const by = new Map<string, typeof items>();
  for (const i of items) by.set(i.tool.ownerId, [...(by.get(i.tool.ownerId) || []), i]);
  const lenders = [...by.entries()].map(([id, its]) => ({ id, its, owner: its[0].tool.owner, covers: new Set(its.map((i) => needKey(i.tool.name))).size }))
    .sort((a, b) => b.covers - a.covers || b.its.length - a.its.length);
  const top = lenders[0].covers;
  const start = dayStr(addDays(today(), 1)), due = dayStr(addDays(today(), 7));
  return (
    <>
      <h1>Basket</h1>
      <p className="lede">You're looking for {needs.length} kind{needs.length > 1 ? "s" : ""} of tool. Lenders are sorted by how much of your list they can cover, so you can make the fewest trips. Remove the duplicates you don't need, then send each lender a request.</p>
      <div className="list">
        {lenders.map((L) => {
          const best = lenders.length > 1 && L.covers === top;
          return (
            <div className={`box ${best ? "best" : ""}`} key={L.id}>
              <div className="box-head">
                <div>
                  <div className="tname">{L.owner.name}</div>
                  {L.owner.area && <div className="meta">{L.owner.area}</div>}
                  <div className="meter" aria-label={`Covers ${L.covers} of ${needs.length}`}>{needs.map((_, k) => <i key={k} className={k < L.covers ? "f" : ""} />)}</div>
                </div>
                <div className="side">{best && <span className="pill p-accent">Fewest trips</span>}<span className="meta">Covers {L.covers} of {needs.length}</span></div>
              </div>
              {L.its.map(({ tool: t }) => (
                <div className="li" key={t.id}>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <Thumb tool={t} />
                    <div><Link className="tname" style={{ fontSize: 15 }} href={`/tools/${t.id}`}>{t.name}</Link>
                      {t.loans.length > 0 && <div className="meta">Booked: {t.loans.map((l) => `${fmt(l.startDate)}–${fmt(l.dueDate)}`).join(", ")}</div>}</div>
                  </div>
                  <form action={toggleBasket}><input type="hidden" name="toolId" value={t.id} /><button className="small">Remove</button></form>
                </div>
              ))}
              <div className="foot">
                <ActionForm action={sendRequest} className="form">
                  <input type="hidden" name="lenderId" value={L.id} />
                  <label className="f">Pick up<input type="date" name="start" id={`start-${L.id}`} defaultValue={start} min={dayStr(today())} required /></label>
                  <label className="f">Return by<input type="date" name="due" id={`due-${L.id}`} defaultValue={due} min={dayStr(today())} required /></label>
                  <label className="f full">Note to {L.owner.name.split(" ")[0]} <small>Optional</small><input name="note" id={`note-${L.id}`} placeholder="What it's for, when you could swing by" /></label>
                  <div className="full"><button className="primary">Send request to {L.owner.name.split(" ")[0]}</button></div>
                </ActionForm>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
