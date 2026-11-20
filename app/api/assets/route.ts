import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assetsList, get, run, uploadsDir } from "@/lib/db";
import { ALLOWED, MAX_UPLOAD_MB, kindOf, mimeFromName } from "@/lib/media";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  return NextResponse.json(assetsList(u.searchParams.get("kind"), u.searchParams.get("q")));
}

/**
 * Upload: POST /api/assets?name=<filename> with the raw file as the request body
 * (Content-Type = the file's MIME type). Streamed to disk, so large videos are fine.
 */
export async function POST(req: Request) {
  const name = (new URL(req.url).searchParams.get("name") || "upload").replace(/[\\/\0]/g, "_").slice(0, 200);
  let mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED[mime]) mime = mimeFromName(name) ?? mime;
  const ext = ALLOWED[mime];
  if (!ext) return NextResponse.json({ error: `Unsupported file type. Allowed: ${Object.keys(ALLOWED).join(", ")}` }, { status: 415 });
  if (!req.body) return NextResponse.json({ error: "Empty body" }, { status: 400 });

  const file = `${crypto.randomUUID()}.${ext}`, dest = path.join(uploadsDir(), file);
  const limit = MAX_UPLOAD_MB * 1024 ** 2;
  let size = 0;
  const counter = new Transform({
    transform(chunk, _e, cb) { size += chunk.length; size > limit ? cb(new Error("too_large")) : cb(null, chunk); },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as any), counter, fs.createWriteStream(dest));
  } catch (e: any) {
    fs.rmSync(dest, { force: true });
    return e?.message === "too_large"
      ? NextResponse.json({ error: `File is over ${MAX_UPLOAD_MB} MB.` }, { status: 413 })
      : NextResponse.json({ error: "Upload failed." }, { status: 400 });
  }
  if (size === 0) { fs.rmSync(dest, { force: true }); return NextResponse.json({ error: "Empty file." }, { status: 400 }); }

  const id = Number(run("INSERT INTO assets (name, mime, kind, size, file) VALUES (?,?,?,?,?)", name, mime, kindOf(mime), size, file).lastInsertRowid);
  const { file: _f, ...asset } = get("SELECT * FROM assets WHERE id=?", id)!;
  return NextResponse.json({ ...asset, used: 0 }, { status: 201 });
}
