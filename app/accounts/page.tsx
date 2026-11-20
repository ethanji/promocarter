"use client";
import { useEffect, useState } from "react";
import { NETWORKS, NETWORK_KEYS, Network } from "@/lib/networks";
import NetBadge from "../components/NetBadge";

export default function Accounts() {
  const [list, setList] = useState<any[]>([]);
  const [network, setNetwork] = useState<Network>("instagram");
  const [handle, setHandle] = useState("");
  const load = () => fetch("/api/accounts").then((r) => r.json()).then(setList);
  useEffect(() => { load(); }, []);
  async function add() {
    if (!handle.trim()) return;
    await fetch("/api/accounts", { method: "POST", body: JSON.stringify({ network, handle }) });
    setHandle(""); load();
  }
  return (
    <>
      <div className="toolbar"><h1>Connections</h1></div>
      <div className="card">
        <h2>Connect a network</h2>
        <div className="ntiles">
          {NETWORK_KEYS.map((n) => (
            <div key={n} className={`ntile ${network === n ? "on" : ""}`} onClick={() => setNetwork(n)}>
              <NetBadge network={n} size={40} />{NETWORKS[n].label}
              <small>{NETWORKS[n].formats.map((f) => f.label).join(" · ")}</small>
            </div>))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <input placeholder={`${NETWORKS[network].label} handle or channel name`} value={handle} onChange={(e) => setHandle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="pri" onClick={add}>Connect</button>
        </div>
        <p className="help">Connections are simulated: posts go through a mock connector (<code>lib/connectors.ts</code>) until a real one is implemented.</p>
      </div>
      <div className="card list">
        <h2>Connected ({list.length})</h2>
        {list.length === 0 && <p className="count">Nothing connected yet.</p>}
        {list.map((a) => (
          <div key={a.id}>
            <NetBadge network={a.network} size={34} />
            <div><b>{NETWORKS[a.network as Network].label}</b><div className="count">{a.handle}</div></div><span className="sp" />
            <span className="count">{NETWORKS[a.network as Network].formats.map((f) => f.label).join(" · ")}</span>
            <button className="dng" onClick={async () => { if (confirm(`Disconnect ${a.handle}?`)) { await fetch(`/api/accounts?id=${a.id}`, { method: "DELETE" }); load(); } }}>Remove</button>
          </div>))}
      </div>
    </>
  );
}
