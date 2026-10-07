import { CandlestickChart, Search, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { LiveMarketStream } from "@/components/live-market-stream";
import { requireUser } from "@/lib/auth";

export default async function MarketsPage() {
  const { supabase, displayName, notificationCount } = await requireUser();
  const [{data: instruments},{data: symbols}] = await Promise.all([
    supabase.from("market_instruments").select("id,canonical_key,market_type,base_asset,quote_asset").order("market_type").limit(100),
    supabase.from("market_symbols").select("id,venue_symbol,instrument_id").limit(200),
  ]);
  return (
    <TradingAppShell active="markets" title="Markets" subtitle="Real instruments only" displayName={displayName} notificationCount={notificationCount}>
      <section className="route-hero compact"><div><span>MARKET DISCOVERY</span><h2>Find instruments across every supported market.</h2><p>Prices stay blank until an approved live feed is connected. Symbol registry data below comes from the production backend.</p></div><CandlestickChart size={34}/></section>
      <LiveMarketStream />
      <div className="route-toolbar"><div><Search size={16}/><span>Search interface ready for provider-backed symbols</span></div><b>{instruments?.length ?? 0} instruments</b></div>
      <section className="route-panel">
        <div className="route-table-head"><span>Instrument</span><span>Market</span><span>Venue mappings</span><span>Live price</span></div>
        {(instruments ?? []).map((row:any)=>{
          const mapped=(symbols??[]).filter((s:any)=>s.instrument_id===row.id).length;
          return <div className="route-table-row" key={row.id}><div><strong>{row.canonical_key}</strong><small>{row.base_asset ?? "—"} / {row.quote_asset ?? "—"}</small></div><span>{row.market_type}</span><span>{mapped}</span><b className="feed-off">FEED OFFLINE</b></div>;
        })}
        {!instruments?.length ? <div className="route-empty"><ShieldCheck size={24}/><strong>No market instruments registered yet</strong><span>Nothing fake is inserted to make this page look populated.</span></div> : null}
      </section>
    </TradingAppShell>
  );
}