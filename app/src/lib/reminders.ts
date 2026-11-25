import "server-only";
import { db } from "./db";
import { notify } from "./notify";
import { dayStr, daysUntil, fmt, todayStr } from "./dates";

async function once(loanId: string, kind: string, day: string) {
  try { await db.reminderLog.create({ data: { loanId, kind, day } }); return true; }
  catch { return false; } // already sent
}

/** Sends due-date reminders. Safe to run as often as you like; each reminder goes out once. */
export async function runReminders() {
  const day = todayStr();
  const loans = await db.loan.findMany({
    where: { status: { in: ["OUT", "APPROVED"] } },
    include: { tool: true, borrower: true, lender: true },
  });
  let sent = 0;
  for (const l of loans) {
    const url = `/loans/${l.id}`;
    if (l.status === "APPROVED") {
      if (dayStr(l.startDate) === day && (await once(l.id, "pickup", day))) {
        await notify(l.borrowerId, "Pick-up day", `Today's the day to pick up the ${l.tool.name} from ${l.lender.name}.`, url); sent++;
      }
      continue;
    }
    const n = daysUntil(l.dueDate);
    if (n === 2 && (await once(l.id, "due2", day))) {
      await notify(l.borrowerId, "Due in 2 days", `The ${l.tool.name} is due back to ${l.lender.name} on ${fmt(l.dueDate)}.`, url);
      await notify(l.lenderId, "Coming back soon", `${l.borrower.name} is due to return your ${l.tool.name} on ${fmt(l.dueDate)}.`, url);
      sent += 2;
    } else if (n === 0 && (await once(l.id, "due0", day))) {
      await notify(l.borrowerId, "Due today", `The ${l.tool.name} is due back to ${l.lender.name} today.`, url); sent++;
    } else if (n < 0 && (await once(l.id, "overdue", day))) {
      const d = -n;
      await notify(l.borrowerId, "Overdue", `The ${l.tool.name} was due back to ${l.lender.name} ${d} day${d > 1 ? "s" : ""} ago. Return it or ask for more time.`, url);
      if (d === 1 || d % 3 === 0)
        await notify(l.lenderId, "Overdue", `${l.borrower.name} hasn't returned your ${l.tool.name}. It was due ${fmt(l.dueDate)}.`, url);
      sent++;
    }
  }
  return sent;
}
