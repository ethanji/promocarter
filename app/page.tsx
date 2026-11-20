"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NetBadge, NetBadges } from "./components/NetBadge";
import { NETWORKS, Network, formatOf } from "@/lib/networks";

type View = "month" | "week" | "list";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const inputDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const when = (p: any) => new Date(p.scheduled_at ?? p.created_at.replace(" ", "T") + "Z");
const STATUSES = ["", "draft", "scheduled", "published", "failed"];

function formatsLabel(p: any) {
  const set = new Map<string, string>();
  for (const t of p.targets) { const f = formatOf(t.network as Network, t.type); if (f.key !== "post") set.set(f.label, f.icon); }
  return [...set].map(([l, i]) => `${i} ${l}`).join(" · ");
}

export default function Planner() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [nets, setNets] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => { try { const v = localStorage.getItem("pc.view"); if (v === "month" || v === "week" || v === "list") setView(v); } catch {} }, []);
  const pickView = (v: View) => { setView(v); try { localStorage.setItem("pc.view", v); } catch {} };

  const load = useCallback(async () => { setPosts(await fetch("/api/posts").then((r) => r.json())); }, []);
  useEffect(() => { load(); fetch("/api/accounts").then((r) => r.json()).then(setAccounts); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const shown = posts.filter((p) => (!nets.length || p.targets.some((t: any) => nets.includes(t.network))) && (!status || p.status === status));

  let days: Date[] = [], title = "";
  if (view === "month") {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
    days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    title = first.toLocaleString([], { month: "long", year: "numeric" });
  } else if (view === "week") {
    const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
    days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    title = `${days[0].toLocaleDateString([], { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  } else title = "All posts";

  const step = (n: number) => setCursor((c) => view === "month" ? new Date(c.getFullYear(), c.getMonth() + n, 1) : (() => { const d = new Date(c); d.setDate(d.getDate() + 7 * n); return d; })());
  const move = async (id: number, day: Date) => {
    const p = posts.find((x) => x.id === id); if (!p) return;
    const nd = new Date(day), o = when(p); nd.setHours(o.getHours(), o.getMinutes(), 0, 0);
    await fetch(`/api/posts/${id}`, { method: "PATCH", body: JSON.stringify({ scheduledAt: nd.toISOString() }) }); load();
  };

  const chip = (p: any) => (
    <Link key={p.id} href={`/compose?id=${p.id}`} className={`pchip ${p.status}`} draggable onDragStart={(e) => e.dataTransfer.setData("id", String(p.id))}
      title={`${p.status} — ${p.content}`}>
      <div className="top"><NetBadges networks={p.targets.map((t: any) => t.network)} size={16} /><span className="tm">{p.scheduled_at ? when(p).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</span>
        {p.media?.length > 0 && <span className="fm">📎{p.media.length}</span>}</div>
      {formatsLabel(p) && <div className="fm">{formatsLabel(p)}</div>}
      <div className="tx">{p.content || p.targets[0]?.options?.title || "(no text)"}</div>
    </Link>
  );

  return (
    <>
      <div className="toolbar">
        <h1>{title}</h1>
        {view !== "list" && <><button onClick={() => step(-1)}>‹</button><button onClick={() => step(1)}>›</button>
          <button onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d); }}>Today</button></>}
        <span className="sp" />
        <div className="seg">{(["month", "week", "list"] as View[]).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => pickView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        <Link className="btn pri" href="/compose">＋ Create post</Link>
      </div>
      <div className="toolbar">
        <div className="chips">
          {[...new Set(accounts.map((a) => a.network))].map((n: string) => (
            <span key={n} className={`fchip ${nets.includes(n) ? "on" : ""}`} onClick={() => setNets(nets.includes(n) ? nets.filter((x) => x !== n) : [...nets, n])}>
              <NetBadge network={n} size={20} />{NETWORKS[n as Network].label}</span>))}
        </div>
        <span className="sp" />
        <div className="seg">{STATUSES.map((s) => <button key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s || "All"}</button>)}</div>
      </div>

      {view === "list" ? (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="list"><thead><tr><th>When</th><th>Networks</th><th>Content</th><th>Media</th><th>Status</th></tr></thead><tbody>
            {[...shown].sort((a, b) => +when(a) - +when(b)).map((p) => (
              <tr className="click" key={p.id} onClick={() => (location.href = `/compose?id=${p.id}`)}>
                <td style={{ whiteSpace: "nowrap" }}>{when(p).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                <td><div className="row"><NetBadges networks={p.targets.map((t: any) => t.network)} size={22} /><span className="count">{formatsLabel(p)}</span></div></td>
                <td>{(p.content || p.targets[0]?.options?.title || "(no text)").slice(0, 90)}</td>
                <td>{p.media.length ? `📎 ${p.media.length}` : "—"}</td>
                <td><span className={`tag ${p.status}`}>{p.status}</span></td>
              </tr>))}
            {!shown.length && <tr><td colSpan={5} className="count" style={{ padding: 30, textAlign: "center" }}>No posts match. <Link href="/compose" style={{ color: "var(--brand)" }}>Create one</Link>.</td></tr>}
          </tbody></table>
        </div>
      ) : (
        <div className={`cal ${view}`}>
          {DOW.map((d) => <div className="dow" key={d}>{d}</div>)}
          {days.map((d) => {
            const k = ymd(d), items = shown.filter((p) => ymd(when(p)) === k).sort((a, b) => +when(a) - +when(b));
            return (
              <div key={k} className={`day ${view === "month" && d.getMonth() !== cursor.getMonth() ? "out" : ""} ${k === ymd(new Date()) ? "today" : ""} ${over === k ? "over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setOver(k); }} onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); move(Number(e.dataTransfer.getData("id")), d); }}>
                <span className="dn">{d.getDate()}</span>
                <Link className="add" href={`/compose?date=${inputDay(d)}`} title="New post">＋</Link>
                {items.map((p) => chip(p))}
              </div>
            );
          })}
        </div>
      )}
      <p className="count">Drag a post to another day to reschedule. Green = published, red = failed, dashed = draft. Filters apply to every view.</p>
    </>
  );
}
