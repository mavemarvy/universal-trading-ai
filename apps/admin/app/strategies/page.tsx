import { Bot } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function StrategiesPage(){
 const {supabase}=await requireAdmin();
 const [{data:strategies},{data:versions}]=await Promise.all([
  supabase.from("strategies").select("id,strategy_key,name,description,enabled,created_at").order("name"),
  supabase.from("strategy_versions").select("id,strategy_id,version,deployment_status,created_at").order("created_at",{ascending:false})
 ]);
 return <AdminAppShell active="strategies" title="Strategies" subtitle="Versioned trading logic and deployment state">
  <section className="admin-route-hero warm"><div><span>STRATEGY GOVERNANCE</span><h2>Every strategy needs a name, version and state.</h2><p>Enabled does not mean unrestricted execution; risk and platform policy still control the final path.</p></div><Bot size={32}/></section>
  <section className="panel span-12">{(strategies??[]).map((s:any)=><article className="strategy-admin-row" key={s.id}><div><strong>{s.name}</strong><span>{s.strategy_key}</span><small>{s.description||"No description"}</small></div><div><b>{(versions??[]).filter((v:any)=>v.strategy_id===s.id).length} versions</b><span>{s.enabled?"ENABLED":"DISABLED"}</span></div></article>)}{!strategies?.length?<div className="route-empty"><Bot size={24}/><strong>No production strategy registry yet</strong><span>Strategy-engine scaffolding is not presented as a working strategy.</span></div>:null}</section>
 </AdminAppShell>;
}