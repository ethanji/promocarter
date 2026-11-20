import { NextResponse } from "next/server";
import { postsWhere } from "@/lib/db";
import { publishPost } from "@/lib/publisher";
import { save, strip, one } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const from = u.searchParams.get("from"), to = u.searchParams.get("to"), status = u.searchParams.get("status");
  let posts = from && to
    ? postsWhere("(scheduled_at >= ? AND scheduled_at < ?) OR (scheduled_at IS NULL AND created_at >= ? AND created_at < ?)", from, to, from, to)
    : postsWhere();
  if (status) posts = posts.filter((p) => p.status === status);
  return NextResponse.json(strip(posts));
}

export async function POST(req: Request) {
  const b = await req.json();
  const r = save(null, b);
  if ("error" in r) return NextResponse.json(r, { status: 400 });
  if (b.action === "publish_now") await publishPost(r.id);
  return NextResponse.json(one(r.id));
}
