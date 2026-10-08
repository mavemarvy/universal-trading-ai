import Link from "next/link";
import {
  Activity, BarChart3, Bot, BrainCircuit, Cable, Gauge, History, KeyRound,
  LayoutDashboard, Newspaper, RadioTower, ScrollText, Settings2, ShieldAlert, ShieldCheck, CandlestickChart,
  SlidersHorizontal, Users, Zap
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  ["Overview", LayoutDashboard, "/dashboard", "overview"],
  ["Users", Users, "/users", "users"],
  ["Platforms", Cable, "/platforms", "platforms"],
  ["Connections", Cable, "/connections", "connections"],
  ["Market Data", CandlestickChart, "/market-data", "market-data"],
  ["Data & Providers", RadioTower, "/providers", "providers"],
  ["News & Macro", Newspaper, "/news", "news"],
  ["AI & Models", BrainCircuit, "/ai", "ai"],
  ["Strategies", Bot, "/strategies", "strategies"],
  ["Risk Control", Gauge, "/risk", "risk"],
  ["Incidents", ShieldAlert, "/incidents", "incidents"],
  ["Execution", BarChart3, "/execution", "execution"],
  ["Audit Trail", ScrollText, "/audit", "audit"],
  ["Feature Registry", History, "/features", "features"],
  ["Secrets & Config", KeyRound, "/configuration", "configuration"],
  ["Settings", Settings2, "/settings", "settings"],
] as const;

export function AdminAppShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="control-shell admin-routed-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <div className="brand-mark"><Zap size={18}/></div>
          <div><strong>UTAI</strong><span>Control Plane</span></div>
        </Link>
        <div className="nav-label">CONTROL CENTER</div>
        <nav className="side-nav">
          {nav.map(([label,Icon,href,key])=>(
            <Link key={key} href={href} className={active===key ? "nav-item active" : "nav-item"}>
              <Icon size={17}/><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="security-chip"><ShieldCheck size={16}/><div><strong>Hardened session</strong><span>MFA / AAL2 enforced</span></div></div>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar admin-route-topbar">
          <div><p className="eyebrow">UNIVERSAL TRADING AI</p><h1>{title}</h1>{subtitle ? <span className="admin-route-subtitle">{subtitle}</span> : null}</div>
          <div className="topbar-actions"><span className="live-pill"><span className="live-dot"/> Production</span><Link href="/settings" className="role-pill">SUPER ADMIN</Link></div>
        </header>
        <div className="admin-route-content">{children}</div>
      </section>
    </main>
  );
}
