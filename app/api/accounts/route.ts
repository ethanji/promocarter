import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";
import { NETWORKS } from "@/lib/networks";

export const dynamic = "force-dynamic";
export const GET = () => NextResponse.json(all("SELECT * FROM accounts ORDER BY id"));

export async function POST(req: Request) {
  const { network, handle } = await req.json();
  if (!(network in NETWORKS) || !String(handle ?? "").trim())
    return NextResponse.json({ error: "network and handle required" }, { status: 400 });
  const r = run("INSERT INTO accounts (network, handle) VALUES (?, ?)", network, String(handle).trim());
  return NextResponse.json(get("SELECT * FROM accounts WHERE id=?", Number(r.lastInsertRowid)));
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  run("DELETE FROM accounts WHERE id=?", id);
  return NextResponse.json({ ok: true });
}
