"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [["/", "🗓", "Planner"], ["/media", "🖼", "Media library"], ["/accounts", "🔗", "Connections"]] as const;
export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="side">
      <div className="logo"><i>✈</i>PromoCarter</div>
      <Link className="createbtn" href="/compose">＋ Create post</Link>
      {items.map(([href, icon, label]) => (
        <Link key={href} href={href} className={`nav ${(href === "/" ? path === "/" || path.startsWith("/compose") : path.startsWith(href)) ? "on" : ""}`}><span>{icon}</span>{label}</Link>
      ))}
      <div className="sp" />
      <small>Demo mode: publishing is simulated.</small>
    </aside>
  );
}
