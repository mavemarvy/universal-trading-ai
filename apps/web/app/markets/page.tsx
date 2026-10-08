import Link from "next/link";
import { ArrowRight, Bot, Cable, CandlestickChart, Radar, ShieldCheck, TrendingUp } from "lucide-react";
import { MarketExplorer } from "@/components/market-explorer";
import { TradingAppShell } from "@/components/trading-app-shell";
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
      subtitle="Multi-exchange crypto and DEX discovery"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero compact warm-tone">
        <div>
          <span>REAL MARKET DISCOVERY</span>
          <h2>Search exchanges, compare venues and discover active DEX tokens.</h2>
          <p>
            Centralized market prices are aggregated from Bybit, Binance and OKX. DEX and meme-token
            discovery comes from live DEX Screener pair data. No placeholder prices are inserted.
          </p>
        </div>
        <CandlestickChart size={34} />
      </section>

      <section className="market-primary-actions">
        <Link href="/trade">
          <span><TrendingUp size={18} /></span>
          <div><strong>Open trading terminal</strong><small>Chart, order book and recent trades</small></div>
          <ArrowRight size={16} />
        </Link>
        <Link href="/connections">
          <span><Cable size={18} /></span>
          <div><strong>Connect exchange</strong><small>Bybit, Binance or OKX</small></div>
          <ArrowRight size={16} />
        </Link>
        <Link href="/ai">
          <span><Bot size={18} /></span>
          <div><strong>AI market analysis</strong><small>Analyze a market and create an intent</small></div>
          <ArrowRight size={16} />
        </Link>
        <Link href="/news">
          <span><Radar size={18} /></span>
          <div><strong>Live news</strong><small>Crypto, macro, forex and stocks</small></div>
          <ArrowRight size={16} />
        </Link>
      </section>

      <MarketExplorer />

      <details className="market-registry-details">
        <summary>
          <div>
            <ShieldCheck size={17} />
            <span>
              Backend instrument registry · {instruments?.length ?? 0} canonical instruments · {symbols?.length ?? 0} mappings
            </span>
          </div>
          <ArrowRight size={15} />
        </summary>

        <section className="route-panel">
          <div className="route-table-head">
            <span>Instrument</span>
            <span>Market</span>
            <span>Venue mappings</span>
            <span>Private account feed</span>
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
                <b className="feed-off">ACCOUNT FEED OFF</b>
              </div>
            );
          })}

          {!instruments?.length ? (
            <div className="route-empty compact-empty">
              <ShieldCheck size={24} />
              <strong>No private instrument mappings yet</strong>
              <span>
                This does not stop the public market explorer above. Private account mappings appear
                after supported exchange connectors are deliberately registered.
              </span>
            </div>
          ) : null}
        </section>
      </details>
    </TradingAppShell>
  );
}
