"use client";
import { useState } from "react";
import type { Field } from "@/lib/networks";
import MediaPicker from "./MediaPicker";
import MediaThumb from "./MediaThumb";

export default function FieldInput({ field: f, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const [pick, setPick] = useState(false);
  const label = <label>{f.label}{f.required && <span style={{ color: "var(--bad)" }}> *</span>}</label>;
  const help = f.help && <div className="help">{f.help}</div>;
  switch (f.type) {
    case "select":
      return <div>{label}<select value={value ?? f.default ?? ""} onChange={(e) => onChange(e.target.value)}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{help}</div>;
    case "toggle":
      return <div><label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}><input type="checkbox" checked={!!(value ?? f.default)} onChange={(e) => onChange(e.target.checked)} />{f.label}</label>{help}</div>;
    case "datetime":
      return <div>{label}<input type="datetime-local" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />{help}</div>;
    case "list": {
      const items: string[] = Array.isArray(value) && value.length ? value : [""];
      const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
      return (
        <div className="full">{label}
          <div className="listin">
            {items.map((it, i) => (
              <div className="row" key={i}>
                {f.max && f.max > 100 ? <textarea style={{ minHeight: 60 }} value={it} placeholder={`${f.placeholder ?? ""} ${i + 1}`} onChange={(e) => set(i, e.target.value)} />
                  : <input value={it} placeholder={`${f.placeholder ?? ""} ${i + 1}`} onChange={(e) => set(i, e.target.value)} />}
                {f.max && <span className={`count ${it.length > f.max ? "over" : ""}`} style={{ minWidth: 52 }}>{it.length}/{f.max}</span>}
                <button className="sm dng" disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
              </div>))}
            <div><button className="sm" disabled={items.length >= (f.maxItems ?? 99)} onClick={() => onChange([...items, ""])}>＋ Add</button>
              <span className="count" style={{ marginLeft: 8 }}>{f.minItems ? `${f.minItems}–` : "up to "}{f.maxItems}</span></div>
          </div>{help}
        </div>);
    }
    case "thumbnail":
      return (
        <div>{label}
          {value ? <div className="row"><div style={{ width: 90 }}><MediaThumb asset={{ id: Number(value), kind: "image", name: "thumbnail", alt: null }} /></div>
            <button className="sm" onClick={() => onChange(null)}>Remove</button></div>
            : <button onClick={() => setPick(true)}>Choose image…</button>}
          {help}
          {pick && <MediaPicker single kinds={["image"]} title="Choose a thumbnail" selectedIds={[]} onClose={() => setPick(false)} onDone={(a) => { onChange(a[0]?.id ?? null); setPick(false); }} />}
        </div>);
    default:
      return <div>{label}<input type={f.type === "url" ? "url" : "text"} value={value ?? ""} placeholder={f.placeholder ?? (f.type === "url" ? "https://…" : "")} onChange={(e) => onChange(e.target.value)} />
        <div className="row">{help}<span className="sp" />{f.max && <span className={`count ${String(value ?? "").length > f.max ? "over" : ""}`}>{String(value ?? "").length}/{f.max}</span>}</div></div>;
  }
}
