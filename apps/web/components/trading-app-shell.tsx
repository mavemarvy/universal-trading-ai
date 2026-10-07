import Link from "next/link";
import {
  Bell, BrainCircuit, Cable, CandlestickChart, Gauge, History, Home,
  LayoutDashboard, Radar, Search, TrendingUp, UserCircle, Wallet, BookOpen, Zap
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  ["Overview", LayoutDashboard, "/dashboard", "overview"],
  ["Markets", CandlestickChart, "/markets", "markets"],
  ["AI Trade", BrainCircuit, "/ai", "ai"],
  ["Positions", TrendingUp, "/positions", "positions"],
  ["Portfolio", Wallet, "/portfolio", "portfolio"],
  ["Risk", Gauge, "/risk", "risk"],
  ["Research", Radar, "/research", "research"],
  ["Connections", Cable, "/connections", "connections"],
  ["Journal", History, "/journal", "journal"],
  ["Learn", BookOpen, "/learning", "learning"],
  ["Profile", UserCircle, "/profile", "profile"],
] as const;

export function TradingAppShell({
  active,
  title,
  subtitle,
  displayName,
  notificationCount,
  children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  displayName: string;
  notificationCount: number;
  children: ReactNode;
}) {
  return (
    <main className="exchange-shell routed-shell">
      <aside className="exchange-sidebar">
        <Link href="/dashboard" className="exchange-brand">
          <div className="exchange-logo"><Zap size={17} /></div>
          <div><strong>UTAI</strong><span>Universal Trading AI</span></div>
        </Link>
        <nav className="exchange-side-nav">
          {nav.map(([label, Icon, href, key]) => (
            <Link href={href} className={active === key ? "exchange-side-item active" : "exchange-side-item"} key={key}>
              <Icon size={17} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-mode">
          <span className="side-mode-dot" />
          <div><strong>Analysis / Paper</strong><span>Live execution fail-closed</span></div>
        </div>
      </aside>

      <section className="exchange-main">
        <header className="exchange-topbar routed-topbar">
          <Link href="/profile" className="mobile-avatar" aria-label="Open profile">
            {displayName.slice(0,1).toUpperCase()}
          </Link>
          <Link href="/markets" className="search-shell">
            <Search size={17} /><span>Search markets, symbols, tokens…</span>
          </Link>
          <div className="route-title">
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          <div className="topbar-tools">
            <Link href="/profile" className="desktop-user">{displayName}</Link>
            <Link href="/notifications" aria-label="Notifications" className="icon-button">
              <Bell size={18} />
              {notificationCount ? <b>{notificationCount}</b> : null}
            </Link>
          </div>
        </header>
        <div className="route-content">{children}</div>
      </section>

      <nav className="mobile-bottom-nav">
        <Link href="/dashboard" className={active === "overview" ? "active" : ""}><Home size={21}/><span>Home</span></Link>
        <Link href="/markets" className={active === "markets" ? "active" : ""}><CandlestickChart size={21}/><span>Markets</span></Link>
        <Link href="/ai" className={active === "ai" ? "active trade-center" : "trade-center"}><BrainCircuit size={22}/><span>AI Trade</span></Link>
        <Link href="/risk" className={active === "risk" ? "active" : ""}><Gauge size={21}/><span>Risk</span></Link>
        <Link href="/portfolio" className={active === "portfolio" ? "active" : ""}><Wallet size={21}/><span>Assets</span></Link>
      </nav>
    </main>
  );
}
