import { BrainCircuit } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AIAdminPage(){
 const {supabase}=await requireAdmin();
 const [{data:models},{data:versions},{data:metrics}]=await Promise.all([
  supabase.from("models").select("id,model_key,name,task,created_at").order("name"),
  supabase.from("model_versions").select("id,model_id,version,artifact_ref,deployment_status,created_at").order("created_at",{ascending:false}),
  supabase.from("model_metrics").select("id,model_version_id,metric_key,metric_value,measured_at").order("measured_at",{ascending:false}).limit(100)
 ]);
 return <AdminAppShell active="ai" title="AI & Models" subtitle="Model registry, versions and measured behavior">
  <section className="admin-route-hero purple"><div><span>MODEL GOVERNANCE</span><h2>Models are versioned components, not invisible magic.</h2><p>Deployment state and metrics stay separate from trading authority.</p></div><BrainCircuit size={32}/></section>
  <section className="route-split admin-route-split"><div className="panel"><div className="panel-head"><div><span className="section-kicker">MODELS</span><h3>Registry</h3></div></div>{(models??[]).map((m:any)=><article className="admin-route-list-row" key={m.id}><div><strong>{m.name}</strong><span>{m.model_key} · {m.task}</span></div><b>{(versions??[]).filter((v:any)=>v.model_id===m.id).length} versions</b></article>)}{!models?.length?<div className="route-empty"><BrainCircuit size={24}/><strong>No deployed model registry</strong><span>Service scaffolds are not mislabeled as trained models.</span></div>:null}</div>
  <div className="panel"><div className="panel-head"><div><span className="section-kicker">VERSIONS</span><h3>Deployment state</h3></div></div>{(versions??[]).map((v:any)=><article className="admin-route-list-row" key={v.id}><div><strong>v{v.version}</strong><span>{v.artifact_ref||"No artifact reference"}</span></div><b>{v.deployment_status}</b></article>)}<small className="admin-note">{metrics?.length??0} model metric records available.</small></div></section>
 </AdminAppShell>;
}