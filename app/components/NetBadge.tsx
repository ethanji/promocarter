import { NETWORKS, Network } from "@/lib/networks";

export function NetBadge({ network, size = 28 }: { network: Network | string; size?: number }) {
  const n = NETWORKS[network as Network];
  if (!n) return null;
  return <span className="nb" title={n.label} style={{ width: size, height: size, background: n.color, fontSize: Math.round(size * (n.short.length > 1 ? 0.38 : 0.5)) }}>{n.short}</span>;
}
export function NetBadges({ networks, size = 18, max = 4 }: { networks: string[]; size?: number; max?: number }) {
  const uniq = [...new Set(networks)];
  return <span className="nbs">{uniq.slice(0, max).map((n) => <NetBadge key={n} network={n} size={size} />)}{uniq.length > max && <span className="nb" style={{ width: size, height: size, background: "#667085", fontSize: size * 0.4 }}>+{uniq.length - max}</span>}</span>;
}

export default NetBadge;
