import { fileUrl } from "@/lib/client";
import type { Asset } from "@/lib/media";

export default function MediaThumb({ asset, controls = false, className = "" }: { asset: Pick<Asset, "id" | "kind" | "name" | "alt">; controls?: boolean; className?: string }) {
  if (asset.kind === "document")
    return <div className={`thumb doc ${className}`}><span>📄</span><small>{asset.name}</small>{controls && <a className="btn" href={fileUrl(asset.id)} target="_blank">Open PDF</a>}</div>;
  return asset.kind === "video" ? (
    <div className={`thumb ${className}`}>
      <video src={`${fileUrl(asset.id)}#t=0.1`} preload="metadata" muted={!controls} controls={controls} playsInline />
      {!controls && <span className="badge">▶</span>}
    </div>
  ) : (
    <div className={`thumb ${className}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={fileUrl(asset.id)} alt={asset.alt || asset.name} loading="lazy" /></div>
  );
}
