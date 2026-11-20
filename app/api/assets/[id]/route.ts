import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { all, get, run, uploadsDir } from "@/lib/db";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const usage = (id: number) =>
  all(`SELECT p.id, p.status, substr(p.content,1,60) AS content, p.scheduled_at FROM post_media m JOIN posts p ON p.id=m.post_id WHERE m.asset_id=?`, id);
const meta = (id: number) => {
  const a = get("SELECT id,name,mime,kind,size,alt,created_at FROM assets WHERE id=?", id);
  return a && { ...a, usedBy: usage(id), used: usage(id).length };
};

export async function GET(_: Request, { params }: Ctx) {
  const a = meta(Number((await params).id));
  return a ? NextResponse.json(a) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id), b = await req.json();
  if (!get("SELECT 1 x FROM assets WHERE id=?", id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (typeof b.name === "string" && b.name.trim()) run("UPDATE assets SET name=? WHERE id=?", b.name.trim().slice(0, 200), id);
  if (typeof b.alt === "string") run("UPDATE assets SET alt=? WHERE id=?", b.alt.slice(0, 1000) || null, id);
  return NextResponse.json(meta(id));
}

/** Refuses (409) if the asset is attached to a draft/scheduled post, unless ?force=1. */
export async function DELETE(req: Request, { params }: Ctx) {
  const id = Number((await params).id), force = new URL(req.url).searchParams.get("force") === "1";
  const a = get("SELECT file FROM assets WHERE id=?", id);
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
  const pending = usage(id).filter((p) => p.status === "draft" || p.status === "scheduled");
  if (pending.length && !force)
    return NextResponse.json({ error: `Used by ${pending.length} draft/scheduled post(s). Remove it from them or delete with force.`, usedBy: pending }, { status: 409 });
  run("DELETE FROM assets WHERE id=?", id);
  fs.rmSync(path.join(uploadsDir(), a.file), { force: true });
  return NextResponse.json({ ok: true });
}
