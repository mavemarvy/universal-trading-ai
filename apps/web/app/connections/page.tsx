import {
  Cable,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Unplug,
  WalletCards,
} from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";
import { connectExchange, disconnectExchange } from "./actions";

const connectors = [
  {
    key: "BYBIT",
    name: "Bybit",
    note: "API key + secret. Withdrawal permission is rejected.",
    passphrase: false,
    region: false,
    environments: ["LIVE", "TESTNET"],
  },
  {
    key: "BINANCE",
    name: "Binance",
    note: "API key permissions are checked before storage.",
    passphrase: false,
    region: false,
    environments: ["LIVE"],
  },
  {
    key: "OKX",
    name: "OKX",
    note: "API key + secret + passphrase. Choose your API region.",
    passphrase: true,
    region: true,
    environments: ["LIVE", "DEMO"],
  },
] as const;

const nextConnectors = ["Kraken", "Coinbase", "Bitget", "MT5", "cTrader"];

function yes(value: unknown) {
  return value === true ? "YES" : "NO";
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, userId, displayName, notificationCount } = await requireUser();

  const [{ data: connections }, { data: platforms }] = await Promise.all([
    supabase
      .from("platform_connections")
      .select(
        "id,automation_mode,status,last_health_at,verified_at,connection_label,permissions,capability_snapshot,environment,endpoint_region,account_external_ref,created_at,trading_platforms(platform_key,name,family)"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("trading_platforms")
      .select("id,platform_key,name,family,active")
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <TradingAppShell
      active="connections"
      title="Connections"
      subtitle="Secure broker and exchange access"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero compact warm-tone">
        <div>
          <span>EXCHANGE CONNECTION CENTER</span>
          <h2>Connect trading accounts without giving UTAI withdrawal authority.</h2>
          <p>
            Credentials are verified against the exchange first, rejected if withdrawal access is
            detected, then stored encrypted in Supabase Vault. Stored secrets are never rendered back
            into this interface.
          </p>
        </div>
        <Cable size={34} />
      </section>

      {query.connected ? (
        <div className="route-success">
          <CheckCircle2 size={16} /> {query.connected} connected and verified.
        </div>
      ) : null}
      {query.disconnected ? (
        <div className="route-success">
          <Unplug size={16} /> Exchange disconnected and encrypted credentials removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="route-error">
          <ShieldCheck size={16} /> {decodeURIComponent(query.error)}
        </div>
      ) : null}

      <section className="connection-security-strip">
        <article>
          <LockKeyhole size={18} />
          <div>
            <strong>Encrypted at rest</strong>
            <span>Supabase Vault</span>
          </div>
        </article>
        <article>
          <ShieldCheck size={18} />
          <div>
            <strong>No withdrawals</strong>
            <span>Rejected before storage</span>
          </div>
        </article>
        <article>
          <KeyRound size={18} />
          <div>
            <strong>Least privilege</strong>
            <span>Read/trade only when enabled</span>
          </div>
        </article>
      </section>

      <section className="route-panel">
        <div className="route-panel-title">
          <PlugZap size={18} />
          <div>
            <h3>Connected accounts</h3>
            <small>{connections?.filter((item: any) => item.status === "CONNECTED").length ?? 0} active connections</small>
          </div>
        </div>

        <div className="connected-account-grid">
          {(connections ?? []).map((connection: any) => {
            const platform = Array.isArray(connection.trading_platforms)
              ? connection.trading_platforms[0]
              : connection.trading_platforms;
            const permissions = connection.permissions ?? {};
            const snapshot = connection.capability_snapshot ?? {};
            const account = snapshot.account ?? {};
            const assets = Array.isArray(account.assets) ? account.assets : [];

            return (
              <article className="connected-account-card" key={connection.id}>
                <div className="connected-account-head">
                  <span className="exchange-avatar">{String(platform?.name ?? "?").slice(0, 1)}</span>
                  <div>
                    <strong>{connection.connection_label || platform?.name || "Exchange"}</strong>
                    <small>{platform?.name} · {connection.environment} · {connection.endpoint_region}</small>
                  </div>
                  <b className={connection.status === "CONNECTED" ? "connected-badge" : "offline-badge"}>
                    {connection.status}
                  </b>
                </div>

                <div className="connection-permission-grid">
                  <span><small>Read</small><b>{yes(permissions.read)}</b></span>
                  <span><small>Trade</small><b>{yes(permissions.trade)}</b></span>
                  <span><small>Spot</small><b>{yes(permissions.spot)}</b></span>
                  <span><small>Futures</small><b>{yes(permissions.futures)}</b></span>
                  <span><small>Withdraw</small><b className="safe-no">NO</b></span>
                  <span><small>IP bound</small><b>{yes(permissions.ipBound)}</b></span>
                </div>

                {account.totalEquity || account.totalWalletBalance ? (
                  <div className="connection-equity">
                    <span>Account equity</span>
                    <strong>{account.totalEquity || account.totalWalletBalance}</strong>
                  </div>
                ) : null}

                {assets.length ? (
                  <div className="connection-assets">
                    {assets.slice(0, 5).map((asset: any, index: number) => (
                      <span key={String(asset.asset ?? index)}>
                        <b>{asset.asset}</b>
                        <small>{asset.walletBalance ?? asset.free ?? asset.equity ?? "—"}</small>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="connection-meta">
                  <span>Verified {connection.verified_at ? new Date(connection.verified_at).toLocaleString() : "—"}</span>
                  <span>Mode {connection.automation_mode}</span>
                </div>

                <form>
                  <input type="hidden" name="connection_id" value={connection.id} />
                  <button formAction={disconnectExchange} className="disconnect-button">
                    <Unplug size={15} /> Disconnect
                  </button>
                </form>
              </article>
            );
          })}

          {!connections?.length ? (
            <div className="route-empty">
              <Cable size={24} />
              <strong>No crypto account connected yet</strong>
              <span>Use one of the verified connector forms below. UTAI will test the key before storing it.</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="connector-grid">
        {connectors.map((connector) => (
          <details className="connector-card" key={connector.key}>
            <summary>
              <span className="exchange-avatar">{connector.name.slice(0, 1)}</span>
              <div>
                <strong>{connector.name}</strong>
                <small>{connector.note}</small>
              </div>
              <span className="connector-state">CONNECT</span>
            </summary>

            <form className="connector-form">
              <input type="hidden" name="platform" value={connector.key} />

              <label>
                Connection label
                <input name="label" placeholder={connector.name + " main account"} autoComplete="off" />
              </label>

              <label>
                API key
                <input name="api_key" type="password" autoComplete="off" required />
              </label>

              <label>
                API secret
                <input name="api_secret" type="password" autoComplete="new-password" required />
              </label>

              {connector.passphrase ? (
                <label>
                  API passphrase
                  <input name="passphrase" type="password" autoComplete="new-password" required />
                </label>
              ) : null}

              <label>
                Environment
                <select name="environment" defaultValue={connector.environments[0]}>
                  {connector.environments.map((environment) => (
                    <option value={environment} key={environment}>{environment}</option>
                  ))}
                </select>
              </label>

              {connector.region ? (
                <label>
                  OKX API region
                  <select name="region" defaultValue="GLOBAL">
                    <option value="GLOBAL">Global / standard</option>
                    <option value="US_AU">US / Australia</option>
                    <option value="EEA">European Economic Area</option>
                  </select>
                </label>
              ) : (
                <input type="hidden" name="region" value="GLOBAL" />
              )}

              <div className="connector-warning">
                <ShieldCheck size={15} />
                <span>
                  Create an exchange API key with only the permissions you actually need.
                  Any key reporting withdrawal permission will be rejected.
                </span>
              </div>

              <button formAction={connectExchange} className="route-action primary connector-submit">
                <PlugZap size={16} /> Verify & securely connect
              </button>
            </form>
          </details>
        ))}
      </section>

      <section className="route-panel">
        <div className="route-panel-title">
          <WalletCards size={18} />
          <div>
            <h3>Next connector wave</h3>
            <small>Visible in the blueprint, but not falsely presented as active.</small>
          </div>
        </div>
        <div className="next-connector-list">
          {nextConnectors.map((name) => <span key={name}>{name}<b>COMING NEXT</b></span>)}
        </div>
        <p className="connection-registry-note">
          {platforms?.length ?? 0} venues are registered in the backend compatibility registry.
          Registration does not automatically mean the live connector is implemented.
        </p>
      </section>
    </TradingAppShell>
  );
}
