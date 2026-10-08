import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Cable,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { AIMarketWorkbench } from "@/components/ai-market-workbench";
import { LiveMarketStream } from "@/components/live-market-stream";
import { requireUser } from "@/lib/auth";

export default async function AIPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const query = await searchParams;
  const initialSymbol = String(query.symbol ?? "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24) || "BTCUSDT";
  const { supabase, userId, displayName, notificationCount } = await requireUser();

  const [
    { data: intents },
    { data: decisions },
    { data: riskProfile },
    { data: connections },
    { count: paperAccounts },
  ] = await Promise.all([
    supabase
      .from("trade_intents")
      .select("id,instrument_key,action,confidence,market_regime,reason_summary,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("trade_decisions")
      .select("id,trade_intent_id,status,approved_size,reasons,deterministic_policy_version,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("risk_profiles")
      .select("id,mode")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("platform_connections")
      .select("id,status")
      .eq("user_id", userId),
    supabase
      .from("paper_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const healthyConnections = (connections ?? []).filter((connection: any) =>
    ["CONNECTED", "HEALTHY", "ACTIVE"].includes(String(connection.status).toUpperCase())
  ).length;

  const aiEvidenceActive = Boolean(intents?.length);

  return (
    <TradingAppShell
      active="ai"
      title="AI Trade"
      subtitle="Evidence → intent → risk decision"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero ai-tone">
        <div>
          <span>AI COPILOT</span>
          <h2>AI proposes. Deterministic risk decides.</h2>
          <p>
            Market context can be live without pretending the full AI evidence pipeline is ready.
            Every real trade intent must still pass independent risk and platform-policy gates.
          </p>
        </div>
        <BrainCircuit size={36} />
      </section>

      <AIMarketWorkbench initialSymbol={initialSymbol} paperReady={(paperAccounts ?? 0) > 0} />

      <LiveMarketStream compact />

      <section className="ai-readiness-grid">
        <article className="ready">
          <span><Wifi size={17} /></span>
          <div>
            <strong>Public market context</strong>
            <small>BTC / ETH / SOL public stream</small>
          </div>
          <b>LIVE</b>
        </article>

        <Link href="/risk" className={riskProfile ? "ready" : "waiting"}>
          <span><Gauge size={17} /></span>
          <div>
            <strong>Deterministic risk profile</strong>
            <small>{riskProfile ? `${riskProfile.mode} policy loaded` : "Configure limits before execution"}</small>
          </div>
          <b>{riskProfile ? "READY" : "SET UP"}</b>
        </Link>

        <Link href="/connections" className={healthyConnections ? "ready" : "waiting"}>
          <span><Cable size={17} /></span>
          <div>
            <strong>Trading venue</strong>
            <small>{healthyConnections ? `${healthyConnections} healthy connection(s)` : "No healthy private venue connection"}</small>
          </div>
          <b>{healthyConnections ? "READY" : "CONNECT"}</b>
        </Link>

        <article className={aiEvidenceActive ? "ready" : "waiting"}>
          <span><BrainCircuit size={17} /></span>
          <div>
            <strong>AI evidence pipeline</strong>
            <small>{aiEvidenceActive ? "Structured trade intents available" : "No evidence-backed intent emitted yet"}</small>
          </div>
          <b>{aiEvidenceActive ? "ACTIVE" : "WAITING"}</b>
        </article>
      </section>

      <div className="route-metric-grid">
        <article>
          <span>Trade intents</span>
          <strong>{intents?.length ?? 0}</strong>
        </article>
        <article>
          <span>Risk decisions</span>
          <strong>{decisions?.length ?? 0}</strong>
        </article>
        <article>
          <span>Direct AI execution</span>
          <strong>BLOCKED</strong>
        </article>
      </div>

      <section className="route-split">
        <div className="route-panel">
          <div className="route-panel-title">
            <Sparkles size={18} />
            <h3>Latest AI intents</h3>
          </div>

          {(intents ?? []).map((intent: any) => (
            <article className="route-list-row" key={intent.id}>
              <div>
                <strong>{intent.instrument_key}</strong>
                <span>{intent.action} · {intent.market_regime || "regime unknown"}</span>
                <small>{intent.reason_summary || "No narrative summary"}</small>
              </div>
              <b>
                {intent.confidence == null
                  ? "—"
                  : `${Math.round(
                      Number(intent.confidence) <= 1
                        ? Number(intent.confidence) * 100
                        : Number(intent.confidence)
                    )}%`}
              </b>
            </article>
          ))}

          {!intents?.length ? (
            <div className="route-empty">
              <BrainCircuit size={24} />
              <strong>No evidence-backed AI intent yet</strong>
              <span>
                Live prices alone are not enough. UTAI waits for the configured evidence pipeline
                instead of inventing a signal.
              </span>
              <Link href="/research" className="empty-cta">
                Open research readiness <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="route-panel">
          <div className="route-panel-title">
            <ShieldCheck size={18} />
            <h3>Deterministic decisions</h3>
          </div>

          {(decisions ?? []).map((decision: any) => (
            <article className="route-list-row" key={decision.id}>
              <div>
                <strong>{decision.status}</strong>
                <span>Policy {decision.deterministic_policy_version || "unversioned"}</span>
              </div>
              <b>{decision.approved_size ?? "—"}</b>
            </article>
          ))}

          {!decisions?.length ? (
            <div className="route-empty">
              <ShieldCheck size={24} />
              <strong>No risk decision yet</strong>
              <span>A trade cannot proceed to execution without one.</span>
              <Link href="/risk" className="empty-cta">
                Review risk policy <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </TradingAppShell>
  );
}
