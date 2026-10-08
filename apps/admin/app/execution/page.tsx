import { BarChart3, CircleDollarSign, Zap } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function ExecutionPage(){
  const {supabase}=await requireAdmin();

  const [
    {data:orders},
    {data:trades},
    {data:events},
    {data:paperOrders},
    {data:paperTrades},
    {data:paperPositions},
  ]=await Promise.all([
    supabase.from("orders").select("id,user_id,instrument_key,side,order_type,quantity,status,created_at,updated_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("trades").select("id,user_id,quantity,price,fee,slippage_bps,executed_at").order("executed_at",{ascending:false}).limit(50),
    supabase.from("trade_events").select("id,user_id,event_type,event_at").order("event_at",{ascending:false}).limit(50),
    supabase.from("paper_orders").select("id,user_id,instrument_key,side,order_type,quantity,status,simulated_latency_ms,simulated_slippage_bps,created_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("paper_trades").select("id,user_id,paper_order_id,quantity,fill_price,fee,filled_at").order("filled_at",{ascending:false}).limit(50),
    supabase.from("paper_positions").select("id,user_id,instrument_key,side,quantity,entry_price,status,opened_at").eq("status","OPEN").order("opened_at",{ascending:false}).limit(50),
  ]);

  return <AdminAppShell active="execution" title="Execution" subtitle="Live-order boundary plus real paper execution activity">
    <div className="metric-grid">
      <article className="metric-card"><span>Live orders</span><strong>{orders?.length??0}</strong></article>
      <article className="metric-card"><span>Live fills</span><strong>{trades?.length??0}</strong></article>
      <article className="metric-card"><span>Paper orders</span><strong>{paperOrders?.length??0}</strong></article>
      <article className="metric-card"><span>Open paper positions</span><strong>{paperPositions?.length??0}</strong></article>
    </div>

    <section className="route-split admin-route-split">
      <div className="panel">
        <div className="panel-head">
          <div><span className="section-kicker">PAPER EXECUTION</span><h3>Recent simulated orders</h3></div>
          <CircleDollarSign size={20}/>
        </div>
        {(paperOrders??[]).map((o:any)=><article className="admin-route-list-row" key={o.id}>
          <div>
            <strong>{o.instrument_key}</strong>
            <span>{o.side} · {o.order_type} · qty {o.quantity} · user {String(o.user_id).slice(0,8)}…</span>
            <small>{o.simulated_latency_ms} ms · {o.simulated_slippage_bps} bps simulated slippage</small>
          </div>
          <b>{o.status}</b>
        </article>)}
        {!paperOrders?.length?<div className="route-empty"><CircleDollarSign size={24}/><strong>No paper orders yet</strong><span>Approved AI/quant paper executions will appear here.</span></div>:null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><span className="section-kicker">PAPER FILLS</span><h3>Recorded simulated fills</h3></div>
          <BarChart3 size={20}/>
        </div>
        {(paperTrades??[]).map((t:any)=><article className="admin-route-list-row" key={t.id}>
          <div>
            <strong>Fill {String(t.paper_order_id).slice(0,8)}…</strong>
            <span>qty {t.quantity} · user {String(t.user_id).slice(0,8)}…</span>
          </div>
          <b>{t.fill_price}</b>
        </article>)}
        {!paperTrades?.length?<div className="route-empty"><BarChart3 size={24}/><strong>No paper fills</strong><span>The paper ledger remains empty until a simulated order fills.</span></div>:null}
      </div>
    </section>

    <section className="panel span-12">
      <div className="panel-head">
        <div><span className="section-kicker">LIVE EXECUTION BOUNDARY</span><h3>Real-money orders</h3></div>
        <Zap size={20}/>
      </div>
      {(orders??[]).map((o:any)=><article className="admin-route-list-row" key={o.id}>
        <div><strong>{o.instrument_key}</strong><span>{o.side} · {o.order_type} · qty {o.quantity} · user {String(o.user_id).slice(0,8)}…</span></div>
        <b>{o.status}</b>
      </article>)}
      {!orders?.length?<div className="route-empty"><Zap size={24}/><strong>No live execution records</strong><span>Live execution remains fail-closed until the persistent execution worker and approved adapters are verified.</span></div>:null}
      <small className="admin-note">{events?.length??0} live trade lifecycle events · {paperPositions?.length??0} open paper positions.</small>
    </section>
  </AdminAppShell>;
}
