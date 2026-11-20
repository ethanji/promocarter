"use client";
import { useEffect, useState } from "react";
import MediaThumb from "./MediaThumb";
import Uploader from "./Uploader";
import { fmtSize, Asset } from "@/lib/media";

/** Modal that lets the user choose (and upload) library assets. */
export default function MediaPicker({ selectedIds, onDone, onClose, kinds, single = false, title = "Choose media" }: { selectedIds: number[]; onDone: (picked: Asset[]) => void; onClose: () => void; kinds?: string[]; single?: boolean; title?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sel, setSel] = useState<number[]>(selectedIds);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const load = () => fetch(`/api/assets?kind=${kind}&q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setAssets);
  useEffect(() => { load(); }, [kind, q]); // eslint-disable-line
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : single ? [id] : [...s, id]));
  const shown = kinds ? assets.filter((a) => kinds.includes(a.kind)) : assets;

  return (
    <div className="modal show" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <div className="row" style={{ marginBottom: 12 }}>
          <h1>{title}</h1><span className="sp" /><button onClick={onClose}>✕</button>
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
          {["", "image", "video", "document"].filter((k) => !kinds || k === "" || kinds.includes(k)).map((k) => <button key={k} className={kind === k ? "pri" : ""} onClick={() => setKind(k)}>{k === "" ? "All" : k === "image" ? "Images" : k === "video" ? "Videos" : "PDFs"}</button>)}
        </div>
        <Uploader compact onUploaded={(a) => { setAssets((x) => [a, ...x]); setSel((s) => (single ? [a.id] : [...s, a.id])); }} />
        <div className="agrid" style={{ marginTop: 12, maxHeight: "50vh", overflow: "auto" }}>
          {shown.map((a) => (
            <div key={a.id} className={`acard ${sel.includes(a.id) ? "sel" : ""}`} onClick={() => toggle(a.id)}>
              <MediaThumb asset={a} />
              {sel.includes(a.id) && <span className="check">{sel.indexOf(a.id) + 1}</span>}
              <div className="ameta"><b>{a.name}</b><span className="count">{fmtSize(a.size)}</span></div>
            </div>
          ))}
          {!shown.length && <p className="count">Nothing here yet — upload something above.</p>}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <span className="count">{sel.length} selected</span><span className="sp" />
          <button onClick={onClose}>Cancel</button>
          <button className="pri" onClick={async () => {
            const all = await fetch("/api/assets").then((r) => r.json());
            onDone(sel.map((id) => all.find((a: Asset) => a.id === id)).filter(Boolean));
          }}>Attach {sel.length || ""}</button>
        </div>
      </div>
    </div>
  );
}
