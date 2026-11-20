"use client";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/client";
import { ACCEPT, Asset } from "@/lib/media";

type Job = { key: number; name: string; pct: number; error?: string };

/** Button + drag-and-drop zone. Calls onUploaded for each finished file. */
export default function Uploader({ onUploaded, children, compact = false }: { onUploaded: (a: Asset) => void; children?: React.ReactNode; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);

  async function go(files: FileList | File[]) {
    for (const f of Array.from(files)) {
      const key = Math.random();
      setJobs((j) => [...j, { key, name: f.name, pct: 0 }]);
      try {
        const a = await uploadFile(f, (pct) => setJobs((j) => j.map((x) => (x.key === key ? { ...x, pct } : x))));
        setJobs((j) => j.filter((x) => x.key !== key)); onUploaded(a);
      } catch (e: any) {
        setJobs((j) => j.map((x) => (x.key === key ? { ...x, error: e.message } : x)));
      }
    }
  }
  return (
    <div className={`drop ${drag ? "drag" : ""} ${compact ? "compact" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) go(e.dataTransfer.files); }}>
      <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { if (e.target.files) go(e.target.files); e.target.value = ""; }} />
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="pri" onClick={() => input.current?.click()}>⬆ Upload media</button>
        <span className="count">or drag files here · JPG PNG GIF WebP · MP4 MOV WebM · PDF</span>
      </div>
      {children}
      {jobs.map((j) => (
        <div key={j.key} className="job">
          <span>{j.name}</span>
          {j.error ? <><span className="err" style={{ margin: 0 }}>{j.error}</span><button onClick={() => setJobs((x) => x.filter((y) => y.key !== j.key))}>Dismiss</button></>
            : <><progress value={j.pct} max={100} /><span className="count">{j.pct}%</span></>}
        </div>
      ))}
    </div>
  );
}
