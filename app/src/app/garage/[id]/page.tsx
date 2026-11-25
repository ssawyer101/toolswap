import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { myGroupIds } from "@/lib/access";
import { ToolForm } from "@/components/ToolForm";
import { ConfirmButton } from "@/components/Confirm";
import { deleteTool } from "@/app/actions/tools";
export const metadata = { title: "Edit tool" };
export default async function EditTool({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const t = await db.tool.findUnique({ where: { id }, select: { id: true, ownerId: true, archived: true, name: true, category: true, value: true, description: true, tip: true, link: true, video: true, photoVer: true, shares: { select: { groupId: true } } } });
  if (!t || t.ownerId !== u.id || t.archived) notFound();
  const groups = await db.group.findMany({ where: { id: { in: await myGroupIds(u.id) } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}><Link href="/garage">← My garage</Link><Link href={`/tools/${t.id}`}>See it the way borrowers do</Link></div>
      <h1>Edit {t.name}</h1>
      <ToolForm tool={{ ...t, groupIds: t.shares.map((s) => s.groupId) }} groups={groups} />
      <form action={deleteTool} className="row"><input type="hidden" name="id" value={t.id} />
        <ConfirmButton label="Take out of my garage" confirm="Take this tool out? Loan history is kept." className="small danger" /></form>
    </div>
  );
}
