import { BarChart3, Zap } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function ExecutionPage(){
 const {supabase}=await requireAdmin();
 const [{data:orders},{data:trades},{data:events}]=await Promise.all([
  supabase.from("orders").select("id,user_id,instrument_key,side,order_type,quantity,status,created_at,updated_at").order("created_at",{ascending:false}).limit(50),
  supabase.from("trades").select("id,user_id,quantity,price,fee,slippage_bps,executed_at").order("executed_at",{ascending:false}).limit(50),
  supabase.from("trade_events").select("id,user_id,event_type,event_at").order("event_at",{ascending:false}).limit(50)
 ]);
 return <AdminAppShell active="execution" title="Execution" subtitle="Orders, fills and lifecycle oversight">
  <div className="metric-grid"><article className="metric-card"><span>Orders</span><strong>{orders?.length??0}</strong></article><article className="metric-card"><span>Fills</span><strong>{trades?.length??0}</strong></article><article className="metric-card"><span>Trade events</span><strong>{events?.length??0}</strong></article></div>
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">ORDER FLOW</span><h3>Recent orders</h3></div><BarChart3 size={20}/></div>{(orders??[]).map((o:any)=><article className="admin-route-list-row" key={o.id}><div><strong>{o.instrument_key}</strong><span>{o.side} · {o.order_type} · qty {o.quantity} · user {o.user_id.slice(0,8)}…</span></div><b>{o.status}</b></article>)}{!orders?.length?<div className="route-empty"><Zap size={24}/><strong>No execution records</strong><span>Live execution has not been falsely activated.</span></div>:null}</section>
 </AdminAppShell>;
}