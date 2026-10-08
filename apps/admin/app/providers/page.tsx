import { Activity, Globe2, RadioTower, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { AdminLiveActivity } from "@/components/admin-live-activity";
import { probePublicProviders } from "@/lib/provider-probes";
import { requireAdmin } from "@/lib/auth";

export default async function ProvidersPage() {
  const { supabase } = await requireAdmin();

  const [liveProbes, providersResult, systemResult] = await Promise.all([
    probePublicProviders(),
    supabase
      .from("provider_health")
      .select("id,provider_key,status,latency_ms,last_success_at,last_error_at,checked_at,details")
      .order("provider_key"),
    supabase
      .from("system_health")
      .select("id,component,status,checked_at,details")
      .order("component"),
  ]);

  const liveCount = liveProbes.filter((probe) => probe.ok).length;
  const storedProviders = providersResult.data ?? [];
  const system = systemResult.data ?? [];

  return (
    <AdminAppShell
      active="providers"
      title="Data & Providers"
      subtitle="Real endpoint probes, freshness and persistent source health"
    >
      <section className="admin-route-hero neutral">
        <div>
          <span>DATA FABRIC</span>
          <h2>Know which external sources are actually responding now.</h2>
          <p>
            Live public probes are performed when this page renders. Persistent provider-health rows
            remain separate so a stale database status cannot masquerade as a live check.
          </p>
        </div>
        <RadioTower size={32} />
      </section>

      <div className="metric-grid">
        <article className="metric-card"><span>Live public probes</span><strong>{liveCount}/{liveProbes.length}</strong></article>
        <article className="metric-card"><span>Persistent provider rows</span><strong>{storedProviders.length}</strong></article>
        <article className="metric-card"><span>Internal services</span><strong>{system.length}</strong></article>
        <article className="metric-card"><span>Database heartbeat</span><strong>{system.find((row: any) => row.component === "database")?.status ?? "UNKNOWN"}</strong></article>
      </div>

      <section className="admin-provider-probes">
        {liveProbes.map((probe) => (
          <article key={probe.key} className={probe.ok ? "online" : "offline"}>
            <span className="probe-icon">
              {probe.ok ? <Wifi size={18} /> : <WifiOff size={18} />}
            </span>
            <div>
              <strong>{probe.name}</strong>
              <span>{probe.category.replace("_", " ")}</span>
              <small>{probe.detail}</small>
            </div>
            <div className="probe-state">
              <b>{probe.ok ? "LIVE" : "DOWN"}</b>
              <span>{probe.latencyMs == null ? "—" : probe.latencyMs + " ms"}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="route-split admin-route-split">
        <div className="panel">
          <div className="panel-head">
            <div><span className="section-kicker">PERSISTENT PROVIDER HEALTH</span><h3>Worker-reported sources</h3></div>
            <Globe2 size={20} />
          </div>
          {storedProviders.map((provider: any) => (
            <article className="admin-route-list-row" key={provider.id}>
              <div>
                <strong>{provider.provider_key}</strong>
                <span>
                  {provider.latency_ms == null ? "Latency unavailable" : provider.latency_ms + " ms"} ·
                  checked {provider.checked_at ? new Date(provider.checked_at).toLocaleString() : "never"}
                </span>
              </div>
              <b>{provider.status}</b>
            </article>
          ))}
          {!storedProviders.length ? (
            <div className="route-empty">
              <RadioTower size={24} />
              <strong>No persistent provider heartbeat yet</strong>
              <span>Public probes above are live, but persistent ingestion workers are not falsely marked healthy.</span>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><span className="section-kicker">SYSTEM HEALTH</span><h3>Internal services</h3></div>
            <Activity size={20} />
          </div>
          {system.map((service: any) => (
            <article className="admin-route-list-row" key={service.id}>
              <div>
                <strong>{service.component}</strong>
                <span>{service.checked_at ? new Date(service.checked_at).toLocaleString() : "Never checked"}</span>
              </div>
              <b>{service.status}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-provider-boundary">
        <ShieldCheck size={17} />
        <div>
          <strong>Health semantics are strict.</strong>
          <span>A successful public API probe does not automatically mean the private connector, AI worker or execution engine is healthy.</span>
        </div>
      </section>

      <AdminLiveActivity />
    </AdminAppShell>
  );
}
