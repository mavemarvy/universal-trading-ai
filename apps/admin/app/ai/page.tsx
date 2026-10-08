import { BrainCircuit, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AIAdminPage(){
  const {supabase}=await requireAdmin();

  const [
    {data:models},
    {data:versions},
    {data:metrics},
    {data:intents},
    {data:decisions},
    {data:paperPositions},
  ]=await Promise.all([
    supabase.from("models").select("id,model_key,name,task,created_at").order("name"),
    supabase.from("model_versions").select("id,model_id,version,artifact_ref,deployment_status,created_at").order("created_at",{ascending:false}),
    supabase.from("model_metrics").select("id,model_version_id,metric_key,metric_value,measured_at").order("measured_at",{ascending:false}).limit(100),
    supabase.from("trade_intents").select("id,user_id,instrument_key,action,confidence,market_regime,strategy_key,strategy_version,reason_summary,created_at").order("created_at",{ascending:false}).limit(60),
    supabase.from("trade_decisions").select("id,user_id,trade_intent_id,status,approved_size,reasons,deterministic_policy_version,created_at").order("created_at",{ascending:false}).limit(60),
    supabase.from("paper_positions").select("id,user_id,instrument_key,side,quantity,entry_price,current_price,status,opened_at").eq("status","OPEN").order("opened_at",{ascending:false}).limit(60),
  ]);

  const approvals=(decisions??[]).filter((row:any)=>row.status==="APPROVE").length;
  const rejections=(decisions??[]).filter((row:any)=>row.status==="REJECT").length;
  const localMl=(intents??[]).filter((row:any)=>String(row.strategy_key).includes("local_ml")).length;

  return <AdminAppShell active="ai" title="AI & Models" subtitle="Model registry plus live intent and risk-decision oversight">
    <section className="admin-route-hero purple">
      <div>
        <span>MODEL GOVERNANCE</span>
        <h2>See what the model proposed and what deterministic risk actually allowed.</h2>
        <p>Model output, risk decisions and paper execution remain separate records so the control plane can audit every step.</p>
      </div>
      <BrainCircuit size={32}/>
    </section>

    <div className="metric-grid">
      <article className="metric-card"><span>Recent intents</span><strong>{intents?.length??0}</strong></article>
      <article className="metric-card"><span>Risk approvals</span><strong>{approvals}</strong></article>
      <article className="metric-card"><span>Risk rejections</span><strong>{rejections}</strong></article>
      <article className="metric-card"><span>Open paper positions</span><strong>{paperPositions?.length??0}</strong></article>
    </div>

    <section className="route-split admin-route-split">
      <div className="panel">
        <div className="panel-head">
          <div><span className="section-kicker">LIVE MODEL OUTPUT</span><h3>Recent TradeIntents</h3></div>
          <Sparkles size={20}/>
        </div>

        {(intents??[]).map((intent:any)=><article className="admin-route-list-row" key={intent.id}>
          <div>
            <strong>{intent.instrument_key} · {intent.action}</strong>
            <span>{intent.strategy_key} v{intent.strategy_version} · {intent.market_regime}</span>
            <small>{intent.reason_summary}</small>
          </div>
          <b>{Math.round(Number(intent.confidence||0)*100)}%</b>
        </article>)}

        {!intents?.length?<div className="route-empty"><BrainCircuit size={24}/><strong>No model intents yet</strong><span>User analysis runs will appear here immediately after they are stored.</span></div>:null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><span className="section-kicker">DETERMINISTIC AUTHORITY</span><h3>Risk decisions</h3></div>
          <ShieldAlert size={20}/>
        </div>

        {(decisions??[]).map((decision:any)=><article className="admin-route-list-row" key={decision.id}>
          <div>
            <strong>{decision.status}</strong>
            <span>Intent {String(decision.trade_intent_id).slice(0,8)}… · policy {decision.deterministic_policy_version}</span>
            <small>{Array.isArray(decision.reasons)&&decision.reasons.length?decision.reasons.join(" · "):"No rejection reasons"}</small>
          </div>
          <b>{decision.status==="APPROVE"?decision.approved_size:"0"}</b>
        </article>)}

        {!decisions?.length?<div className="route-empty"><CheckCircle2 size={24}/><strong>No risk decisions yet</strong><span>The AI/ML path has not produced a persisted decision yet.</span></div>:null}
      </div>
    </section>

    <section className="route-split admin-route-split">
      <div className="panel">
        <div className="panel-head"><div><span className="section-kicker">MODEL REGISTRY</span><h3>Registered models</h3></div></div>
        {(models??[]).map((m:any)=><article className="admin-route-list-row" key={m.id}><div><strong>{m.name}</strong><span>{m.model_key} · {m.task}</span></div><b>{(versions??[]).filter((v:any)=>v.model_id===m.id).length} versions</b></article>)}
        {!models?.length?<div className="route-empty"><BrainCircuit size={24}/><strong>No separately deployed model registry</strong><span>The active local ML edge path is tracked through TradeIntent strategy/model metadata while full persistent model services remain pending.</span></div>:null}
      </div>

      <div className="panel">
        <div className="panel-head"><div><span className="section-kicker">PAPER POSITIONS</span><h3>Open model-driven simulations</h3></div></div>
        {(paperPositions??[]).map((p:any)=><article className="admin-route-list-row" key={p.id}><div><strong>{p.instrument_key} · {p.side}</strong><span>User {String(p.user_id).slice(0,8)}… · qty {p.quantity}</span></div><b>{p.entry_price}</b></article>)}
        {!paperPositions?.length?<div className="route-empty"><BrainCircuit size={24}/><strong>No open paper positions</strong><span>Approved paper fills will be visible here.</span></div>:null}
        <small className="admin-note">{metrics?.length??0} model metric records · {localMl} recent local-ML intents.</small>
      </div>
    </section>
  </AdminAppShell>;
}
