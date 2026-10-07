import Link from "next/link";
import { ArrowRight, Cable, CandlestickChart, Radar, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { LiveMarketStream } from "@/components/live-market-stream";
import { requireUser } from "@/lib/auth";

export default async function MarketsPage() {
  const { supabase, displayName, notificationCount } = await requireUser();

  const [{ data: instruments }, { data: symbols }] = await Promise.all([
    supabase
      .from("market_instruments")
      .select("id,canonical_key,market_type,base_asset,quote_asset")
      .order("market_type")
      .limit(100),
    supabase
      .from("market_symbols")
      .select("id,venue_symbol,instrument_id")
      .limit(200),
  ]);

  return (
    <TradingAppShell
      active="markets"
      title="Markets"
      subtitle="Live public prices and verified instrument registry"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <LiveMarketStream />

      <section className="route-hero compact">
        <div>
          <span>MARKET DISCOVERY</span>
          <h2>Live prices first. Registry and private venues second.</h2>
          <p>
            BTC, ETH and SOL spot prices above come from a public market WebSocket. Broker-specific
            symbols and private account data stay disabled until a legitimate venue connection exists.
          </p>
        </div>
        <CandlestickChart size={34} />
      </section>

      <section className="market-source-grid">
        <article>
          <span className="market-source-icon live"><CandlestickChart size={18} /></span>
          <div>
            <strong>Public spot stream</strong>
            <small>Real-time ticker and trade tape. No account key required.</small>
          </div>
          <b>LIVE</b>
        </article>

        <Link href="/connections">
          <span className="market-source-icon"><Cable size={18} /></span>
          <div>
            <strong>Broker / exchange accounts</strong>
            <small>Connect a supported venue for account-specific symbols and balances.</small>
          </div>
          <ArrowRight size={16} />
        </Link>

        <Link href="/research">
          <span className="market-source-icon"><Radar size={18} /></span>
          <div>
            <strong>Research evidence</strong>
            <small>News, macro, on-chain and token-security modules live separately.</small>
          </div>
          <ArrowRight size={16} />
        </Link>
      </section>

      <section className="route-panel">
        <div className="route-panel-title">
          <ShieldCheck size={18} />
          <div>
            <h3>Verified instrument registry</h3>
            <small>{instruments?.length ?? 0} canonical instruments · {symbols?.length ?? 0} venue mappings</small>
          </div>
        </div>

        <div className="route-table-head">
          <span>Instrument</span>
          <span>Market</span>
          <span>Venue mappings</span>
          <span>Account feed</span>
        </div>

        {(instruments ?? []).map((row: any) => {
          const mapped = (symbols ?? []).filter(
            (symbol: any) => symbol.instrument_id === row.id
          ).length;

          return (
            <div className="route-table-row" key={row.id}>
              <div>
                <strong>{row.canonical_key}</strong>
                <small>{row.base_asset ?? "—"} / {row.quote_asset ?? "—"}</small>
              </div>
              <span>{row.market_type}</span>
              <span>{mapped}</span>
              <b className="feed-off">PRIVATE FEED OFF</b>
            </div>
          );
        })}

        {!instruments?.length ? (
          <div className="route-empty compact-empty">
            <ShieldCheck size={24} />
            <strong>No canonical instruments registered yet</strong>
            <span>
              The public stream above is still live. This registry stays empty until instruments are
              deliberately mapped in the backend.
            </span>
          </div>
        ) : null}
      </section>
    </TradingAppShell>
  );
}
