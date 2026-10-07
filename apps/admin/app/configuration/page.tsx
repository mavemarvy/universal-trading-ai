import { KeyRound, ShieldCheck } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function ConfigurationPage(){
 const {supabase}=await requireAdmin();
 const {data:settings}=await supabase.from("system_settings").select("id,setting_key,value,version,updated_at").order("setting_key");
 return <AdminAppShell active="configuration" title="Secrets & Configuration" subtitle="Versioned settings without exposing credentials">
  <section className="admin-route-hero warm"><div><span>SECURE CONFIGURATION</span><h2>References, policies and versions — never raw secrets.</h2><p>Provider credentials belong in secret storage. The database carries only safe configuration and references.</p></div><KeyRound size={32}/></section>
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">SYSTEM SETTINGS</span><h3>Versioned configuration</h3></div><ShieldCheck size={20}/></div>{(settings??[]).map((s:any)=><article className="admin-route-list-row" key={s.id}><div><strong>{s.setting_key}</strong><span>Updated {s.updated_at?new Date(s.updated_at).toLocaleString():"—"}</span></div><b>v{s.version}</b></article>)}{!settings?.length?<div className="route-empty"><KeyRound size={24}/><strong>No system settings records</strong><span>No secret values are fabricated or exposed.</span></div>:null}</section>
 </AdminAppShell>;
}