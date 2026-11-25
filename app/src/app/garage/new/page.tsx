import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { myGroupIds } from "@/lib/access";
import { ToolForm } from "@/components/ToolForm";
export const metadata = { title: "Add a tool" };
export default async function NewTool() {
  const u = await requireUser();
  const groups = await db.group.findMany({ where: { id: { in: await myGroupIds(u.id) } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <div className="stack"><div><Link href="/garage">← My garage</Link></div><h1>Add a tool</h1><ToolForm groups={groups} /></div>;
}
