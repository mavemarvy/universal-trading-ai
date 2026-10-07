import { BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function AIPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:intents},{data:decisions}]=await Promise.all([
    supabase.from("trade_intents").select("id,instrument_key,action,confidence,market_regime,reason_summary,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(20),
    supabase.from("trade_decisions").select("id,trade_intent_id,status,approved_size,reasons,deterministic_policy_version,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(20),
  ]);
  return <TradingAppShell active="ai" title="AI Trade" subtitle="Evidence → intent → risk decision" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero ai-tone"><div><span>AI COPILOT</span><h2>AI proposes. Deterministic risk decides.</h2><p>Every setup is structured, evidence-aware and incapable of bypassing the hard risk authority.</p></div><BrainCircuit size={36}/></section>
    <div className="route-metric-grid"><article><span>Trade intents</span><strong>{intents?.length ?? 0}</strong></article><article><span>Risk decisions</span><strong>{decisions?.length ?? 0}</strong></article><article><span>Direct AI execution</span><strong>BLOCKED</strong></article></div>
    <section className="route-split">
      <div className="route-panel"><div className="route-panel-title"><Sparkles size={18}/><h3>Latest AI intents</h3></div>{(intents??[]).map((x:any)=><article className="route-list-row" key={x.id}><div><strong>{x.instrument_key}</strong><span>{x.action} · {x.market_regime || "regime unknown"}</span><small>{x.reason_summary || "No narrative summary"}</small></div><b>{x.confidence==null?"—":`${Math.round(Number(x.confidence)<=1?Number(x.confidence)*100:Number(x.confidence))}%`}</b></article>)}{!intents?.length?<div className="route-empty"><BrainCircuit size={24}/><strong>No AI intents yet</strong><span>Live evidence providers must be connected before the AI pipeline emits real opportunities.</span></div>:null}</div>
      <div className="route-panel"><div className="route-panel-title"><ShieldCheck size={18}/><h3>Deterministic decisions</h3></div>{(decisions??[]).map((x:any)=><article className="route-list-row" key={x.id}><div><strong>{x.status}</strong><span>Policy {x.deterministic_policy_version || "unversioned"}</span></div><b>{x.approved_size??"—"}</b></article>)}{!decisions?.length?<div className="route-empty"><ShieldCheck size={24}/><strong>No risk decisions yet</strong><span>Nothing can proceed to execution without one.</span></div>:null}</div>
    </section>
  </TradingAppShell>;
}