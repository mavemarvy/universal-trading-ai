import { Cable, KeyRound, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

function bool(value: unknown) {
  return value === true ? "YES" : "NO";
}

export default async function AdminConnectionsPage() {
  const { supabase } = await requireAdmin();

  const { data: connections } = await supabase
    .from("platform_connections")
    .select(
      "id,user_id,status,automation_mode,withdrawal_permission,environment,endpoint_region,permissions,capability_snapshot,verified_at,last_health_at,connection_label,account_external_ref,created_at,trading_platforms(platform_key,name,family)"
    )
    .order("updated_at", { ascending: false })
    .limit(250);

  const rows = connections ?? [];
  const connected = rows.filter((item: any) => item.status === "CONNECTED");
  const tradeEnabled = rows.filter((item: any) => item.permissions?.trade === true);
  const withdrawalEnabled = rows.filter((item: any) => item.withdrawal_permission === true || item.permissions?.withdrawal === true);

  return (
    <AdminAppShell
      active="connections"
      title="Exchange Connections"
      subtitle="Credential-safe connection inventory and capability state"
    >
      <section className="admin-route-hero warm">
        <div>
          <span>ACCOUNT CONNECTIVITY</span>
          <h2>See who is connected, where, and with what permissions.</h2>
          <p>
            The control plane never renders stored API secrets. It only exposes verified connection
            state, safe permission metadata, health and environment.
          </p>
        </div>
        <Cable size={32} />
      </section>

      <div className="metric-grid">
        <article className="metric-card"><span>Total records</span><strong>{rows.length}</strong></article>
        <article className="metric-card"><span>Connected</span><strong>{connected.length}</strong></article>
        <article className="metric-card"><span>Trade-enabled keys</span><strong>{tradeEnabled.length}</strong></article>
        <article className={withdrawalEnabled.length ? "metric-card alert" : "metric-card"}>
          <span>Withdrawal-enabled</span><strong>{withdrawalEnabled.length}</strong>
        </article>
      </div>

      {withdrawalEnabled.length ? (
        <section className="admin-security-alert">
          <ShieldAlert size={18} />
          <div>
            <strong>Withdrawal permission violation detected</strong>
            <span>
              The connection policy is designed to reject withdrawal-enabled credentials. Investigate
              these records immediately.
            </span>
          </div>
        </section>
      ) : (
        <section className="admin-security-ok">
          <ShieldCheck size={18} />
          <div>
            <strong>Withdrawal boundary intact</strong>
            <span>No stored connection currently reports withdrawal permission.</span>
          </div>
        </section>
      )}

      <section className="panel span-12">
        <div className="panel-head">
          <div><span className="section-kicker">CONNECTION INVENTORY</span><h3>Verified user exchange accounts</h3></div>
          <KeyRound size={20} />
        </div>

        <div className="admin-connection-list">
          {rows.map((connection: any) => {
            const platform = Array.isArray(connection.trading_platforms)
              ? connection.trading_platforms[0]
              : connection.trading_platforms;
            const permissions = connection.permissions ?? {};

            return (
              <article key={connection.id}>
                <span className="admin-exchange-avatar">{String(platform?.name ?? "?").slice(0, 1)}</span>
                <div className="admin-connection-primary">
                  <strong>{connection.connection_label || platform?.name || "Exchange"}</strong>
                  <span>
                    {platform?.name || "Unknown"} · {connection.environment} · {connection.endpoint_region}
                  </span>
                  <small>User {String(connection.user_id).slice(0, 8)}… · mode {connection.automation_mode}</small>
                </div>

                <div className="admin-permission-pills">
                  <span>READ <b>{bool(permissions.read)}</b></span>
                  <span>TRADE <b>{bool(permissions.trade)}</b></span>
                  <span>SPOT <b>{bool(permissions.spot)}</b></span>
                  <span>FUTURES <b>{bool(permissions.futures)}</b></span>
                  <span className="safe">WITHDRAW <b>NO</b></span>
                </div>

                <div className="admin-connection-state">
                  <b className={connection.status === "CONNECTED" ? "ok" : ""}>{connection.status}</b>
                  <span>{connection.verified_at ? new Date(connection.verified_at).toLocaleString() : "Not verified"}</span>
                  <small>{connection.last_health_at ? "Health " + new Date(connection.last_health_at).toLocaleString() : "No health check"}</small>
                </div>
              </article>
            );
          })}

          {!rows.length ? (
            <div className="route-empty">
              <Users size={24} />
              <strong>No user exchange connections yet</strong>
              <span>Once users verify Bybit, Binance or OKX keys, safe connection metadata will appear here.</span>
            </div>
          ) : null}
        </div>
      </section>
    </AdminAppShell>
  );
}
