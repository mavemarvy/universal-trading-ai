import { CandlestickChart, Radar, RadioTower, ShieldCheck } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { fetchMarketOverview } from "@/lib/market-overview";
import { requireAdmin } from "@/lib/auth";

function fmt(v:number|null|undefined,d=4){
  if(v==null||!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined,{maximumFractionDigits:d});
}
function compact(v:number|null|undefined){
  if(v==null||!Number.isFinite(v)) return "—";
  if(Math.abs(v)>=1e9) return (v/1e9).toFixed(2)+"B";
  if(Math.abs(v)>=1e6) return (v/1e6).toFixed(2)+"M";
  if(Math.abs(v)>=1e3) return (v/1e3).toFixed(2)+"K";
  return fmt(v,2);
}

export default async function MarketDataPage(){
  await requireAdmin();
  const market=await fetchMarketOverview();
  const online=Object.values(market.sources).filter(Boolean).length;

  return (
    <AdminAppShell active="market-data" title="Market Data" subtitle="Live CEX venue comparison and DEX activity">
      <section className="admin-route-hero warm">
        <div>
          <span>REAL MARKET OPERATIONS</span>
          <h2>Inspect what the user market terminal is actually receiving.</h2>
          <p>Centralized prices are compared across multiple public exchange feeds. DEX activity comes from live decentralized-market pair data.</p>
        </div>
        <CandlestickChart size={32}/>
      </section>

      <div className="metric-grid">
        <article className="metric-card"><span>Live sources</span><strong>{online}/3</strong></article>
        <article className="metric-card"><span>CEX symbols sampled</span><strong>{market.cex.length}</strong></article>
        <article className="metric-card"><span>DEX hot tokens</span><strong>{market.dex.length}</strong></article>
        <article className="metric-card"><span>Aggregate latency</span><strong>{market.latencyMs} ms</strong></article>
      </div>

      <section className="admin-market-source-strip">
        {Object.entries(market.sources).map(([key,value])=>(
          <span className={value?"online":""} key={key}><i/>{key.toUpperCase()} <b>{value?"LIVE":"DOWN"}</b></span>
        ))}
      </section>

      <section className="panel span-12">
        <div className="panel-head">
          <div><span className="section-kicker">CENTRALIZED EXCHANGES</span><h3>Cross-venue spot monitor</h3></div>
          <RadioTower size={20}/>
        </div>
        <div className="admin-market-table">
          <div className="admin-market-head"><span>Pair</span><span>Price</span><span>24h</span><span>Venues</span><span>Spread</span></div>
          {market.cex.map(row=>{
            const spread=row.minPrice>0?((row.maxPrice-row.minPrice)/row.minPrice)*100:null;
            return (
              <article key={row.symbol}>
                <div><strong>{row.symbol.replace("USDT","/USDT")}</strong><small>{row.venues.map(v=>v.venue).join(" · ")}</small></div>
                <b>{fmt(row.primary.price,8)}</b>
                <span className={Number(row.primary.change24h??0)>=0?"up":"down"}>
                  {row.primary.change24h==null?"—":(row.primary.change24h>=0?"+":"")+fmt(row.primary.change24h,2)+"%"}
                </span>
                <span>{row.venueCount}</span>
                <span>{spread==null?"—":fmt(spread,3)+"%"}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-head">
          <div><span className="section-kicker">DEX / MEME DISCOVERY</span><h3>Active boosted-token pairs</h3></div>
          <Radar size={20}/>
        </div>
        <div className="admin-dex-grid">
          {market.dex.map((row,index)=>(
            <article key={row.chain+row.symbol+index}>
              <div><strong>{row.name}</strong><span>{row.symbol} · {row.chain} · {row.dex}</span></div>
              <b>{"$"+fmt(row.price,8)}</b>
              <span className={Number(row.change24h??0)>=0?"up":"down"}>
                {row.change24h==null?"—":(row.change24h>=0?"+":"")+fmt(row.change24h,2)+"%"}
              </span>
              <small>Vol {compact(row.volume24h)} · Liq {compact(row.liquidity)} · MCap {compact(row.marketCap)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-provider-boundary">
        <ShieldCheck size={17}/>
        <div>
          <strong>Public market data is observational.</strong>
          <span>Availability here does not grant private account access or live-execution permission. Those remain separate connection and risk gates.</span>
        </div>
      </section>
    </AdminAppShell>
  );
}
