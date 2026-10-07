import { CircleDollarSign, ReceiptText } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function PaperPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:accounts},{data:orders},{data:trades}]=await Promise.all([
    supabase.from("paper_accounts").select("id,name,base_currency,starting_equity,current_equity,created_at").eq("user_id",userId).order("created_at",{ascending:false}),
    supabase.from("paper_orders").select("id,instrument_key,side,order_type,quantity,requested_price,status,simulated_latency_ms,simulated_slippage_bps,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(30),
    supabase.from("paper_trades").select("id,quantity,fill_price,fee,filled_at").eq("user_id",userId).order("filled_at",{ascending:false}).limit(30)
  ]);
  return <TradingAppShell active="portfolio" title="Paper Trading" subtitle="Simulation before bounded automation" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact green-tone"><div><span>SIMULATION</span><h2>Prove behavior before risking capital.</h2><p>Paper orders preserve latency, slippage and fills separately from live execution.</p></div><CircleDollarSign size={34}/></section>
    <div className="route-metric-grid"><article><span>Paper accounts</span><strong>{accounts?.length??0}</strong></article><article><span>Paper orders</span><strong>{orders?.length??0}</strong></article><article><span>Paper fills</span><strong>{trades?.length??0}</strong></article></div>
    <section className="route-panel"><div className="route-panel-title"><ReceiptText size={18}/><h3>Recent paper orders</h3></div>{(orders??[]).map((o:any)=><article className="route-list-row" key={o.id}><div><strong>{o.instrument_key}</strong><span>{o.side} · {o.order_type} · qty {o.quantity}</span><small>Latency {o.simulated_latency_ms??"—"} ms · slippage {o.simulated_slippage_bps??"—"} bps</small></div><b>{o.status}</b></article>)}{!orders?.length?<div className="route-empty"><CircleDollarSign size={24}/><strong>No paper trades yet</strong><span>Simulation records will appear here when the paper execution path is used.</span></div>:null}</section>
  </TradingAppShell>;
}