import { Activity, RadioTower } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { AdminLiveActivity } from "@/components/admin-live-activity";
import { requireAdmin } from "@/lib/auth";

export default async function ProvidersPage(){
 const {supabase}=await requireAdmin();
 const [{data:providers},{data:system}]=await Promise.all([
  supabase.from("provider_health").select("id,provider_key,status,latency_ms,last_success_at,last_error_at,checked_at").order("provider_key"),
  supabase.from("system_health").select("id,component,status,checked_at").order("component")
 ]);
 return <AdminAppShell active="providers" title="Data & Providers" subtitle="Freshness, availability and source health">
  <section className="route-split admin-route-split"><div className="panel"><div className="panel-head"><div><span className="section-kicker">PROVIDER HEALTH</span><h3>External sources</h3></div><RadioTower size={20}/></div>{(providers??[]).map((p:any)=><article className="admin-route-list-row" key={p.id}><div><strong>{p.provider_key}</strong><span>{p.latency_ms==null?"Latency unavailable":`${p.latency_ms} ms`} · checked {p.checked_at?new Date(p.checked_at).toLocaleString():"never"}</span></div><b>{p.status}</b></article>)}{!providers?.length?<div className="route-empty"><RadioTower size={24}/><strong>No external provider heartbeat</strong><span>Nothing is displayed as healthy without real provider checks.</span></div>:null}</div>
  <div className="panel"><div className="panel-head"><div><span className="section-kicker">SYSTEM HEALTH</span><h3>Internal services</h3></div><Activity size={20}/></div>{(system??[]).map((s:any)=><article className="admin-route-list-row" key={s.id}><div><strong>{s.component}</strong><span>{s.checked_at?new Date(s.checked_at).toLocaleString():"Never checked"}</span></div><b>{s.status}</b></article>)}</div></section>
  <AdminLiveActivity/>
 </AdminAppShell>;
}