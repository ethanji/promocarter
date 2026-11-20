import "./globals.css";
import Sidebar from "./components/Sidebar";
export const metadata = { title: "PromoCarter", description: "Social media planner" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <div className="shell"><Sidebar /><div className="content"><main>{children}</main></div></div>
    </body></html>
  );
}
