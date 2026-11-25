import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeTool } from "@/lib/access";
import { fmt, today } from "@/lib/dates";
import { Links, Tip } from "@/components/bits";
import { toggleBasket } from "@/app/actions/loans";

export default async function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  if (!(await canSeeTool(u.id, id))) notFound();
  const t = await db.tool.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, name: true, category: true, value: true, description: true, tip: true, link: true, video: true, paused: true, photoVer: true, ownerId: true,
      owner: { select: { name: true, area: true } },
      loans: { where: { status: { in: ["APPROVED", "OUT", "RETURNED"] }, dueDate: { gte: today() } }, orderBy: { startDate: "asc" }, select: { startDate: true, dueDate: true } },
      basket: { where: { userId: u.id }, select: { userId: true } },
    },
  });
  const mine = t.ownerId === u.id;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><Link href={mine ? "/garage" : "/search"}>← Back</Link></div>
      {t.photoVer > 0 && <img className="hero-photo" src={`/api/photo/${t.id}?v=${t.photoVer}`} alt={t.name} />}
      <div>
        <h1>{t.name}</h1>
        <div className="meta"><span>{t.category}</span><span>Lent by {mine ? "you" : t.owner.name}{t.owner.area ? ` · ${t.owner.area}` : ""}</span>{t.value != null && <span className="money">Value ${t.value.toLocaleString()}</span>}</div>
      </div>
      {t.description && <p style={{ margin: 0, whiteSpace: "pre-wrap", maxWidth: "65ch" }}>{t.description}</p>}
      <Tip text={t.tip} />
      <Links link={t.link} video={t.video} />
      <div className="panel">
        <div className="tname" style={{ fontSize: 15 }}>Booked dates</div>
        {t.loans.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{t.loans.map((l, i) => <li key={i}>{fmt(l.startDate)} to {fmt(l.dueDate)}</li>)}</ul>
          : <div className="meta">Nothing booked. It's free whenever you need it.</div>}
      </div>
      {mine ? <div><Link className="btn" href={`/garage/${t.id}`}>Edit this tool</Link></div>
        : t.paused ? <span className="pill p-neutral">{t.owner.name} isn't lending this right now</span>
        : <form action={toggleBasket}><input type="hidden" name="toolId" value={t.id} /><button className={t.basket.length ? "" : "primary"}>{t.basket.length ? "Remove from basket" : "Add to basket"}</button></form>}
    </div>
  );
}
