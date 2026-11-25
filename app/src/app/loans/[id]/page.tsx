import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmt } from "@/lib/dates";
import { Links, loanState, Thumb, Tip } from "@/components/bits";
import { LoanControls } from "@/components/LoanControls";
import { ActionForm } from "@/components/ActionForm";
import { sendMessage } from "@/app/actions/loans";
export const metadata = { title: "Loan" };

export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const l = await db.loan.findUnique({
    where: { id },
    include: {
      tool: { select: { id: true, name: true, category: true, photoVer: true, tip: true, link: true, video: true, value: true } },
      borrower: { select: { name: true, area: true } }, lender: { select: { name: true, area: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!l || (l.borrowerId !== u.id && l.lenderId !== u.id)) notFound();
  const iBorrow = l.borrowerId === u.id;
  const other = iBorrow ? l.lender : l.borrower;
  const [label, cls] = loanState(l);
  const steps: [string, Date | null][] = [["Requested", l.createdAt], ["Picked up", l.pickedUpAt], ["Returned", l.returnedAt], ["Owner confirmed", l.closedAt]];
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><Link href="/loans">← All loans</Link></div>
      <div className="tool">
        <Thumb tool={l.tool} />
        <div>
          <h1 style={{ fontSize: 28 }}>{l.tool.name}</h1>
          <div className="meta"><span>{iBorrow ? `Borrowing from ${other.name}` : `Lent to ${other.name}`}{other.area ? ` · ${other.area}` : ""}</span>{l.tool.value != null && <span className="money">Value ${l.tool.value}</span>}</div>
          <div className="meta"><span className="money">Pick up {fmt(l.startDate)} · Return by {fmt(l.dueDate)}</span></div>
          {l.note && <div className="meta">Request note: “{l.note}”</div>}
          {l.returnNote && <div className="meta">Return note: “{l.returnNote}”</div>}
          {iBorrow && <Tip text={l.tool.tip} />}
          {iBorrow && <Links link={l.tool.link} video={l.tool.video} />}
        </div>
        <div className="side"><span className={`pill ${cls}`}>{label}</span></div>
      </div>
      <LoanControls l={l} me={u.id} full />
      <div className="row" style={{ gap: 18 }}>
        {steps.map(([s, d]) => <span key={s} className="meta" style={{ color: d ? "var(--ink)" : undefined }}>{d ? "●" : "○"} {s}{d ? ` · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</span>)}
      </div>
      <div className="panel stack">
        <div className="tname">Messages with {other.name.split(" ")[0]}</div>
        <div className="chat">
          {l.messages.length === 0 && <div className="meta">No messages yet. Sort out pick-up times, where to leave it, and so on here.</div>}
          {l.messages.map((m) => (
            <div key={m.id} className={`bubble ${m.authorId === u.id ? "me" : ""}`}>
              <small>{m.authorId === u.id ? "You" : m.author.name} · {m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>{m.body}
            </div>
          ))}
        </div>
        <ActionForm action={sendMessage} className="row" resetOnOk>
          <input type="hidden" name="id" value={l.id} />
          <input name="body" id="body" placeholder={`Message ${other.name.split(" ")[0]}`} required style={{ flex: 1, minWidth: 200 }} autoComplete="off" />
          <button className="primary">Send</button>
        </ActionForm>
      </div>
    </div>
  );
}
