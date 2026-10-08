import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  Cable,
  Database,
  Gauge,
  History,
  KeyRound,
  LayoutDashboard,
  Network,
  Newspaper,
  RadioTower,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Zap,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminLiveActivity } from "@/components/admin-live-activity";
import { probePublicProviders } from "@/lib/provider-probes";

type HealthRow = {
  component: string;
  status: string;
  checked_at: string | null;
};

type FeatureRow = {
  feature_id: string;
  feature_name: string;
  status: string;
  test_status: string;
};

type PlatformRow = {
  id: string;
  name: string;
  family: string | null;
  active: boolean;
  platform_capabilities:
    | {
        execution_class: string;
        policy_reviewed: boolean;
        automated_execution: boolean;
      }[]
    | null;
};

type ProviderRow = {
  provider_key: string;
  status: string;
  latency_ms: number | null;
  checked_at: string | null;
};

type AuditRow = {
  action: string;
  table_name: string | null;
  actor_db_role: string | null;
  created_at: string;
};

const nav = [
  ["Overview", LayoutDashboard, "/dashboard"],
  ["Users", Users, "/users"],
  ["Platforms", Cable, "/platforms"],
  ["Connections", Cable, "/connections"],
  ["Data & Providers", RadioTower, "/providers"],
  ["News & Macro", Newspaper, "/news"],
  ["AI & Models", BrainCircuit, "/ai"],
  ["Strategies", Bot, "/strategies"],
  ["Risk Control", Gauge, "/risk"],
  ["Incidents", ShieldAlert, "/incidents"],
  ["Execution", BarChart3, "/execution"],
  ["Audit Trail", ScrollText, "/audit"],
  ["Feature Registry", History, "/features"],
  ["Secrets & Config", KeyRound, "/configuration"],
  ["Settings", Settings2, "/settings"],
] as const;

function statusClass(status?: string | null) {
  const value = (status || "UNKNOWN").toUpperCase();
  if (["HEALTHY", "ACTIVE", "IMPLEMENTED", "READY", "FULL_AUTO"].includes(value)) return "status ok";
  if (["DEGRADED", "IN_PROGRESS", "PARTIAL", "LIMITED_AUTO"].includes(value)) return "status warn";
  if (["UNHEALTHY", "FAILED", "BLOCKED", "ERROR"].includes(value)) return "status danger";
  return "status neutral";
}

function relativeDate(value?: string | null) {
  if (!value) return "Never checked";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminDashboard() {
  const { supabase, membership } = await requireAdmin();

  const [
    healthResult,
    featuresResult,
    platformsResult,
    providersResult,
    adminsResult,
    killResult,
    modelsResult,
    strategiesResult,
    auditResult,
    connectionsResult,
    liveProviderProbes,
    paperAccountsResult,
    intentsResult,
  ] = await Promise.all([
    supabase.from("system_health").select("component,status,checked_at").order("component"),
    supabase.from("feature_registry").select("feature_id,feature_name,status,test_status").order("feature_id"),
    supabase
      .from("trading_platforms")
      .select("id,name,family,active,platform_capabilities(execution_class,policy_reviewed,automated_execution)")
      .eq("active", true)
      .order("name"),
    supabase.from("provider_health").select("provider_key,status,latency_ms,checked_at").order("provider_key"),
    supabase.from("admin_memberships").select("id,status"),
    supabase.from("kill_switches").select("id,scope_type,mode,active,reason,activated_at").eq("active", true),
    supabase.from("models").select("id,name,task"),
    supabase.from("strategies").select("id,name,enabled"),
    supabase
      .from("audit_logs")
      .select("action,table_name,actor_db_role,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("platform_connections").select("id,status,last_health_at"),
    probePublicProviders(),
    supabase.from("paper_accounts").select("id", { count: "exact", head: true }),
    supabase.from("trade_intents").select("id", { count: "exact", head: true }),
  ]);

  const health = (healthResult.data ?? []) as HealthRow[];
  const features = (featuresResult.data ?? []) as FeatureRow[];
  const platforms = (platformsResult.data ?? []) as PlatformRow[];
  const providers = (providersResult.data ?? []) as ProviderRow[];
  const audit = (auditResult.data ?? []) as AuditRow[];
  const admins = adminsResult.data ?? [];
  const kills = killResult.data ?? [];
  const models = modelsResult.data ?? [];
  const strategies = strategiesResult.data ?? [];
  const connections = connectionsResult.data ?? [];

  const healthyServices = health.filter((item) => item.status === "HEALTHY").length;
  const implemented = features.filter((item) => item.status === "IMPLEMENTED").length;
  const inProgress = features.filter((item) => item.status === "IN_PROGRESS").length;
  const scaffolded = features.filter((item) => item.status === "SCAFFOLDED").length;
  const activeAdmins = admins.filter((item) => item.status === "ACTIVE").length;
  const connectedAccounts = connections.filter((item) =>
    ["CONNECTED", "HEALTHY", "ACTIVE"].includes(String(item.status).toUpperCase())
  ).length;
  const activeStrategies = strategies.filter((item) => item.enabled).length;
  const publicFeedsLive = liveProviderProbes.filter((item) => item.ok).length;
  const paperAccounts = paperAccountsResult.count ?? 0;
  const tradeIntentCount = intentsResult.count ?? 0;

  return (
    <main className="control-shell">
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="brand">
          <div className="brand-mark"><Zap size={18} /></div>
          <div>
            <strong>UTAI</strong>
            <span>Control Plane</span>
          </div>
        </div>

        <div className="nav-label">CONTROL CENTER</div>
        <nav className="side-nav">
          {nav.map(([label, Icon, href], index) => (
            <a className={index === 0 ? "nav-item active" : "nav-item"} href={href} key={label}>
              <Icon size={17} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="security-chip">
            <ShieldCheck size={16} />
            <div>
              <strong>Hardened session</strong>
              <span>MFA / AAL2 enforced</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">UNIVERSAL TRADING AI</p>
            <h1>System Control Plane</h1>
          </div>
          <div className="topbar-actions">
            <span className="live-pill"><span className="live-dot" /> Production</span>
            <span className="role-pill">SUPER ADMIN</span>
          </div>
        </header>

        <section className="hero-panel" id="overview">
          <div className="hero-copy">
            <div className="eyebrow-line">
              <span>TRADING OPERATIONS</span>
              <span className="divider-dot" />
              <span>DETERMINISTIC RISK AUTHORITY</span>
            </div>
            <h2>One command surface for every trading system.</h2>
            <p>
              Monitor platform policy, data integrity, AI services, execution readiness,
              risk enforcement and operational incidents without exposing raw diagnostics as the product.
            </p>
            <div className="hero-badges">
              <span><ShieldCheck size={15} /> RLS enforced</span>
              <span><Database size={15} /> Shared Supabase control plane</span>
              <span><Gauge size={15} /> Risk engine has final authority</span>
            </div>
          </div>
          <div className="radar-card" aria-label="System readiness summary">
            <div className="radar-orbit">
              <div className="radar-core"><Activity size={28} /></div>
              <span className="orbit-node one" />
              <span className="orbit-node two" />
              <span className="orbit-node three" />
            </div>
            <div>
              <span className="kicker">SYSTEM READINESS</span>
              <strong>{healthyServices}/{health.length || 0} services healthy</strong>
              <small>Unknown services remain fail-closed.</small>
            </div>
          </div>
        </section>

        <section className="metric-grid" aria-label="Admin metrics">
          <article className="metric-card">
            <span className="metric-icon cyan"><Activity size={18} /></span>
            <div><span>Healthy services</span><strong>{healthyServices}/{health.length}</strong></div>
            <small>Database + persistent workers</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon violet"><Users size={18} /></span>
            <div><span>Active admins</span><strong>{activeAdmins}</strong></div>
            <small>Least-privilege memberships</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon amber"><Cable size={18} /></span>
            <div><span>Connected accounts</span><strong>{connectedAccounts}</strong></div>
            <small>{connections.length} connection records</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon green"><BrainCircuit size={18} /></span>
            <div><span>Models / strategies</span><strong>{models.length} / {activeStrategies}</strong></div>
            <small>{strategies.length} strategies registered</small>
          </article>
          <article className="metric-card">
            <span className={kills.length ? "metric-icon red" : "metric-icon green"}><ShieldAlert size={18} /></span>
            <div><span>Active kill switches</span><strong>{kills.length}</strong></div>
            <small>{kills.length ? "Action required" : "No emergency blocks active"}</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon blue"><History size={18} /></span>
            <div><span>Blueprint progress</span><strong>{implemented}/{features.length}</strong></div>
            <small>{inProgress} in progress · {scaffolded} scaffolded</small>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel span-8" id="health">
            <div className="panel-head">
              <div>
                <span className="section-kicker">OPERATIONS</span>
                <h3>System health matrix</h3>
              </div>
              <span className="soft-badge">REAL BACKEND STATE</span>
            </div>
            <div className="health-grid">
              {health.length ? health.map((item) => (
                <article className="health-tile" key={item.component}>
                  <div className="health-icon"><Activity size={18} /></div>
                  <div className="health-copy">
                    <strong>{item.component.replaceAll("-", " ")}</strong>
                    <span>{relativeDate(item.checked_at)}</span>
                  </div>
                  <span className={statusClass(item.status)}>{item.status}</span>
                </article>
              )) : (
                <div className="empty-state wide">
                  <RadioTower size={26} />
                  <strong>No service heartbeat data yet</strong>
                  <span>Services remain UNKNOWN and fail-closed until workers publish health.</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel span-4 risk-panel" id="risk">
            <div className="panel-head">
              <div>
                <span className="section-kicker">SAFETY LAYER</span>
                <h3>Emergency control</h3>
              </div>
              <ShieldAlert size={21} />
            </div>
            <div className={kills.length ? "emergency-ring danger-ring" : "emergency-ring"}>
              <strong>{kills.length}</strong>
              <span>ACTIVE</span>
            </div>
            <p className="panel-copy">
              Global, user, account, platform and strategy kill switches are enforced in the database and deterministic execution policy.
            </p>
            <div className="control-list">
              <div><span>Risk engine authority</span><strong>ENFORCED</strong></div>
              <div><span>Withdrawal permission</span><strong>FORBIDDEN</strong></div>
              <div><span>AI direct execution</span><strong>BLOCKED</strong></div>
            </div>
          </section>

          <section className="panel span-7" id="platforms">
            <div className="panel-head">
              <div>
                <span className="section-kicker">VENUE POLICY</span>
                <h3>Platform capability registry</h3>
              </div>
              <span className="soft-badge">{platforms.length} venues</span>
            </div>
            <div className="table-shell">
              <div className="table-row table-head-row">
                <span>Platform</span><span>Family</span><span>Execution</span><span>Policy</span>
              </div>
              {platforms.slice(0, 8).map((platform) => {
                const capability = platform.platform_capabilities?.[0];
                return (
                  <div className="table-row" key={platform.id}>
                    <span className="platform-name">
                      <span className="venue-glyph">{platform.name.slice(0, 1)}</span>
                      {platform.name}
                    </span>
                    <span>{platform.family || "—"}</span>
                    <span className={statusClass(capability?.execution_class)}>{capability?.execution_class || "UNKNOWN"}</span>
                    <span>{capability?.policy_reviewed ? "Reviewed" : "Needs review"}</span>
                  </div>
                );
              })}
              {!platforms.length ? <div className="empty-row">No platform registry records.</div> : null}
            </div>
          </section>

          <section className="panel span-5" id="providers">
            <div className="panel-head">
              <div>
                <span className="section-kicker">DATA FABRIC</span>
                <h3>Provider & connector health</h3>
              </div>
              <Network size={21} />
            </div>
            <div className="stack-list">
              {providers.length ? providers.slice(0, 7).map((provider) => (
                <div className="stack-row" key={provider.provider_key}>
                  <div>
                    <strong>{provider.provider_key}</strong>
                    <span>{provider.latency_ms == null ? "Latency unavailable" : `${provider.latency_ms} ms`}</span>
                  </div>
                  <span className={statusClass(provider.status)}>{provider.status}</span>
                </div>
              )) : (
                <div className="empty-state compact">
                  <RadioTower size={24} />
                  <strong>No external providers configured</strong>
                  <span>Market/news/on-chain adapters will remain clearly unavailable rather than displaying fabricated data.</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel span-5" id="intelligence">
            <div className="panel-head">
              <div>
                <span className="section-kicker">INTELLIGENCE</span>
                <h3>AI & strategy registry</h3>
              </div>
              <BrainCircuit size={21} />
            </div>
            <div className="intel-visual">
              <div className="brain-node central"><BrainCircuit size={24} /></div>
              <div className="brain-node n1">Q</div>
              <div className="brain-node n2">N</div>
              <div className="brain-node n3">R</div>
              <div className="brain-node n4">O</div>
              <div className="connector-line l1" />
              <div className="connector-line l2" />
              <div className="connector-line l3" />
              <div className="connector-line l4" />
            </div>
            <div className="mini-stats">
              <div><span>Models</span><strong>{models.length}</strong></div>
              <div><span>TradeIntents</span><strong>{tradeIntentCount}</strong></div>
              <div><span>Strategies</span><strong>{strategies.length}</strong></div>
            </div>
            <p className="panel-copy">The local ML/quant analysis path is active and persists TradeIntents. Full specialist model services remain separately governed and fail-closed until configured.</p>
          </section>

          <section className="panel span-7" id="features">
            <div className="panel-head">
              <div>
                <span className="section-kicker">BLUEPRINT</span>
                <h3>Feature delivery map</h3>
              </div>
              <span className="soft-badge">{features.length} tracked requirements</span>
            </div>
            <div className="progress-track" aria-label="Feature implementation progress">
              <span style={{ width: `${features.length ? (implemented / features.length) * 100 : 0}%` }} />
            </div>
            <div className="progress-legend">
              <span><i className="legend-dot implemented" /> Implemented {implemented}</span>
              <span><i className="legend-dot progress" /> In progress {inProgress}</span>
              <span><i className="legend-dot scaffold" /> Scaffolded {scaffolded}</span>
            </div>
            <div className="feature-list">
              {features.slice(0, 7).map((feature) => (
                <div className="feature-row" key={feature.feature_id}>
                  <span className="feature-code">{feature.feature_id}</span>
                  <div><strong>{feature.feature_name}</strong><small>Test: {feature.test_status}</small></div>
                  <span className={statusClass(feature.status)}>{feature.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel span-8" id="audit">
            <div className="panel-head">
              <div>
                <span className="section-kicker">FORENSICS</span>
                <h3>Recent privileged audit trail</h3>
              </div>
              <ScrollText size={21} />
            </div>
            <div className="audit-list">
              {audit.length ? audit.map((row, index) => (
                <div className="audit-row" key={`${row.created_at}-${index}`}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{row.action}</strong>
                    <span>{row.table_name || "system"} · {row.actor_db_role || "authenticated"}</span>
                  </div>
                  <time>{relativeDate(row.created_at)}</time>
                </div>
              )) : (
                <div className="empty-state compact">
                  <ScrollText size={24} />
                  <strong>No audit events to display</strong>
                  <span>Privileged actions will appear here as the control plane is used.</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel span-4" id="execution">
            <div className="panel-head">
              <div>
                <span className="section-kicker">EXECUTION</span>
                <h3>Live trading readiness</h3>
              </div>
              <Zap size={21} />
            </div>
            <div className="readiness-stack">
              <div><span>Public market feeds</span><strong>{publicFeedsLive}/{liveProviderProbes.length} LIVE</strong></div>
              <div><span>Execution workers</span><strong>NOT VERIFIED</strong></div>
              <div><span>Paper accounts</span><strong>{paperAccounts} ACTIVE</strong></div>
              <div><span>Live automation</span><strong>FAIL-CLOSED</strong></div>
            </div>
            <div className="notice">
              <AlertTriangle size={17} />
              <p>Public market data and paper execution are active; real-money automation remains blocked until persistent execution workers and approved adapters are verified.</p>
            </div>
          </section>

          <section className="panel span-12" id="configuration">
            <div className="panel-head">
              <div>
                <span className="section-kicker">SECURITY & CONFIGURATION</span>
                <h3>Control-plane boundaries</h3>
              </div>
              <ShieldCheck size={21} />
            </div>
            <div className="boundary-grid">
              <div><KeyRound size={18} /><strong>Secret references only</strong><span>No plaintext provider keys in the browser or database rows.</span></div>
              <div><SlidersHorizontal size={18} /><strong>Versioned policy</strong><span>Critical risk and capability changes must remain auditable.</span></div>
              <div><ShieldCheck size={18} /><strong>Step-up required</strong><span>Sensitive actions require an AAL2 admin session.</span></div>
              <div><Database size={18} /><strong>Immutable history</strong><span>Historical trade records cannot be silently rewritten.</span></div>
            </div>
          </section>
        </div>

        <AdminLiveActivity />

        <footer className="dashboard-footer">
          <span>Universal Trading AI · Production control plane</span>
          <span>Admin membership: {membership.status}</span>
        </footer>
      </section>
    </main>
  );
}
