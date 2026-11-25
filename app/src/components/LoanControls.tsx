import { ActionForm } from "@/components/ActionForm";
import { loanAction } from "@/app/actions/loans";
import { addDays, dayStr, fmt } from "@/lib/dates";
import type { Loan } from "@prisma/client";

function Act({ id, act, label, primary, children }: { id: string; act: string; label: string; primary?: boolean; children?: React.ReactNode }) {
  return (
    <ActionForm action={loanAction} className="row" style={{ justifyContent: "flex-end" }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="act" value={act} />
      {children}
      <button className={`small ${primary ? "primary" : ""}`}>{label}</button>
    </ActionForm>
  );
}

/** The buttons that make sense for this loan, for this person, right now. */
export function LoanControls({ l, me, full }: { l: Loan; me: string; full?: boolean }) {
  const lender = l.lenderId === me, borrower = l.borrowerId === me;
  const b: React.ReactNode[] = [];
  if (lender) {
    if (l.status === "REQUESTED") b.push(<Act key="d" id={l.id} act="decline" label="Decline" />, <Act key="a" id={l.id} act="approve" label="Approve" primary />);
    if (l.status === "APPROVED") b.push(<Act key="p" id={l.id} act="pickedUp" label="Mark picked up" primary />);
    if (l.status === "OUT") b.push(<Act key="n" id={l.id} act="nudge" label="Send reminder" />, <Act key="c" id={l.id} act="confirm" label="Got it back" primary />);
    if (l.status === "RETURNED") b.push(<Act key="nb" id={l.id} act="notBack" label="It's not back" />, <Act key="c" id={l.id} act="confirm" label="Confirm it's back" primary />);
    if (l.extendTo && (l.status === "OUT" || l.status === "APPROVED")) b.push(
      <div key="ext" className="panel stack" style={{ gap: 6, padding: 10, width: "100%" }}>
        <span>Asks to keep it until <b>{fmt(l.extendTo)}</b></span>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Act id={l.id} act="declineExt" label="No" /><Act id={l.id} act="approveExt" label="Yes, extend" primary />
        </div>
      </div>);
    if (full && (l.status === "OUT" || l.status === "APPROVED")) b.push(
      <Act key="nbd" id={l.id} act="needBy" label="Set return date">
        <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>I need it back by<input type="date" name="date" defaultValue={dayStr(l.dueDate)} style={{ width: "auto" }} /></label>
      </Act>);
  }
  if (borrower) {
    if (l.status === "REQUESTED" || l.status === "APPROVED") b.push(<Act key="x" id={l.id} act="cancel" label="Cancel request" />);
    if (l.status === "APPROVED") b.push(<Act key="p" id={l.id} act="pickedUp" label="I picked it up" primary />);
    if (l.status === "OUT") {
      if (l.extendTo) b.push(<span key="w" className="pill p-accent">Asked for more time, until {fmt(l.extendTo)}</span>);
      else if (full) b.push(
        <Act key="e" id={l.id} act="extend" label="Ask for more time">
          <input type="date" name="to" defaultValue={dayStr(addDays(l.dueDate, 3))} style={{ width: "auto" }} aria-label="New return date" />
        </Act>);
      b.push(
        full ? <Act key="r" id={l.id} act="returned" label="I returned it" primary>
          <input name="note" placeholder="Note, like 'left it in your garage'" style={{ width: "auto", flex: 1, minWidth: 180 }} />
        </Act> : <Act key="r" id={l.id} act="returned" label="I returned it" primary />);
    }
  }
  return <div className="row" style={{ justifyContent: "flex-end" }}>{b}</div>;
}
