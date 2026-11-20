import { NETWORKS, Network } from "@/lib/networks";
export default function Dots({ targets }: { targets: { network: string }[] }) {
  return <span className="dots">{targets.map((t, i) => <i key={i} className="dot" style={{ background: NETWORKS[t.network as Network]?.color }} />)}</span>;
}
