import type { Loan, Tool } from "@prisma/client";
import { daysUntil, fmt } from "@/lib/dates";

export function Thumb({ tool }: { tool: Pick<Tool, "id" | "category" | "photoVer"> & { photoType?: string | null; hasPhoto?: boolean } }) {
  const has = tool.photoVer > 0 && tool.hasPhoto !== false;
  return <div className="thumb">{has ? <img src={`/api/photo/${tool.id}?v=${tool.photoVer}`} alt="" loading="lazy" /> : (
    <svg viewBox="0 0 24 24" width="45%" height="45%" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>)}</div>;
}

export function loanState(l: Pick<Loan, "status" | "dueDate" | "startDate" | "extendTo">): [string, string] {
  switch (l.status) {
    case "REQUESTED": return ["Waiting for answer", "p-accent"];
    case "APPROVED": return [`Approved · pick up ${fmt(l.startDate)}`, "p-ok"];
    case "RETURNED": return ["Returned, awaiting owner's OK", "p-accent"];
    case "CLOSED": return ["Returned", "p-neutral"];
    case "DECLINED": return ["Declined", "p-neutral"];
    case "CANCELLED": return ["Cancelled", "p-neutral"];
  }
  const n = daysUntil(l.dueDate);
  if (n < 0) return [`Overdue ${-n} day${n === -1 ? "" : "s"}`, "p-bad"];
  if (n === 0) return ["Due today", "p-warn"];
  if (n <= 3) return [`Due in ${n} day${n === 1 ? "" : "s"}`, "p-warn"];
  return [`Due ${fmt(l.dueDate)}`, "p-ok"];
}

export function Tip({ text }: { text?: string | null }) {
  return text ? <div className="tip"><b>Good to know:</b> {text}</div> : null;
}

export function Links({ link, video }: { link?: string | null; video?: string | null }) {
  if (!link && !video) return null;
  return (
    <div className="links">
      {link && <a href={link} target="_blank" rel="noopener noreferrer">Product page ↗</a>}
      {video && <a href={video} target="_blank" rel="noopener noreferrer">How-to video ↗</a>}
    </div>
  );
}
