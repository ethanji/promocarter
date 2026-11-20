"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MediaThumb from "../components/MediaThumb";
import Uploader from "../components/Uploader";
import { fileUrl } from "@/lib/client";
import { fmtSize, Asset } from "@/lib/media";

export default function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => fetch(`/api/assets?kind=${kind}&q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setAssets), [kind, q]);
  useEffect(() => { load(); }, [load]);

  const totals = { n: assets.length, size: assets.reduce((s, a) => s + a.size, 0), v: assets.filter((a) => a.kind === "video").length };
  const detail = async (id: number) => setOpen(await fetch(`/api/assets/${id}`).then((r) => r.json()));

  async function del(ids: number[]) {
    setMsg("");
    for (const id of ids) {
      let r = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (r.status === 409) {
        const j = await r.json();
        if (!confirm(`${j.error}\n\nDelete anyway? It will be removed from those posts.`)) continue;
        r = await fetch(`/api/assets/${id}?force=1`, { method: "DELETE" });
      }
      if (!r.ok) setMsg("Some items could not be deleted.");
    }
    setSel([]); setOpen(null); load();
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <h1>Media library</h1>
        <span className="count">{totals.n} files · {totals.v} videos · {fmtSize(totals.size)}</span>
        <span className="sp" />
        {sel.length > 0 && <><span className="count">{sel.length} selected</span><button className="dng" onClick={() => confirm(`Delete ${sel.length} file(s)?`) && del(sel)}>Delete</button><button onClick={() => setSel([])}>Clear</button></>}
      </div>
      <Uploader onUploaded={() => load()} />
      <div className="row" style={{ margin: "14px 0" }}>
        <input placeholder="Search name or alt text…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        {["", "image", "video", "document"].map((k) => <button key={k} className={kind === k ? "pri" : ""} onClick={() => setKind(k)}>{k === "" ? "All" : k === "image" ? "Images" : k === "video" ? "Videos" : "PDFs"}</button>)}
      </div>
      {msg && <div className="err">{msg}</div>}
      <div className="agrid">
        {assets.map((a) => (
          <div key={a.id} className={`acard ${sel.includes(a.id) ? "sel" : ""}`}>
            <div onClick={() => detail(a.id)} style={{ cursor: "pointer" }}><MediaThumb asset={a} /></div>
            <label className="pickbox" title="Select"><input type="checkbox" checked={sel.includes(a.id)} onChange={() => setSel(sel.includes(a.id) ? sel.filter((x) => x !== a.id) : [...sel, a.id])} /></label>
            <div className="ameta"><b title={a.name}>{a.name}</b>
              <span className="count">{a.kind === "video" ? "🎬" : a.kind === "document" ? "📄" : "🖼"} {fmtSize(a.size)}{a.used ? ` · used ${a.used}×` : ""}</span></div>
          </div>
        ))}
      </div>
      {!assets.length && <p className="count" style={{ textAlign: "center", padding: 40 }}>{q || kind ? "No matches." : "Your library is empty. Upload images, videos or PDFs to get started."}</p>}

      {open && (
        <div className="modal show" onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="mbox" style={{ maxWidth: 860 }}>
            <div className="row" style={{ marginBottom: 12 }}><h1>{open.name}</h1><span className="sp" /><button onClick={() => setOpen(null)}>✕</button></div>
            <div className="g2">
              <div className="bigpreview"><MediaThumb asset={open} controls className="big" /></div>
              <div>
                <label className="l" style={{ marginTop: 0 }}>File name</label>
                <input value={open.name} onChange={(e) => setOpen({ ...open, name: e.target.value })} />
                <label className="l">Alt text (accessibility)</label>
                <textarea style={{ minHeight: 70 }} value={open.alt ?? ""} onChange={(e) => setOpen({ ...open, alt: e.target.value })} placeholder="Describe what's in this image…" />
                <p className="count">{open.mime} · {fmtSize(open.size)} · uploaded {new Date(open.created_at).toLocaleString()}</p>
                <label className="l">Used in</label>
                {open.usedBy.length === 0 ? <p className="count">Not used in any post.</p> :
                  open.usedBy.map((p: any) => <div key={p.id}><Link href={`/compose?id=${p.id}`} style={{ textDecoration: "underline" }}>#{p.id}</Link> <span className="tag">{p.status}</span> <span className="count">{p.content || "(no text)"}</span></div>)}
                <div className="row" style={{ marginTop: 16 }}>
                  <button className="pri" onClick={async () => { await fetch(`/api/assets/${open.id}`, { method: "PATCH", body: JSON.stringify({ name: open.name, alt: open.alt ?? "" }) }); setOpen(null); load(); }}>Save</button>
                  <a className="btn" href={`${fileUrl(open.id)}?download=1`}>Download</a>
                  <span className="sp" /><button className="dng" onClick={() => confirm("Delete this file?") && del([open.id])}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
