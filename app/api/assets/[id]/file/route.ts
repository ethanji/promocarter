import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { get, uploadsDir } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Serves the original file with HTTP Range support (needed for video seeking). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = get("SELECT name, mime, file FROM assets WHERE id=?", Number((await params).id));
  if (!a) return new Response("Not found", { status: 404 });
  const fp = path.join(uploadsDir(), a.file);
  if (!fs.existsSync(fp)) return new Response("File missing", { status: 404 });
  const size = fs.statSync(fp).size;
  const dl = new URL(req.url).searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": a.mime, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `${dl ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(a.name)}`,
  };
  let start = 0, end = size - 1, status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    if (!m[1]) start = Math.max(0, size - Number(m[2]));
    else { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), size - 1); }
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    status = 206; headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);
  return new Response(Readable.toWeb(fs.createReadStream(fp, { start, end })) as any, { status, headers });
}
