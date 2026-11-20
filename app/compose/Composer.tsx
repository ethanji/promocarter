"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NETWORKS, Network, formatOf, validateTarget } from "@/lib/networks";
import MediaThumb from "../components/MediaThumb";
import MediaPicker from "../components/MediaPicker";
import FieldInput from "../components/FieldInput";
import PostPreview from "../components/PostPreview";
import NetBadge from "../components/NetBadge";
import type { Asset } from "@/lib/media";

type Cfg = { type: string; custom: boolean; content: string; options: Record<string, any> };
const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const defaults = (n: Network, type: string) => Object.fromEntries(formatOf(n, type).fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default]));
const newCfg = (n: Network, type?: string): Cfg => { const f = formatOf(n, type); return { type: f.key, custom: false, content: "", options: defaults(n, f.key) }; };

export default function Composer() {
  const router = useRouter(), sp = useSearchParams(), id = sp.get("id");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [cfg, setCfg] = useState<Record<number, Cfg>>({});
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<Asset[]>([]);
  const [picker, setPicker] = useState(false);
  const [tab, setTab] = useState<"all" | number>("all");
  const [pv, setPv] = useState<number | null>(null);
  const [when, setWhen] = useState(() => {
    const d = sp.get("date") ? new Date(sp.get("date") + "T09:00") : new Date(Date.now() + 3600e3);
    d.setMinutes(0, 0, 0); return toLocal(d);
  });
  const [post, setPost] = useState<any>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/accounts").then((r) => r.json()).then(setAccounts); }, []);
  useEffect(() => {
    if (!id) return;
    fetch(`/api/posts/${id}`).then((r) => r.json()).then((p) => {
      setPost(p); setContent(p.content); setMedia(p.media ?? []);
      setSel(p.targets.map((t: any) => t.account_id));
      setCfg(Object.fromEntries(p.targets.map((t: any) => [t.account_id, { type: t.type, custom: !!t.content, content: t.content ?? "", options: t.options ?? {} }])));
      if (p.scheduled_at) setWhen(toLocal(new Date(p.scheduled_at)));
    });
  }, [id]);

  const chosen = sel.map((i) => accounts.find((a) => a.id === i)).filter(Boolean) as any[];
  const cfgOf = (a: any): Cfg => cfg[a.id] ?? newCfg(a.network);
  const textFor = (a: any) => { const c = cfgOf(a); return c.custom && c.content.trim() ? c.content : content; };
  const problems: Record<number, string[]> = useMemo(() => Object.fromEntries(chosen.map((a) => [a.id, validateTarget(a.network, cfgOf(a).type, textFor(a), media, cfgOf(a).options)])) as Record<number, string[]>, [chosen, cfg, content, media]); // eslint-disable-line
  const total = Object.values(problems).reduce((n, e) => n + e.length, 0);
  const activeAcct = tab === "all" ? null : chosen.find((a) => a.id === tab) ?? null;
  const pvAcct = chosen.find((a) => a.id === pv) ?? chosen[0];

  const toggle = (a: any) => {
    if (sel.includes(a.id)) { setSel(sel.filter((x) => x !== a.id)); if (tab === a.id) setTab("all"); }
    else { setSel([...sel, a.id]); setCfg((c) => ({ ...c, [a.id]: c[a.id] ?? newCfg(a.network) })); }
  };
  const patch = (a: any, p: Partial<Cfg>) => setCfg((c) => ({ ...c, [a.id]: { ...(c[a.id] ?? newCfg(a.network)), ...p } }));
  const setOpt = (a: any, k: string, v: any) => patch(a, { options: { ...cfgOf(a).options, [k]: v } });
  const setType = (a: any, type: string) => {
    const f = formatOf(a.network, type), old = cfgOf(a).options;
    const keep = Object.fromEntries(f.fields.filter((x) => old[x.key] !== undefined).map((x) => [x.key, old[x.key]]));
    patch(a, { type, options: { ...defaults(a.network, type), ...keep } });
  };
  const move = (i: number, d: number) => setMedia((m) => { const n = [...m]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const quick = (h: number, addDays: number, monday = false) => { const d = new Date(); d.setDate(d.getDate() + (monday ? ((8 - d.getDay()) % 7 || 7) : addDays)); d.setHours(h, 0, 0, 0); setWhen(toLocal(d)); };

  async function submit(action: "draft" | "schedule" | "publish_now") {
    setErr(""); setBusy(true);
    const r = await fetch(id ? `/api/posts/${id}` : "/api/posts", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({
        content, mediaIds: media.map((m) => m.id), action,
        scheduledAt: action === "schedule" ? new Date(when).toISOString() : undefined,
        targets: chosen.map((a) => ({ accountId: a.id, type: cfgOf(a).type, content: cfgOf(a).custom ? cfgOf(a).content : null, options: cfgOf(a).options })),
      }),
    });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    router.push("/");
  }
  async function del() { if (confirm("Delete this post?")) { await fetch(`/api/posts/${id}`, { method: "DELETE" }); router.push("/"); } }

  return (
    <>
      <div className="toolbar"><h1>{id ? "Edit post" : "Create post"}</h1>{post && <span className={`tag ${post.status}`}>{post.status}</span>}</div>
      <div className="composer">
        <div>
          <div className="card">
            <h2><span className="step">1</span>Choose networks</h2>
            {accounts.length === 0 && <p className="count">No connections yet — <a href="/accounts" style={{ color: "var(--brand)", textDecoration: "underline" }}>connect an account</a>.</p>}
            <div className="acct">
              {accounts.map((a) => (
                <div key={a.id} className={`atile ${sel.includes(a.id) ? "on" : ""}`} onClick={() => toggle(a)}>
                  <NetBadge network={a.network} size={32} /><div>{NETWORKS[a.network as Network].label}<small>{a.handle}</small></div>
                  {sel.includes(a.id) && <span style={{ color: "var(--brand)" }}>✓</span>}
                </div>))}
            </div>
          </div>

          <div className="card">
            <h2><span className="step">2</span>Write &amp; customise</h2>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post… (this text is used for every network unless you customise it below)" style={{ minHeight: 120 }} />
            <div className="tabs">
              <button className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>All networks</button>
              {chosen.map((a) => (
                <button key={a.id} className={tab === a.id ? "on" : ""} onClick={() => setTab(a.id)}>
                  <NetBadge network={a.network} size={20} />{formatOf(a.network, cfgOf(a).type).label}
                  {problems[a.id]?.length ? <span className="bad">⚠ {problems[a.id].length}</span> : <span className="ok">✓</span>}
                </button>))}
            </div>

            {tab === "all" && (chosen.length === 0 ? <p className="count">Select at least one network above, then choose a format (post, reel, story, short…) for each.</p> : (
              <div>
                {chosen.map((a) => (
                  <div className="sumrow" key={a.id}>
                    <NetBadge network={a.network} size={30} /><div style={{ flex: 1 }}><b>{NETWORKS[a.network as Network].label}</b><div className="count">{a.handle}</div></div>
                    <select value={cfgOf(a).type} onChange={(e) => setType(a, e.target.value)}>{NETWORKS[a.network as Network].formats.map((f) => <option key={f.key} value={f.key}>{f.icon} {f.label}</option>)}</select>
                    <button className="sm" onClick={() => setTab(a.id)}>{problems[a.id]?.length ? <span className="bad" style={{ color: "var(--bad)" }}>⚠ {problems[a.id].length} to fix</span> : "Settings ›"}</button>
                  </div>))}
              </div>))}

            {activeAcct && (() => {
              const a = activeAcct, c = cfgOf(a), nw = NETWORKS[a.network as Network], f = formatOf(a.network, c.type);
              return (
                <div>
                  <div className="seg" style={{ marginBottom: 8 }}>{nw.formats.map((x) => <button key={x.key} className={c.type === x.key ? "on" : ""} onClick={() => setType(a, x.key)}>{x.icon} {x.label}</button>)}</div>
                  <div className="help" style={{ marginBottom: 10 }}>{f.hint} {f.media.max > 0 && <>Media: {f.media.min === f.media.max ? f.media.min : `${f.media.min}–${f.media.max}`} {f.media.kinds.join("/")}.</>}</div>
                  {f.usesText && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                        <input type="checkbox" checked={c.custom} onChange={(e) => patch(a, { custom: e.target.checked, content: c.content || content })} />Write different {f.textLabel.toLowerCase()} for {nw.label}</label>
                      {c.custom && <textarea style={{ marginTop: 8, minHeight: 90 }} value={c.content} onChange={(e) => patch(a, { content: e.target.value })} />}
                      <div className={`count ${textFor(a).length > f.textMax ? "over" : ""}`}>{f.textLabel}: {textFor(a).length}/{f.textMax}</div>
                    </div>)}
                  {f.fields.length > 0 && <div className="fgrid">{f.fields.map((fld) => (
                    <div key={fld.key} className={fld.type === "list" ? "full" : ""}><FieldInput field={fld} value={c.options[fld.key]} onChange={(v) => setOpt(a, fld.key, v)} /></div>))}</div>}
                  {problems[a.id]?.map((p, i) => <div className="warn" key={i}>⚠ {p}</div>)}
                </div>);
            })()}
          </div>

          <div className="card">
            <h2><span className="step">3</span>Media</h2>
            <div className="strip">
              {media.map((m, i) => (
                <div className="att" key={m.id}><MediaThumb asset={m} />
                  <div className="row"><button disabled={i === 0} onClick={() => move(i, -1)}>←</button><button disabled={i === media.length - 1} onClick={() => move(i, 1)}>→</button>
                    <button className="dng" onClick={() => setMedia(media.filter((x) => x.id !== m.id))}>✕</button></div></div>))}
              <button className="addtile" onClick={() => setPicker(true)}>＋ Add<br />media</button>
            </div>
            <div className="help">Order = display order. Images, videos and PDFs are checked against every selected network's format.</div>
          </div>

          <div className="card">
            <h2><span className="step">4</span>Schedule</h2>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ maxWidth: 260 }} />
            <div className="quick">
              <button className="sm" onClick={() => { const d = new Date(Date.now() + 36e5); d.setMinutes(0, 0, 0); setWhen(toLocal(d)); }}>In 1 hour</button>
              <button className="sm" onClick={() => quick(9, 1)}>Tomorrow 9:00</button><button className="sm" onClick={() => quick(12, 1)}>Tomorrow 12:00</button>
              <button className="sm" onClick={() => quick(9, 0, true)}>Next Monday 9:00</button>
            </div>
            {total > 0 && <div style={{ marginTop: 12 }}>{chosen.filter((a) => problems[a.id].length).map((a) => <div className="warn" key={a.id}>⚠ <b>{NETWORKS[a.network as Network].label}</b> needs attention ({problems[a.id].length}) — <a style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setTab(a.id)}>fix</a></div>)}</div>}
            {err && <div className="err">{err}</div>}
            {post?.targets?.filter((t: any) => t.error).map((t: any) => <div className="err" key={t.account_id}>{NETWORKS[t.network as Network].label}: {t.error}</div>)}
            <div className="row wrap" style={{ marginTop: 16 }}>
              <button className="pri" disabled={busy || total > 0 || !chosen.length} onClick={() => submit("schedule")}>Schedule</button>
              <button disabled={busy || total > 0 || !chosen.length} onClick={() => submit("publish_now")}>Publish now</button>
              <button disabled={busy} onClick={() => submit("draft")}>Save draft</button>
              <span className="sp" />{id && <button className="dng" onClick={del}>Delete</button>}
            </div>
          </div>
        </div>

        <div className="sticky">
          <div className="seg" style={{ marginBottom: 10 }}>
            {chosen.map((a) => <button key={a.id} className={pvAcct?.id === a.id ? "on" : ""} onClick={() => setPv(a.id)}><NetBadge network={a.network} size={18} /></button>)}
            {!chosen.length && <span className="count" style={{ padding: 6 }}>Preview</span>}
          </div>
          {pvAcct ? <PostPreview account={pvAcct} type={cfgOf(pvAcct).type} text={textFor(pvAcct)} options={cfgOf(pvAcct).options} media={media} />
            : <div className="pv"><div className="pvempty">Select a network to preview your post.</div></div>}
        </div>
      </div>
      {picker && <MediaPicker selectedIds={media.map((m) => m.id)} onClose={() => setPicker(false)} onDone={(picked) => { setMedia(picked); setPicker(false); }} />}
    </>
  );
}
