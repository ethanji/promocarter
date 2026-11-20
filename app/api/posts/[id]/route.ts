import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { publishPost } from "@/lib/publisher";
import { save, one } from "@/lib/posts";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const p = one(Number((await params).id));
  return p ? NextResponse.json(p) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: Ctx) {
  const id = Number((await params).id), b = await req.json();
  if (!one(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = save(id, b);
  if ("error" in r) return NextResponse.json(r, { status: 400 });
  if (b.action === "publish_now") await publishPost(id);
  return NextResponse.json(one(id));
}

/** Lightweight reschedule (calendar drag & drop). */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id), { scheduledAt } = await req.json();
  if (!one(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!scheduledAt || isNaN(Date.parse(scheduledAt))) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  run("UPDATE posts SET scheduled_at=?, status=CASE WHEN status='draft' THEN 'draft' ELSE 'scheduled' END WHERE id=?",
    new Date(scheduledAt).toISOString(), id);
  return NextResponse.json(one(id));
}

export async function DELETE(_: Request, { params }: Ctx) {
  run("DELETE FROM posts WHERE id=?", Number((await params).id));
  return NextResponse.json({ ok: true });
}
