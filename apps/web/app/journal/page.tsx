import { History, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function JournalPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:intents},{data:decisions},{data:events}]=await Promise.all([
    supabase.from("trade_intents").select("id,instrument_key,action,reason_summary,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(25),
    supabase.from("trade_decisions").select("id,trade_intent_id,status,reasons,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(25),
    supabase.from("trade_events").select("id,event_type,payload,event_at").eq("user_id",userId).order("event_at",{ascending:false}).limit(25),
  ]);
  const timeline=[
    ...(intents??[]).map((x:any)=>({id:x.id,at:x.created_at,type:"AI INTENT",title:`${x.instrument_key} · ${x.action}`,detail:x.reason_summary||"No summary"})),
    ...(decisions??[]).map((x:any)=>({id:x.id,at:x.created_at,type:"RISK DECISION",title:String(x.status),detail:"Deterministic decision recorded"})),
    ...(events??[]).map((x:any)=>({id:x.id,at:x.event_at,type:"TRADE EVENT",title:x.event_type,detail:x.payload?.message||"Execution lifecycle event"})),
  ].sort((a,b)=>+new Date(b.at)-+new Date(a.at)).slice(0,40);
  return <TradingAppShell active="journal" title="Decision Journal" subtitle="Forensic history for every trade" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact neutral-tone"><div><span>FORENSIC TIMELINE</span><h2>Why did the system do that?</h2><p>The journal keeps AI proposals, deterministic decisions and execution lifecycle events distinct.</p></div><History size={34}/></section>
    <section className="route-panel journal-route">{timeline.map((x:any)=><article key={`${x.type}-${x.id}`}><span className="journal-dot"/><div><b>{x.type}</b><strong>{x.title}</strong><small>{x.detail}</small></div><time>{new Date(x.at).toLocaleString()}</time></article>)}{!timeline.length?<div className="route-empty"><ShieldCheck size={24}/><strong>No trading history yet</strong><span>The journal will fill from real backend events only.</span></div>:null}</section>
  </TradingAppShell>;
}