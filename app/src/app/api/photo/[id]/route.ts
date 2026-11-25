import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { canSeeTool } from "@/lib/access";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return new Response("Log in to see photos", { status: 401 });
  const { id } = await params;
  // Photos of tools in loan history stay visible to the people in that loan.
  const ok = (await canSeeTool(u.id, id)) || (await db.loan.findFirst({ where: { toolId: id, OR: [{ borrowerId: u.id }, { lenderId: u.id }] } }));
  if (!ok) return new Response("Not found", { status: 404 });
  const t = await db.tool.findUnique({ where: { id }, select: { photo: true, photoType: true } });
  if (!t?.photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(t.photo), { headers: { "Content-Type": t.photoType || "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable" } });
}
