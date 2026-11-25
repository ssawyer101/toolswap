import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmt } from "@/lib/dates";
import { loanState, Thumb } from "@/components/bits";
import { LoanControls } from "@/components/LoanControls";
export const metadata = { title: "Loans" };

const ACTIVE = ["REQUESTED", "APPROVED", "OUT", "RETURNED"] as const;

export default async function Loans() {
  const u = await requireUser();
  const inc = { tool: { select: { id: true, name: true, category: true, photoVer: true } }, borrower: { select: { name: true } }, lender: { select: { name: true } }, _count: { select: { messages: true } } };
  const [borrowed, lent, history] = await Promise.all([
    db.loan.findMany({ where: { borrowerId: u.id, status: { in: [...ACTIVE] } }, include: inc, orderBy: { dueDate: "asc" } }),
    db.loan.findMany({ where: { lenderId: u.id, status: { in: [...ACTIVE] } }, include: inc, orderBy: [{ status: "asc" }, { dueDate: "asc" }] }),
    db.loan.findMany({ where: { OR: [{ borrowerId: u.id }, { lenderId: u.id }], status: { in: ["CLOSED", "DECLINED", "CANCELLED"] } }, include: inc, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  const Row = ({ l, side }: { l: (typeof borrowed)[number]; side: "b" | "l" }) => {
    const [label, cls] = loanState(l);
    return (
      <div className="tool">
        <Thumb tool={l.tool} />
        <div>
          <Link className="tname" href={`/loans/${l.id}`}>{l.tool.name}</Link>
          <div className="meta"><span>{side === "b" ? `From ${l.lender.name}` : `To ${l.borrower.name}`}</span><span className="money">{fmt(l.startDate)} → {fmt(l.dueDate)}</span></div>
          {l.needBy && <div className="meta"><span className="pill p-neutral">Owner set return date: {fmt(l.needBy)}</span></div>}
          {l.note && <div className="meta">“{l.note}”</div>}
          <div className="meta"><Link href={`/loans/${l.id}`}>{l._count.messages ? `${l._count.messages} message${l._count.messages > 1 ? "s" : ""}` : "Message"}{side === "b" ? " · ask for more time" : " · change return date"}</Link></div>
        </div>
        <div className="side"><span className={`pill ${cls}`}>{label}</span><LoanControls l={l} me={u.id} /></div>
      </div>
    );
  };
  return (
    <>
      <h1>Loans</h1>
      <p className="lede">Everything you've borrowed and lent. Reminders go out on their own 2 days before, on the due day, and when something's late, so nobody has to be the bad guy.</p>
      <h2>Borrowed by you</h2>
      <div className="list">{borrowed.length ? borrowed.map((l) => <Row key={l.id} l={l} side="b" />) : <div className="empty">You're not borrowing anything. <Link href="/search">Find a tool</Link></div>}</div>
      <h2>Lent from your garage</h2>
      <div className="list">{lent.length ? lent.map((l) => <Row key={l.id} l={l} side="l" />) : <div className="empty">None of your tools are out or requested.</div>}</div>
      {history.length > 0 && <>
        <h2>History</h2>
        <div className="box">{history.map((l) => { const [label, cls] = loanState(l); return (
          <Link key={l.id} href={`/loans/${l.id}`} className="li" style={{ textDecoration: "none", color: "inherit" }}>
            <div><b>{l.tool.name}</b> <span className="meta" style={{ display: "inline" }}>· {l.borrowerId === u.id ? `from ${l.lender.name}` : `to ${l.borrower.name}`} · {fmt(l.startDate)}</span></div>
            <span className={`pill ${cls}`}>{label}</span>
          </Link>); })}</div>
      </>}
    </>
  );
}
