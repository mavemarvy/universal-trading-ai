import { Gauge, ShieldAlert } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminRiskPage(){
 const {supabase}=await requireAdmin();
 const [{data:kills},{data:events},{count:profiles}]=await Promise.all([
  supabase.from("kill_switches").select("id,scope_type,scope_ref,mode,active,reason,activated_at,updated_at").order("updated_at",{ascending:false}),
  supabase.from("risk_events").select("id,user_id,severity,event_type,details,created_at").order("created_at",{ascending:false}).limit(50),
  supabase.from("risk_profiles").select("id",{count:"exact",head:true})
 ]);
 return <AdminAppShell active="risk" title="Risk Control" subtitle="Global deterministic safety authority">
  <section className="metric-grid"><article className="metric-card"><span>Risk profiles</span><strong>{profiles??0}</strong></article><article className="metric-card"><span>Active kill switches</span><strong>{(kills??[]).filter((x:any)=>x.active).length}</strong></article><article className="metric-card"><span>Recent risk events</span><strong>{events?.length??0}</strong></article></section>
  <section className="route-split admin-route-split"><div className="panel"><div className="panel-head"><div><span className="section-kicker">KILL SWITCHES</span><h3>Emergency state</h3></div><ShieldAlert size={20}/></div>{(kills??[]).map((k:any)=><article className="admin-route-list-row" key={k.id}><div><strong>{k.scope_type} · {k.mode}</strong><span>{k.scope_ref||"global"} · {k.reason||"No reason"}</span></div><b>{k.active?"ACTIVE":"RELEASED"}</b></article>)}{!kills?.length?<div className="route-empty"><Gauge size={24}/><strong>No kill switch records</strong><span>Normal policy enforcement remains active.</span></div>:null}</div>
  <div className="panel"><div className="panel-head"><div><span className="section-kicker">RISK EVENTS</span><h3>Recent events</h3></div></div>{(events??[]).map((e:any)=><article className="admin-route-list-row" key={e.id}><div><strong>{e.event_type}</strong><span>User {e.user_id.slice(0,8)}…</span></div><b>{e.severity}</b></article>)}</div></section>
 </AdminAppShell>;
}