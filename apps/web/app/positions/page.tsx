import { Target, TrendingUp } from "lucide-react";
import { LiveActivity } from "@/components/live-activity";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function PositionsPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const {data:positions}=await supabase.from("positions").select("id,instrument_key,side,quantity,entry_price,current_price,leverage,status,opened_at").eq("user_id",userId).order("opened_at",{ascending:false}).limit(50);
  return <TradingAppShell active="positions" title="Positions" subtitle="Aggregated account exposure" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact neutral-tone"><div><span>POSITION BOOK</span><h2>Know exactly what is open and where.</h2><p>Same-direction exposure is meant to aggregate before risk approves additional size.</p></div><TrendingUp size={34}/></section>
    <section className="route-panel">
      <div className="route-table-head six"><span>Instrument</span><span>Side</span><span>Qty</span><span>Entry</span><span>Current</span><span>Status</span></div>
      {(positions??[]).map((p:any)=><div className="route-table-row six" key={p.id}><strong>{p.instrument_key}</strong><span>{p.side}</span><span>{p.quantity}</span><span>{p.entry_price??"—"}</span><span>{p.current_price??"—"}</span><b>{p.status}</b></div>)}
      {!positions?.length?<div className="route-empty"><Target size={24}/><strong>No positions</strong><span>Paper or approved live positions will appear here from the real database.</span></div>:null}
    </section>
    <LiveActivity userId={userId}/>
  </TradingAppShell>;
}