import { NextResponse } from "next/server";
import { tick } from "@/lib/publisher";
export const dynamic = "force-dynamic";
export async function POST() { return NextResponse.json({ published: await tick() }); }
