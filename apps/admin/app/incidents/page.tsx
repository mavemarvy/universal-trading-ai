import { AlertTriangle, ShieldAlert } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function IncidentsPage(){
 const {supabase}=await requireAdmin();
 const [{data:incidents},{data:scams}]=await Promise.all([
  supabase.from("security_incidents").select("id,severity,status,evidence,occurred_at,created_at").order("created_at",{ascending:false}).limit(100),
  supabase.from("scam_reports").select("id,source,source_uri,evidence_level,created_at").order("created_at",{ascending:false}).limit(100)
 ]);
 return <AdminAppShell active="incidents" title="Incidents" subtitle="Security and fraud evidence">
  <section className="route-split admin-route-split"><div className="panel"><div className="panel-head"><div><span className="section-kicker">SECURITY INCIDENTS</span><h3>Verified records</h3></div><ShieldAlert size={20}/></div>{(incidents??[]).map((i:any)=><article className="admin-route-list-row" key={i.id}><div><strong>{i.status}</strong><span>{i.occurred_at?new Date(i.occurred_at).toLocaleString():"Time unknown"}</span></div><b>{i.severity}</b></article>)}{!incidents?.length?<div className="route-empty"><ShieldAlert size={24}/><strong>No incident records</strong><span>No fake threat feed is generated.</span></div>:null}</div>
  <div className="panel"><div className="panel-head"><div><span className="section-kicker">SCAM REPORTS</span><h3>Evidence sources</h3></div><AlertTriangle size={20}/></div>{(scams??[]).map((s:any)=><article className="admin-route-list-row" key={s.id}><div><strong>{s.source}</strong><span>{s.source_uri||"No URI"}</span></div><b>{s.evidence_level}</b></article>)}{!scams?.length?<div className="route-empty"><AlertTriangle size={24}/><strong>No scam evidence records</strong><span>External intelligence providers remain unconfigured.</span></div>:null}</div></section>
 </AdminAppShell>;
}