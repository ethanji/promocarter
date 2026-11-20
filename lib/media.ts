export const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
  "application/pdf": "pdf",
};
export const MAX_UPLOAD_MB = 1024;
export type Kind = "image" | "video" | "document";
export const kindOf = (mime: string): Kind => (mime.startsWith("video/") ? "video" : mime === "application/pdf" ? "document" : "image");
const EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", pdf: "application/pdf" };
export const mimeFromName = (name: string) => EXT[name.split(".").pop()?.toLowerCase() ?? ""];
export const fmtSize = (n: number) => n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`;
export const ACCEPT = Object.keys(ALLOWED).join(",");

export interface Asset { id: number; name: string; mime: string; kind: Kind; size: number; alt: string | null; created_at: string; used?: number }
