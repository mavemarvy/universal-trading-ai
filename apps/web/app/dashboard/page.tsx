import { redirect } from "next/navigation";
import {
  Bell,
  Bitcoin,
  BookOpen,
  Bot,
  BrainCircuit,
  Cable,
  CandlestickChart,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  Newspaper,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveActivity } from "@/components/live-activity";
import { LiveMarketStream } from "@/components/live-market-stream";

type PositionRow = {
  id: string;
  instrument_key: string;
  side: string;
  quantity: string | number;
  entry_price: string | number | null;
  current_price: string | number | null;
  leverage: string | number | null;
  status: string;
  opened_at: string;
};

type IntentRow = {
  id: string;
  instrument_key: string;
  action: string;
  confidence: string | number | null;
  market_regime: string | null;
  reason_summary: string | null;
  created_at: string;
};

type ConnectionRow = {
  id: string;
  automation_mode: string;
  status: string;
  last_health_at: string | null;
  trading_platforms: { name: string; family: string | null }[] | null;
};

const desktopNav = [
  ["Overview", LayoutDashboard, "/dashboard"],
  ["Markets", CandlestickChart, "/markets"],
  ["AI Trade", BrainCircuit, "/ai"],
  ["Positions", TrendingUp, "/positions"],
  ["Portfolio", Wallet, "/portfolio"],
  ["Risk", Gauge, "/risk"],
  ["Research", Radar, "/research"],
  ["Connections", Cable, "/connections"],
  ["Journal", History, "/journal"],
  ["Learn", BookOpen, "/learning"],
] as const;

const marketGroups = [
  ["Crypto", Bitcoin, "Exchange market feed required"],
  ["Forex", Landmark, "Broker / FX market feed required"],
  ["Memecoins", Radar, "On-chain feed + token security required"],
  ["Stocks & Indices", TrendingUp, "Licensed market feed required"],
] as const;

function money(value?: string | number | null, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function numeric(value?: string | number | null) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en").format(n) : "—";
}

function confidence(value?: string | number | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n <= 1 ? n * 100 : n)}%`;
}

function statusClass(status?: string | null) {
  const value = (status || "UNKNOWN").toUpperCase();
  if (["CONNECTED", "HEALTHY", "ACTIVE", "OPEN", "APPROVE", "IMPLEMENTED"].includes(value)) return "exchange-status ok";
  if (["DEGRADED", "PENDING", "IN_PROGRESS", "WATCH", "WAIT"].includes(value)) return "exchange-status warn";
  if (["FAILED", "BLOCKED", "REJECT", "CLOSED", "ERROR"].includes(value)) return "exchange-status danger";
  return "exchange-status neutral";
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const [
    profileResult,
    settingsResult,
    riskResult,
    positionsResult,
    intentsResult,
    connectionsResult,
    paperResult,
    watchlistsResult,
    alertsResult,
    notificationsResult,
    ordersResult,
  ] = await Promise.all([
    supabase.from("profiles").select("display_name,onboarding_complete").eq("id", userId).maybeSingle(),
    supabase.from("user_settings").select("beginner_mode,locale,timezone").eq("user_id", userId).maybeSingle(),
    supabase.from("risk_profiles").select("mode,trading_capital,max_acceptable_loss,profit_target").eq("user_id", userId).maybeSingle(),
    supabase.from("positions").select("id,instrument_key,side,quantity,entry_price,current_price,leverage,status,opened_at").eq("user_id", userId).order("opened_at", { ascending: false }).limit(8),
    supabase.from("trade_intents").select("id,instrument_key,action,confidence,market_regime,reason_summary,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("platform_connections").select("id,automation_mode,status,last_health_at,trading_platforms(name,family)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("paper_accounts").select("id,name,base_currency,starting_equity,current_equity").eq("user_id", userId).limit(3),
    supabase.from("watchlists").select("id,name").eq("user_id", userId),
    supabase.from("alerts").select("id,enabled,mandatory").eq("user_id", userId),
    supabase.from("notifications").select("id,category,title,body,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
    supabase.from("orders").select("id,status").eq("user_id", userId),
  ]);

  const profile = profileResult.data;
  const settings = settingsResult.data;
  const risk = riskResult.data;
  const positions = (positionsResult.data ?? []) as PositionRow[];
  const intents = (intentsResult.data ?? []) as IntentRow[];
  const connections = (connectionsResult.data ?? []) as ConnectionRow[];
  const paperAccounts = paperResult.data ?? [];
  const watchlists = watchlistsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const orders = ordersResult.data ?? [];

  const connected = connections.filter((item) =>
    ["CONNECTED", "HEALTHY", "ACTIVE"].includes(String(item.status).toUpperCase())
  );
  const openPositions = positions.filter((item) => String(item.status).toUpperCase() === "OPEN");
  const enabledAlerts = alerts.filter((item) => item.enabled);
  const paper = paperAccounts[0];
  const displayName = profile?.display_name || "Trader";
  const accountValue = paper?.current_equity ?? risk?.trading_capital ?? null;
  const accountCurrency = paper?.base_currency || "USD";

  return (
    <main className="exchange-shell">
      <aside className="exchange-sidebar" aria-label="Trading navigation">
        <div className="exchange-brand">
          <div className="exchange-logo"><Zap size={17} /></div>
          <div><strong>UTAI</strong><span>Universal Trading AI</span></div>
        </div>

        <nav className="exchange-side-nav">
          {desktopNav.map(([label, Icon, href], index) => (
            <a href={href} className={index === 0 ? "exchange-side-item active" : "exchange-side-item"} key={label}>
              <Icon size={17} /><span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="side-mode">
          <span className="side-mode-dot" />
          <div>
            <strong>Analysis / Paper</strong>
            <span>Live orders fail-closed</span>
          </div>
        </div>
      </aside>

      <section className="exchange-main">
        <header className="exchange-topbar">
          <a href="/profile" className="mobile-avatar" aria-label="Open profile">{displayName.slice(0, 1).toUpperCase()}</a>
          <div className="search-shell">
            <Search size={17} />
            <span>Search markets, symbols, tokens…</span>
          </div>
          <div className="topbar-tools">
            <a href="/profile" className="desktop-user">{displayName}</a>
            <a href="/notifications" aria-label="Notifications" className="icon-button">
              <Bell size={18} />
              {notifications.length ? <b>{notifications.length}</b> : null}
            </a>
          </div>
        </header>

        <section className="exchange-account" id="home">
          <div className="account-top">
            <div>
              <span className="eyebrow-label">TOTAL TRADING VALUE</span>
              <div className="balance-row">
                <strong>{accountValue == null ? "—" : money(accountValue, accountCurrency)}</strong>
                <span>{accountCurrency}</span>
              </div>
              <p>
                {paper
                  ? `Paper account · ${paper.name}`
                  : "No paper account yet · Analysis mode active"}
              </p>
            </div>
            <span className="paper-mode-badge"><span /> PAPER / ANALYSIS</span>
          </div>

          <div className="account-summary-grid">
            <div><span>Risk mode</span><strong>{risk?.mode || "Not configured"}</strong></div>
            <div><span>Open positions</span><strong>{openPositions.length}</strong></div>
            <div><span>Connected venues</span><strong>{connected.length}/{connections.length}</strong></div>
            <div><span>AI intents</span><strong>{intents.length}</strong></div>
          </div>

          <div className="quick-actions">
            <a href="/connections"><span><Cable size={19} /></span><b>Connect</b></a>
            <a href="/ai"><span><BrainCircuit size={19} /></span><b>AI Scan</b></a>
            <a href="/paper"><span><CircleDollarSign size={19} /></span><b>Paper</b></a>
            <a href="/risk"><span><Gauge size={19} /></span><b>Risk</b></a>
          </div>
        </section>

        <LiveMarketStream />

        <section className="ai-strip" id="ai">
          <div className="ai-strip-icon"><BrainCircuit size={24} /></div>
          <div className="ai-strip-copy">
            <span className="eyebrow-label">AI COPILOT</span>
            <strong>{intents.length ? `${intents.length} evidence-backed setup${intents.length === 1 ? "" : "s"} available` : "Waiting for verified market evidence"}</strong>
            <p>
              {intents.length
                ? "Every setup still passes portfolio, deterministic risk and platform capability checks before any execution."
                : "Connect an approved market-data source to unlock live analysis. UTAI will not invent prices or signals."}
            </p>
          </div>
          <a href="/ai" className="ai-strip-arrow" aria-label="Open AI opportunities"><ChevronRight size={22} /></a>
        </section>

        <section className="market-section" id="markets">
          <div className="market-section-head">
            <h2>Markets</h2>
            <div className="market-tabs">
              <span className="active">Overview</span>
              <span>Watchlist</span>
              <span>Crypto</span>
              <span>Forex</span>
              <span>Memecoins</span>
            </div>
          </div>

          <div className="market-table">
            <div className="market-table-head">
              <span>Market</span><span>Price</span><span>24h</span>
            </div>
            {marketGroups.map(([label, Icon, note]) => (
              <div className="market-row" key={label}>
                <div className="market-symbol">
                  <span className="market-coin"><Icon size={18} /></span>
                  <div><strong>{label}</strong><small>{note}</small></div>
                </div>
                <span className="market-offline">—</span>
                <span className="market-feed-state">FEED OFFLINE</span>
              </div>
            ))}
          </div>

          <div className="market-truth-note">
            <ShieldCheck size={16} />
            <span>No placeholder prices. Real market rows appear only when an approved provider is connected.</span>
          </div>
        </section>

        <div className="exchange-content-grid">
          <section className="exchange-card span-7" id="opportunities">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">AI OPPORTUNITIES</span><h3>Trade setups</h3></div>
              <Sparkles size={20} />
            </div>

            {intents.length ? (
              <div className="setup-list">
                {intents.map((intent) => (
                  <article className="setup-row" key={intent.id}>
                    <div className="setup-symbol">{intent.instrument_key.slice(0, 3)}</div>
                    <div className="setup-info">
                      <strong>{intent.instrument_key}</strong>
                      <span>{intent.market_regime || "Regime unknown"}</span>
                      <small>{intent.reason_summary || "Evidence summary unavailable"}</small>
                    </div>
                    <div className="setup-score">
                      <span className={statusClass(intent.action)}>{intent.action}</span>
                      <strong>{confidence(intent.confidence)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="exchange-empty">
                <BrainCircuit size={30} />
                <strong>No live AI setups yet</strong>
                <span>The analysis engine needs verified provider data before emitting a TradeIntent.</span>
              </div>
            )}
          </section>

          <section className="exchange-card span-5" id="positions">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">POSITIONS</span><h3>Open exposure</h3></div>
              <TrendingUp size={20} />
            </div>
            {positions.length ? (
              <div className="exchange-position-list">
                {positions.map((position) => (
                  <div className="exchange-position" key={position.id}>
                    <div>
                      <strong>{position.instrument_key}</strong>
                      <span>{position.side} · {numeric(position.quantity)} qty · {numeric(position.leverage)}x</span>
                    </div>
                    <div className="exchange-position-right">
                      <b>{position.current_price == null ? "Price unavailable" : numeric(position.current_price)}</b>
                      <span className={statusClass(position.status)}>{position.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="exchange-empty small">
                <Target size={27} />
                <strong>No open positions</strong>
                <span>Paper and approved live positions will appear here.</span>
              </div>
            )}
          </section>

          <section className="exchange-card span-5" id="risk">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">RISK CENTER</span><h3>Trading limits</h3></div>
              <Gauge size={20} />
            </div>
            <div className="risk-exchange-grid">
              <div><span>Trading capital</span><strong>{money(risk?.trading_capital)}</strong></div>
              <div><span>Max loss</span><strong>{money(risk?.max_acceptable_loss)}</strong></div>
              <div><span>Profit target</span><strong>{money(risk?.profit_target)}</strong></div>
              <div><span>Automation</span><strong>OFF</strong></div>
            </div>
            <div className="risk-authority-note">
              <ShieldCheck size={16} />
              <span>Deterministic risk always overrides AI recommendations.</span>
            </div>
          </section>

          <section className="exchange-card span-7" id="connections">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">PLATFORM CONNECTIONS</span><h3>Broker / exchange access</h3></div>
              <Cable size={20} />
            </div>

            {connections.length ? (
              <div className="connection-exchange-list">
                {connections.map((connection) => (
                  <div className="connection-exchange-row" key={connection.id}>
                    <div className="connection-exchange-logo">
                      {(connection.trading_platforms?.[0]?.name || "?").slice(0, 1)}
                    </div>
                    <div>
                      <strong>{connection.trading_platforms?.[0]?.name || "Unknown platform"}</strong>
                      <span>{connection.trading_platforms?.[0]?.family || "Venue"} · {connection.automation_mode}</span>
                    </div>
                    <span className={statusClass(connection.status)}>{connection.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="exchange-empty small">
                <Cable size={27} />
                <strong>No trading venue connected</strong>
                <span>Use official read + trading permissions only. Withdrawal access is never required.</span>
              </div>
            )}
          </section>

          <section className="exchange-card span-4" id="paper">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">PAPER TRADING</span><h3>Simulation account</h3></div>
              <CircleDollarSign size={20} />
            </div>
            {paper ? (
              <div className="paper-wallet-card">
                <span>{paper.name}</span>
                <strong>{money(paper.current_equity, paper.base_currency || "USD")}</strong>
                <div><span>Starting</span><b>{money(paper.starting_equity, paper.base_currency || "USD")}</b></div>
                <div><span>Orders</span><b>{orders.length}</b></div>
              </div>
            ) : (
              <div className="exchange-empty small">
                <CircleDollarSign size={26} />
                <strong>Paper account not created</strong>
                <span>Safe onboarding begins in simulation.</span>
              </div>
            )}
          </section>

          <section className="exchange-card span-4" id="research">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">RESEARCH</span><h3>Market intelligence</h3></div>
              <Radar size={20} />
            </div>
            <div className="research-exchange-list">
              <div><Newspaper size={17} /><span>News & Macro</span><b>Not configured</b></div>
              <div><ShieldCheck size={17} /><span>Token Security</span><b>Not configured</b></div>
              <div><Wallet size={17} /><span>Wallet Network</span><b>Not configured</b></div>
              <div><Bot size={17} /><span>Sniper / Bot Activity</span><b>Not configured</b></div>
            </div>
          </section>

          <section className="exchange-card span-4" id="portfolio">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">ACCOUNT</span><h3>Portfolio state</h3></div>
              <Wallet size={20} />
            </div>
            <div className="account-state-list">
              <div><span>Watchlists</span><strong>{watchlists.length}</strong></div>
              <div><span>Alerts enabled</span><strong>{enabledAlerts.length}</strong></div>
              <div><span>Notifications</span><strong>{notifications.length}</strong></div>
              <div><span>Onboarding</span><strong>{profile?.onboarding_complete ? "Complete" : "Incomplete"}</strong></div>
            </div>
          </section>

          <section className="exchange-card span-8" id="journal">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">AI DECISION JOURNAL</span><h3>How every trade is controlled</h3></div>
              <History size={20} />
            </div>
            <div className="decision-flow">
              <div><span>01</span><strong>Evidence</strong><small>Market + news + on-chain truth</small></div>
              <i />
              <div><span>02</span><strong>AI TradeIntent</strong><small>Structured proposal</small></div>
              <i />
              <div><span>03</span><strong>Portfolio + Risk</strong><small>Deterministic approval</small></div>
              <i />
              <div><span>04</span><strong>Execution</strong><small>Only where permitted</small></div>
            </div>
          </section>

          <section className="exchange-card emergency-card span-4" id="learning">
            <div className="exchange-card-head">
              <div><span className="eyebrow-label">SAFETY</span><h3>Emergency stop</h3></div>
              <ShieldAlert size={20} />
            </div>
            <div className="emergency-core"><Zap size={25} /></div>
            <strong className="emergency-copy-title">Always accessible</strong>
            <p>Destructive close-all controls require explicit confirmation and exact account context. Live trading is not authorized yet.</p>
            <span className="safety-lock">LIVE EXECUTION LOCKED</span>
          </section>
        </div>

        <LiveActivity userId={userId} />

        <footer className="exchange-footer">
          <span>Universal Trading AI</span>
          <span>Analysis/Paper default · No guaranteed returns</span>
        </footer>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
        <a href="/dashboard" className="active"><Home size={21} /><span>Home</span></a>
        <a href="/markets"><CandlestickChart size={21} /><span>Markets</span></a>
        <a href="/ai" className="trade-center"><BrainCircuit size={22} /><span>AI Trade</span></a>
        <a href="/risk"><Gauge size={21} /><span>Risk</span></a>
        <a href="/portfolio"><Wallet size={21} /><span>Assets</span></a>
      </nav>
    </main>
  );
}
