import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Cable,
  Database,
  Gauge,
  KeyRound,
  LockKeyhole,
  RadioTower,
  ScrollText,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ data: claims }, healthResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("api_health"),
  ]);

  const userId = claims?.claims?.sub;
  let adminState: "SIGNED_OUT" | "AUTHORIZED" | "SIGNED_IN_NO_ADMIN" = "SIGNED_OUT";
  let systemHealth: { component: string; status: string }[] = [];

  if (userId) {
    const [{ data: membership }, { data: healthRows }] = await Promise.all([
      supabase
        .from("admin_memberships")
        .select("status")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .maybeSingle(),
      supabase.from("system_health").select("component,status").order("component"),
    ]);

    adminState = membership ? "AUTHORIZED" : "SIGNED_IN_NO_ADMIN";
    systemHealth = healthRows ?? [];
  }

  const databaseOnline = Boolean((healthResult.data as { ok?: boolean } | null)?.ok);
  const healthyCount = systemHealth.filter((item) => item.status === "HEALTHY").length;

  return (
    <main className="admin-gateway">
      <header className="admin-gateway-nav">
        <Link href="/" className="admin-gateway-brand">
          <span><Zap size={17} /></span>
          <div><strong>UTAI CONTROL</strong><small>Administrative operations</small></div>
        </Link>

        <div className="admin-gateway-status">
          <span className={databaseOnline ? "gateway-health online" : "gateway-health"}>
            <i /> {databaseOnline ? "DATABASE ONLINE" : "DATABASE CHECK"}
          </span>
          <Link href={adminState === "AUTHORIZED" ? "/dashboard" : "/login"} className="gateway-login">
            {adminState === "AUTHORIZED" ? "Open control plane" : "Admin sign-in"}
          </Link>
        </div>
      </header>

      <section className="admin-gateway-hero">
        <div className="gateway-hero-copy">
          <span className="gateway-kicker"><ShieldCheck size={14} /> PRIVILEGED OPERATIONS SURFACE</span>
          <h1>
            Control the system.
            <br /><span>Not just the screen.</span>
          </h1>
          <p>
            Secure administration for users, platform policy, data providers,
            AI services, strategies, deterministic risk, execution readiness,
            incidents and audit history.
          </p>

          <div className="gateway-actions">
            <Link className="gateway-primary" href={adminState === "AUTHORIZED" ? "/dashboard" : "/login"}>
              {adminState === "AUTHORIZED" ? "Enter control plane" : "Authenticate"}
              <ArrowRight size={16} />
            </Link>
            <a className="gateway-secondary" href="#operations">
              <Activity size={16} /> View operational scope
            </a>
          </div>

          <div className="gateway-security-row">
            <span><LockKeyhole size={14} /> MFA / AAL2 step-up</span>
            <span><Database size={14} /> RLS enforced</span>
            <span><ScrollText size={14} /> Privileged audit trail</span>
          </div>
        </div>

        <div className="gateway-visual">
          <div className="gateway-node core"><Zap size={24} /><span>CONTROL</span></div>
          <div className="gateway-node node-users"><Users size={18} /><span>USERS</span></div>
          <div className="gateway-node node-ai"><BrainCircuit size={18} /><span>AI</span></div>
          <div className="gateway-node node-risk"><Gauge size={18} /><span>RISK</span></div>
          <div className="gateway-node node-data"><RadioTower size={18} /><span>DATA</span></div>
          <div className="gateway-node node-platform"><Cable size={18} /><span>VENUES</span></div>
          <div className="gateway-orbit one" />
          <div className="gateway-orbit two" />
        </div>
      </section>

      <section className="gateway-metrics">
        <article>
          <span>Identity state</span>
          <strong>{adminState === "AUTHORIZED" ? "AUTHORIZED" : adminState === "SIGNED_OUT" ? "SIGNED OUT" : "NO ADMIN ROLE"}</strong>
        </article>
        <article>
          <span>Database</span>
          <strong>{databaseOnline ? "HEALTHY" : "UNKNOWN"}</strong>
        </article>
        <article>
          <span>Service health</span>
          <strong>{userId ? `${healthyCount}/${systemHealth.length}` : "AUTH REQUIRED"}</strong>
        </article>
        <article>
          <span>Execution policy</span>
          <strong>FAIL-CLOSED</strong>
        </article>
      </section>

      <section className="gateway-ops" id="operations">
        <div className="gateway-section-head">
          <div><span>CONTROL PLANE</span><h2>Operational domains</h2></div>
          <p>Each domain is backed by server-side authorization rather than hidden frontend controls.</p>
        </div>

        <div className="gateway-op-grid">
          <Link href={adminState === "AUTHORIZED" ? "/users" : "/login"}><Users size={20} /><div><strong>Users & access</strong><span>Memberships, roles, permissions and security state.</span></div><ArrowRight size={16} /></Link>
          <Link href={adminState === "AUTHORIZED" ? "/platforms" : "/login"}><Cable size={20} /><div><strong>Platforms & capabilities</strong><span>Venue policy, automation class and connector readiness.</span></div><ArrowRight size={16} /></Link>
          <Link href={adminState === "AUTHORIZED" ? "/providers" : "/login"}><RadioTower size={20} /><div><strong>Providers & data</strong><span>Health, freshness, latency and source readiness.</span></div><ArrowRight size={16} /></Link>
          <Link href={adminState === "AUTHORIZED" ? "/ai" : "/login"}><BrainCircuit size={20} /><div><strong>AI & strategies</strong><span>Model registry, strategy versions and governance.</span></div><ArrowRight size={16} /></Link>
          <Link href={adminState === "AUTHORIZED" ? "/risk" : "/login"}><Gauge size={20} /><div><strong>Risk & emergency</strong><span>Hard limits, kill switches and deterministic authority.</span></div><ArrowRight size={16} /></Link>
          <Link href={adminState === "AUTHORIZED" ? "/audit" : "/login"}><ScrollText size={20} /><div><strong>Audit & incidents</strong><span>Privileged history, investigations and accountability.</span></div><ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="gateway-security-panel">
        <div className="gateway-security-copy">
          <span className="gateway-kicker"><KeyRound size={14} /> SECURITY BOUNDARY</span>
          <h2>Identity is not privilege.</h2>
          <p>
            Signing in only proves who you are. Active admin membership, permission
            mapping and required MFA level still gate privileged operations.
          </p>
        </div>
        <div className="gateway-security-flow">
          <span>IDENTITY</span><i /><span>ADMIN ROLE</span><i /><span>MFA</span><i /><span>PERMISSION</span><i /><span>ACTION</span>
        </div>
      </section>

      <footer className="gateway-footer">
        <span>Universal Trading AI · Administrative Control Plane</span>
        <span>Production Supabase backend · Server-side authorization</span>
      </footer>
    </main>
  );
}
