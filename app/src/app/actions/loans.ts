"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeTool, conflicts } from "@/lib/access";
import { notify } from "@/lib/notify";
import { fmt, parseDay, today } from "@/lib/dates";
import type { FormState } from "./auth";

export async function toggleBasket(f: FormData) {
  const u = await requireUser();
  const toolId = String(f.get("toolId"));
  const key = { userId_toolId: { userId: u.id, toolId } };
  if (await db.basketItem.findUnique({ where: key })) await db.basketItem.delete({ where: key });
  else if (await canSeeTool(u.id, toolId)) await db.basketItem.create({ data: { userId: u.id, toolId } });
  revalidatePath("/", "layout");
}

/** Sends one request per tool for everything in the basket from one lender. */
export async function sendRequest(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const lenderId = String(f.get("lenderId"));
  const start = parseDay(String(f.get("start"))), due = parseDay(String(f.get("due")));
  const note = String(f.get("note") || "").trim() || null;
  if (!start || !due) return { error: "Pick both a pick-up date and a return date." };
  if (+start < +today()) return { error: "The pick-up date is in the past." };
  if (+due < +start) return { error: "The return date has to be on or after the pick-up date." };
  const items = await db.basketItem.findMany({ where: { userId: u.id, tool: { ownerId: lenderId } }, include: { tool: true } });
  const ok = [];
  for (const it of items) if (await canSeeTool(u.id, it.toolId)) ok.push(it.tool);
  if (!ok.length) return { error: "Nothing in your basket from this lender." };
  const busy = [];
  for (const t of ok) if ((await conflicts(t.id, start, due)).length) busy.push(t.name);
  if (busy.length) return { error: `Already booked for some of those dates: ${busy.join(", ")}. Pick other dates or remove it.` };
  await db.$transaction([
    ...ok.map((t) => db.loan.create({ data: { toolId: t.id, borrowerId: u.id, lenderId, startDate: start, dueDate: due, note } })),
    db.basketItem.deleteMany({ where: { userId: u.id, toolId: { in: ok.map((t) => t.id) } } }),
  ]);
  await notify(lenderId, "Borrow request", `${u.name} would like to borrow ${ok.map((t) => t.name).join(", ")} from ${fmt(start)} to ${fmt(due)}.`, "/loans");
  revalidatePath("/", "layout");
  return { ok: "Request sent." };
}

type Act = "approve" | "decline" | "cancel" | "pickedUp" | "returned" | "confirm" | "notBack" | "extend" | "approveExt" | "declineExt" | "needBy" | "nudge";

export async function loanAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const act = String(f.get("act")) as Act;
  const l = await db.loan.findUnique({ where: { id: String(f.get("id")) }, include: { tool: true, borrower: true, lender: true } });
  if (!l) return { error: "That loan doesn't exist." };
  const isLender = l.lenderId === u.id, isBorrower = l.borrowerId === u.id;
  if (!isLender && !isBorrower) return { error: "This isn't your loan." };
  const url = `/loans/${l.id}`, tool = l.tool.name;
  const set = (data: any) => db.loan.update({ where: { id: l.id }, data });
  const need = (who: boolean, ...st: string[]) => who && st.includes(l.status);

  switch (act) {
    case "approve":
      if (!need(isLender, "REQUESTED")) break;
      if ((await conflicts(l.toolId, l.startDate, l.dueDate, l.id)).length) return { error: "The tool is already promised to someone else for some of those days." };
      await set({ status: "APPROVED" });
      await notify(l.borrowerId, "Request approved", `${l.lender.name} said yes to the ${tool}. Pick up ${fmt(l.startDate)}.`, url);
      break;
    case "decline":
      if (!need(isLender, "REQUESTED", "APPROVED")) break;
      await set({ status: "DECLINED" });
      await notify(l.borrowerId, "Request declined", `${l.lender.name} can't lend the ${tool} this time.`, url);
      break;
    case "cancel":
      if (!need(isBorrower, "REQUESTED", "APPROVED")) break;
      await set({ status: "CANCELLED" });
      await notify(l.lenderId, "Request cancelled", `${l.borrower.name} no longer needs the ${tool}.`, url);
      break;
    case "pickedUp":
      if (!(isLender || isBorrower) || l.status !== "APPROVED") break;
      await set({ status: "OUT", pickedUpAt: new Date() });
      await notify(isLender ? l.borrowerId : l.lenderId, "Picked up", `The ${tool} is out. It's due back ${fmt(l.dueDate)}.`, url);
      break;
    case "returned":
      if (!need(isBorrower, "OUT")) break;
      await set({ status: "RETURNED", returnedAt: new Date(), returnNote: String(f.get("note") || "").trim() || null });
      await notify(l.lenderId, "Tool returned", `${l.borrower.name} says the ${tool} is back. Tap to confirm you have it.`, url);
      break;
    case "confirm":
      if (!need(isLender, "OUT", "RETURNED")) break;
      await set({ status: "CLOSED", closedAt: new Date(), returnedAt: l.returnedAt ?? new Date() });
      await notify(l.borrowerId, "Return confirmed", `${l.lender.name} confirmed the ${tool} is back. Thanks!`, url);
      break;
    case "notBack":
      if (!need(isLender, "RETURNED")) break;
      await set({ status: "OUT", returnedAt: null });
      await notify(l.borrowerId, "Not back yet", `${l.lender.name} says the ${tool} isn't back yet. Check in with them.`, url);
      break;
    case "extend": {
      if (!need(isBorrower, "OUT", "APPROVED")) break;
      const to = parseDay(String(f.get("to")));
      if (!to || +to <= +l.dueDate) return { error: "Pick a new date after the current due date." };
      await set({ extendTo: to });
      await notify(l.lenderId, "More time?", `${l.borrower.name} asks to keep the ${tool} until ${fmt(to)}.`, url);
      break;
    }
    case "approveExt":
      if (!isLender || !l.extendTo) break;
      if ((await conflicts(l.toolId, l.startDate, l.extendTo, l.id)).length) return { error: "Someone else has it booked in that time. Decline, or change their booking first." };
      await set({ dueDate: l.extendTo, extendTo: null });
      await notify(l.borrowerId, "More time approved", `You can keep the ${tool} until ${fmt(l.extendTo)}.`, url);
      break;
    case "declineExt":
      if (!isLender || !l.extendTo) break;
      await set({ extendTo: null });
      await notify(l.borrowerId, "More time declined", `${l.lender.name} needs the ${tool} back by ${fmt(l.dueDate)}.`, url);
      break;
    case "needBy": {
      if (!need(isLender, "APPROVED", "OUT")) break;
      const d = parseDay(String(f.get("date")));
      if (!d || +d < +l.startDate) return { error: "Pick a date on or after the pick-up date." };
      await set({ dueDate: d, needBy: d, extendTo: null });
      await notify(l.borrowerId, "Return date changed", `${l.lender.name} needs the ${tool} back by ${fmt(d)}.`, url);
      break;
    }
    case "nudge":
      if (!need(isLender, "OUT")) break;
      await notify(l.borrowerId, "Friendly reminder", `${l.lender.name} is checking in about the ${tool}, due ${fmt(l.dueDate)}.`, url);
      revalidatePath("/loans");
      return { ok: "Reminder sent." };
  }
  revalidatePath("/", "layout");
  return undefined;
}

export async function sendMessage(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const body = String(f.get("body") || "").trim();
  if (!body) return undefined;
  const l = await db.loan.findUnique({ where: { id: String(f.get("id")) }, include: { tool: true } });
  if (!l || (l.borrowerId !== u.id && l.lenderId !== u.id)) return { error: "This isn't your loan." };
  await db.message.create({ data: { loanId: l.id, authorId: u.id, body: body.slice(0, 2000) } });
  await notify(l.borrowerId === u.id ? l.lenderId : l.borrowerId, `${u.name} · ${l.tool.name}`, body.slice(0, 140), `/loans/${l.id}`);
  revalidatePath(`/loans/${l.id}`);
  return { ok: "sent" };
}
