import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bitcoin,
  BookOpen,
  Bot,
  BrainCircuit,
  Cable,
  CandlestickChart,
  CircleDollarSign,
  Gauge,
  History,
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

const nav = [
  ["Overview", LayoutDashboard, "#overview"],
  ["Markets", CandlestickChart, "#terminal"],
  ["AI Terminal", BrainCircuit, "#terminal"],
  ["Opportunities", Sparkles, "#opportunities"],
  ["Positions", TrendingUp, "#positions"],
  ["Portfolio", Wallet, "#portfolio"],
  ["Risk", Gauge, "#risk"],
  ["News & Macro", Newspaper, "#research"],
  ["Token Security", ShieldCheck, "#research"],
  ["Connections", Cable, "#connections"],
  ["Paper Trading", CircleDollarSign, "#paper"],
  ["Journal", History, "#journal"],
  ["Learning", BookOpen, "#learning"],
  ["Emergency Stop", ShieldAlert, "#emergency"],
] as const;

const researchAreas = [
  ["Forex", Landmark, "Official broker/market feed required"],
  ["Crypto", Bitcoin, "Exchange feed required"],
  ["Memecoins", Radar, "On-chain/security providers required"],
  ["Stocks & Futures", BarChart3, "Licensed market feed required"],
  ["Wallet Network", Wallet, "Chain indexer required"],
  ["Token Security", ShieldCheck, "Security provider required"],
  ["Creator Research", Search, "Research sources required"],
  ["Sniper / Bot Activity", Bot, "On-chain detection feed required"],
] as const;

function money(value?: string | number | null, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not set";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function number(value?: string | number | null) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en").format(n) : "—";
}

function confidence(value?: string | number | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Unrated";
  return `${Math.round(n <= 1 ? n * 100 : n)}%`;
}

function statusClass(status?: string | null) {
  const value = (status || "UNKNOWN").toUpperCase();
  if (["CONNECTED", "HEALTHY", "ACTIVE", "OPEN", "APPROVE", "IMPLEMENTED"].includes(value)) return "user-status ok";
  if (["DEGRADED", "PENDING", "IN_PROGRESS", "WATCH", "WAIT"].includes(value)) return "user-status warn";
  if (["FAILED", "BLOCKED", "REJECT", "CLOSED", "ERROR"].includes(value)) return "user-status danger";
  return "user-status neutral";
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
    supabase
      .from("risk_profiles")
      .select("mode,trading_capital,max_acceptable_loss,profit_target")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("positions")
      .select("id,instrument_key,side,quantity,entry_price,current_price,leverage,status,opened_at")
      .eq("user_id", userId)
      .order("opened_at", { ascending: false })
      .limit(6),
    supabase
      .from("trade_intents")
      .select("id,instrument_key,action,confidence,market_regime,reason_summary,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("platform_connections")
      .select("id,automation_mode,status,last_health_at,trading_platforms(name,family)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("paper_accounts").select("id,name,base_currency,starting_equity,current_equity").eq("user_id", userId).limit(3),
    supabase.from("watchlists").select("id,name").eq("user_id", userId),
    supabase.from("alerts").select("id,enabled,mandatory").eq("user_id", userId),
    supabase
      .from("notifications")
      .select("id,category,title,body,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
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
  const openPositions = positions.filter((item) => String(item.status).toUpperCase() === "OPEN");
  const connected = connections.filter((item) =>
    ["CONNECTED", "HEALTHY", "ACTIVE"].includes(String(item.status).toUpperCase())
  );
  const enabledAlerts = alerts.filter((item) => item.enabled);
  const paper = paperAccounts[0];

  return (
    <main className="trading-shell">
      <aside className="trading-sidebar" aria-label="Trading navigation">
        <div className="trade-brand">
          <div className="trade-brand-mark"><CandlestickChart size={18} /></div>
          <div><strong>UTAI</strong><span>Trading Intelligence</span></div>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="trade-nav">
          {nav.map(([label, Icon, href], index) => (
            <a className={index === 0 ? "trade-nav-item active" : "trade-nav-item"} href={href} key={label}>
              <Icon size={17} /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="mode-card">
          <span className="mode-dot" />
          <div>
            <strong>Safe default active</strong>
            <span>Analysis / Paper first</span>
          </div>
        </div>
      </aside>

      <section className="trading-workspace">
        <header className="trade-topbar">
          <div>
            <span className="trade-eyebrow">UNIVERSAL MULTI-MARKET OPERATING SYSTEM</span>
            <h1>Good to see you, {profile?.display_name || "Trader"}.</h1>
          </div>
          <div className="trade-top-actions">
            <span className="mode-pill">{settings?.beginner_mode === false ? "PRO MODE" : "BEGINNER MODE"}</span>
            <span className="paper-pill"><span /> PAPER / ANALYSIS</span>
          </div>
        </header>

        <section className="trading-hero" id="overview">
          <div className="hero-left">
            <div className="market-badge"><Sparkles size={15} /> AI MARKET COMMAND CENTER</div>
            <h2>Read the market. Control the risk. Never trade blind.</h2>
            <p>
              Your AI, portfolio and deterministic risk layers share one source of truth.
              Provider-backed features remain clearly unavailable until real feeds and approved platform connections exist.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#terminal"><CandlestickChart size={16} /> Open terminal</a>
              <a className="secondary-link" href="#connections"><Cable size={16} /> Platform connections</a>
              <a className="danger-link" href="#emergency"><ShieldAlert size={16} /> Emergency controls</a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Trading system state visualization">
            <div className="signal-grid" />
            <div className="signal-wave wave-one" />
            <div className="signal-wave wave-two" />
            <div className="command-orb">
              <BrainCircuit size={34} />
              <span>AI</span>
            </div>
            <div className="orbit-label label-risk">RISK</div>
            <div className="orbit-label label-data">DATA</div>
            <div className="orbit-label label-exec">EXEC</div>
            <div className="orbit-label label-port">PORT</div>
          </div>
        </section>

        <section className="trading-metrics">
          <article>
            <span className="mini-icon green"><Wallet size={17} /></span>
            <div><span>Paper equity</span><strong>{paper ? money(paper.current_equity, paper.base_currency || "USD") : "Not created"}</strong></div>
            <small>{paper ? paper.name : "Create a paper account before simulation"}</small>
          </article>
          <article>
            <span className="mini-icon cyan"><TrendingUp size={17} /></span>
            <div><span>Open positions</span><strong>{openPositions.length}</strong></div>
            <small>{orders.length} order records</small>
          </article>
          <article>
            <span className="mini-icon violet"><BrainCircuit size={17} /></span>
            <div><span>AI trade intents</span><strong>{intents.length}</strong></div>
            <small>Evidence-backed proposals only</small>
          </article>
          <article>
            <span className="mini-icon amber"><Cable size={17} /></span>
            <div><span>Connections</span><strong>{connected.length}/{connections.length}</strong></div>
            <small>Live automation stays fail-closed</small>
          </article>
          <article>
            <span className="mini-icon blue"><Gauge size={17} /></span>
            <div><span>Risk profile</span><strong>{risk?.mode || "Not configured"}</strong></div>
            <small>Hard limits override AI</small>
          </article>
          <article>
            <span className="mini-icon red"><Bell size={17} /></span>
            <div><span>Active alerts</span><strong>{enabledAlerts.length}</strong></div>
            <small>{watchlists.length} watchlist{watchlists.length === 1 ? "" : "s"}</small>
          </article>
        </section>

        <div className="trading-grid">
          <section className="trade-panel terminal-panel span-8" id="terminal">
            <div className="trade-panel-head">
              <div>
                <span className="trade-section-kicker">AI MARKET TERMINAL</span>
                <h3>Multi-market chart workspace</h3>
              </div>
              <div className="terminal-tabs">
                <span className="active">Chart</span><span>Depth</span><span>AI</span>
              </div>
            </div>
            <div className="chart-empty">
              <div className="chart-grid-lines" />
              <div className="chart-axis y-axis"><span>PRICE</span></div>
              <div className="chart-axis x-axis"><span>TIME</span></div>
              <div className="chart-empty-content">
                <div className="chart-icon"><CandlestickChart size={32} /></div>
                <strong>Live market feed not configured</strong>
                <p>
                  The terminal will render real candles, overlays, liquidity, positions,
                  news markers and risk/reward tools only after an approved provider is connected.
                </p>
                <span className="truth-pill"><ShieldCheck size={14} /> No fabricated chart data</span>
              </div>
            </div>
            <div className="terminal-footer">
              <span>Feed: <strong>NOT CONFIGURED</strong></span>
              <span>Execution: <strong>FAIL-CLOSED</strong></span>
              <span>Mode: <strong>ANALYSIS / PAPER</strong></span>
            </div>
          </section>

          <section className="trade-panel span-4" id="risk">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">RISK AUTHORITY</span><h3>Account guardrails</h3></div>
              <Gauge size={21} />
            </div>
            <div className="risk-orb">
              <div><strong>{risk?.mode || "SETUP"}</strong><span>RISK MODE</span></div>
            </div>
            <div className="risk-list">
              <div><span>Trading capital</span><strong>{money(risk?.trading_capital)}</strong></div>
              <div><span>Max acceptable loss</span><strong>{money(risk?.max_acceptable_loss)}</strong></div>
              <div><span>Profit target</span><strong>{money(risk?.profit_target)}</strong></div>
              <div><span>Automation</span><strong>NOT AUTHORIZED</strong></div>
            </div>
            <div className="risk-note">
              <ShieldCheck size={16} />
              <p>Deterministic limits override AI recommendations and remain authoritative if AI services are unavailable.</p>
            </div>
          </section>

          <section className="trade-panel span-7" id="opportunities">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">OPPORTUNITIES</span><h3>Latest AI trade intents</h3></div>
              <Sparkles size={21} />
            </div>
            <div className="intent-list">
              {intents.length ? intents.map((intent) => (
                <article className="intent-row" key={intent.id}>
                  <div className="intent-symbol"><span>{intent.instrument_key.slice(0, 3)}</span></div>
                  <div className="intent-main">
                    <strong>{intent.instrument_key}</strong>
                    <span>{intent.market_regime || "Regime unknown"} · {intent.reason_summary || "Evidence summary unavailable"}</span>
                  </div>
                  <div className="intent-side">
                    <span className={statusClass(intent.action)}>{intent.action}</span>
                    <small>{confidence(intent.confidence)} confidence</small>
                  </div>
                </article>
              )) : (
                <div className="trade-empty">
                  <BrainCircuit size={27} />
                  <strong>No AI trade intents yet</strong>
                  <span>Intents will appear only after real market evidence reaches the analysis pipeline.</span>
                </div>
              )}
            </div>
          </section>

          <section className="trade-panel span-5" id="positions">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">PORTFOLIO</span><h3>Open positions</h3></div>
              <TrendingUp size={21} />
            </div>
            <div className="position-list">
              {positions.length ? positions.map((position) => (
                <div className="position-row" key={position.id}>
                  <div>
                    <strong>{position.instrument_key}</strong>
                    <span>{position.side} · Qty {number(position.quantity)} · {number(position.leverage)}x</span>
                  </div>
                  <div className="position-price">
                    <strong>{position.current_price == null ? "Price unavailable" : number(position.current_price)}</strong>
                    <span className={statusClass(position.status)}>{position.status}</span>
                  </div>
                </div>
              )) : (
                <div className="trade-empty compact">
                  <Target size={25} />
                  <strong>No open positions</strong>
                  <span>Paper or approved live positions will aggregate here with total exposure.</span>
                </div>
              )}
            </div>
          </section>

          <section className="trade-panel span-8" id="research">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">RESEARCH MATRIX</span><h3>Markets & intelligence modules</h3></div>
              <Radar size={21} />
            </div>
            <div className="research-grid">
              {researchAreas.map(([label, Icon, note]) => (
                <div className="research-card" key={label}>
                  <div className="research-icon"><Icon size={18} /></div>
                  <strong>{label}</strong>
                  <span>{note}</span>
                  <small>NOT CONFIGURED</small>
                </div>
              ))}
            </div>
          </section>

          <section className="trade-panel span-4" id="connections">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">CONNECTIVITY</span><h3>Platform connections</h3></div>
              <Cable size={21} />
            </div>
            <div className="connection-list">
              {connections.length ? connections.map((connection) => (
                <div className="connection-row" key={connection.id}>
                  <div className="connection-glyph">
                    {(connection.trading_platforms?.[0]?.name || "?").slice(0, 1)}
                  </div>
                  <div>
                    <strong>{connection.trading_platforms?.[0]?.name || "Unknown platform"}</strong>
                    <span>{connection.automation_mode} · {connection.trading_platforms?.[0]?.family || "Venue"}</span>
                  </div>
                  <span className={statusClass(connection.status)}>{connection.status}</span>
                </div>
              )) : (
                <div className="trade-empty compact">
                  <Cable size={25} />
                  <strong>No trading platform connected</strong>
                  <span>Use read + trade-only permissions when connectors are enabled. Withdrawal permission is never required.</span>
                </div>
              )}
            </div>
          </section>

          <section className="trade-panel span-4" id="paper">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">SIMULATION</span><h3>Paper trading</h3></div>
              <CircleDollarSign size={21} />
            </div>
            {paper ? (
              <div className="paper-account">
                <span className="paper-label">PRIMARY PAPER ACCOUNT</span>
                <h4>{paper.name}</h4>
                <strong>{money(paper.current_equity, paper.base_currency || "USD")}</strong>
                <div className="paper-divider" />
                <div><span>Starting equity</span><b>{money(paper.starting_equity, paper.base_currency || "USD")}</b></div>
                <div><span>Currency</span><b>{paper.base_currency}</b></div>
              </div>
            ) : (
              <div className="trade-empty compact">
                <CircleDollarSign size={25} />
                <strong>Paper account not created</strong>
                <span>Safe onboarding starts with analysis and paper trading before bounded live execution.</span>
              </div>
            )}
          </section>

          <section className="trade-panel span-4" id="journal">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">DECISION JOURNAL</span><h3>AI & risk forensics</h3></div>
              <History size={21} />
            </div>
            <div className="journal-chain">
              <div><span>1</span><p><strong>Evidence</strong><small>Provider truth + freshness</small></p></div>
              <div><span>2</span><p><strong>TradeIntent</strong><small>Structured AI proposal</small></p></div>
              <div><span>3</span><p><strong>Risk decision</strong><small>Approve / modify / reject</small></p></div>
              <div><span>4</span><p><strong>Execution</strong><small>Only if policy permits</small></p></div>
            </div>
          </section>

          <section className="trade-panel span-4" id="learning">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">BEGINNER GUARDIAN</span><h3>Learn while you trade</h3></div>
              <BookOpen size={21} />
            </div>
            <div className="guardian-card">
              <div className="guardian-orb"><BookOpen size={24} /></div>
              <p>Tap-to-explain trading concepts, risk, confirmation and invalidation will appear in context as those modules are wired.</p>
              <div className="guardian-mode">
                <span>Current experience view</span>
                <strong>{settings?.beginner_mode === false ? "PRO" : "BEGINNER"}</strong>
              </div>
            </div>
          </section>

          <section className="trade-panel span-8" id="portfolio">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">ACCOUNT STATE</span><h3>Portfolio & exposure architecture</h3></div>
              <Wallet size={21} />
            </div>
            <div className="exposure-grid">
              <div><span>Total positions</span><strong>{positions.length}</strong><small>Across visible account records</small></div>
              <div><span>Watchlists</span><strong>{watchlists.length}</strong><small>Market monitoring groups</small></div>
              <div><span>Notifications</span><strong>{notifications.length}</strong><small>Latest account/system notices</small></div>
              <div><span>Onboarding</span><strong>{profile?.onboarding_complete ? "Complete" : "Incomplete"}</strong><small>Safe-mode setup state</small></div>
            </div>
          </section>

          <section className="trade-panel emergency-panel span-4" id="emergency">
            <div className="trade-panel-head">
              <div><span className="trade-section-kicker">SAFETY</span><h3>Emergency stop</h3></div>
              <ShieldAlert size={21} />
            </div>
            <div className="emergency-symbol"><Zap size={27} /></div>
            <strong className="emergency-title">Always accessible. Never decorative.</strong>
            <p>
              When destructive close-all execution is implemented, it will require confirmation and exact account context. Until then, this surface does not expose a fake action.
            </p>
            <div className="emergency-state"><span>Live trading</span><strong>NOT AUTHORIZED</strong></div>
          </section>
        </div>

        <footer className="trade-footer">
          <span>Universal Trading AI · One evidence layer · One deterministic risk authority</span>
          <span>No guaranteed profits · Slippage and execution risks remain real</span>
        </footer>
      </section>
    </main>
  );
}
