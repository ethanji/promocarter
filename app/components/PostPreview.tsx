import { NETWORKS, Network, formatOf } from "@/lib/networks";
import type { Asset } from "@/lib/media";
import MediaThumb from "./MediaThumb";
import NetBadge from "./NetBadge";

export default function PostPreview({ account, type, text, options, media }: { account: { network: string; handle: string }; type: string; text: string; options: Record<string, any>; media: Asset[] }) {
  const net = account.network as Network, f = formatOf(net, type), shown = media.slice(0, f.media.max || 0);
  const thread: string[] = Array.isArray(options.thread) ? options.thread.filter(Boolean) : [];
  const poll: string[] = Array.isArray(options.pollOptions) ? options.pollOptions.filter(Boolean) : [];
  return (
    <div className="pv">
      <div className="pvhead"><NetBadge network={net} size={34} /><div><b>{account.handle}</b><div className="count">{NETWORKS[net].label} · {f.icon} {f.label}</div></div></div>
      {options.title && <div className="pvtitle">{options.title}</div>}
      {f.media.max > 0 && (shown.length ? (
        f.shape === "free" ? <div className={`pvmedia free ${shown.length === 1 ? "one" : ""}`}>{shown.map((m) => <MediaThumb key={m.id} asset={m} controls={m.kind === "video" && shown.length === 1} />)}</div>
          : <div className={`pvmedia ${f.shape}`}><MediaThumb asset={shown[0]} />{shown.length > 1 && <span className="more">1/{shown.length}</span>}</div>
      ) : f.media.min > 0 ? <div className="pvempty">Add {f.media.kinds.join(" / ")}{f.media.max > 1 ? ` (${f.media.min}–${f.media.max})` : ""}</div> : null)}
      <div className="pad">
        {f.usesText ? <p>{text || <span className="count">Your text appears here…</span>}</p> : <p className="count">{f.label}s don't use captions.</p>}
        {poll.map((o, i) => <div className="pollopt" key={i}>{o}</div>)}
        {thread.map((t, i) => <div className="threadp" key={i}><p>{t}</p></div>)}
        {options.link && <div className="count" style={{ marginTop: 8 }}>🔗 {options.link}</div>}
        {options.start && <div className="count" style={{ marginTop: 8 }}>📅 {options.start} → {options.end || "…"}</div>}
        {options.couponCode && <div className="count">🏷 Code: {options.couponCode}</div>}
        {options.board && <div className="count">📌 Board: {options.board}</div>}
        {options.visibility && options.visibility !== "public" && <div className="count">👁 {options.visibility}</div>}
      </div>
    </div>
  );
}
