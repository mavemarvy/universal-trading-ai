import { Cable, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function ConnectionsPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:connections},{data:platforms}]=await Promise.all([
    supabase.from("platform_connections").select("id,automation_mode,withdrawal_permission,status,last_health_at,created_at,trading_platforms(name,family)").eq("user_id",userId).order("created_at",{ascending:false}),
    supabase.from("trading_platforms").select("id,name,family,active").eq("active",true).order("name")
  ]);
  return <TradingAppShell active="connections" title="Platform Connections" subtitle="Official, least-privilege access" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact warm-tone"><div><span>BROKER / EXCHANGE CONNECTIVITY</span><h2>Connect accounts without giving away custody.</h2><p>Withdrawal permission is forbidden by design. Connections should use official APIs or legitimate supported adapters.</p></div><Cable size={34}/></section>
    <section className="route-split"><div className="route-panel"><div className="route-panel-title"><Cable size={18}/><h3>Your connections</h3></div>{(connections??[]).map((c:any)=>{const p=Array.isArray(c.trading_platforms)?c.trading_platforms[0]:c.trading_platforms;return <article className="route-list-row" key={c.id}><div><strong>{p?.name||"Unknown venue"}</strong><span>{c.automation_mode} · {c.status}</span><small>Withdrawal permission: {c.withdrawal_permission?"ERROR":"disabled"}</small></div><b>{c.last_health_at?"CHECKED":"UNVERIFIED"}</b></article>})}{!connections?.length?<div className="route-empty"><Cable size={24}/><strong>No connected platform yet</strong><span>No account credentials are fabricated.</span></div>:null}</div><div className="route-panel"><div className="route-panel-title"><ShieldCheck size={18}/><h3>Registered venues</h3></div>{(platforms??[]).map((p:any)=><article className="route-list-row" key={p.id}><div><strong>{p.name}</strong><span>{p.family||"Venue"}</span></div><b>POLICY-GATED</b></article>)}</div></section>
  </TradingAppShell>;
}