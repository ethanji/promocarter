import type { Asset } from "./media";

/** Upload one file with progress. Resolves to the new asset, rejects with a readable message. */
export function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `/api/assets?name=${encodeURIComponent(file.name)}`);
    x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let j: any = {}; try { j = JSON.parse(x.responseText); } catch {}
      x.status >= 200 && x.status < 300 ? resolve(j) : reject(new Error(j.error || `Upload failed (${x.status})`));
    };
    x.onerror = () => reject(new Error("Network error during upload"));
    x.send(file);
  });
}
export const fileUrl = (id: number) => `/api/assets/${id}/file`;
