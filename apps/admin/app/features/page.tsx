import { History } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function FeaturesPage(){
 const {supabase}=await requireAdmin();
 const {data:features}=await supabase.from("feature_registry").select("feature_id,feature_name,status,test_status,location,notes,updated_at").order("feature_id");
 const counts=(features??[]).reduce((a:any,f:any)=>{a[f.status]=(a[f.status]||0)+1;return a;},{});
 return <AdminAppShell active="features" title="Feature Registry" subtitle="No requirement silently disappears">
  <div className="metric-grid"><article className="metric-card"><span>Implemented</span><strong>{counts.IMPLEMENTED||0}</strong></article><article className="metric-card"><span>In progress</span><strong>{counts.IN_PROGRESS||0}</strong></article><article className="metric-card"><span>Scaffolded</span><strong>{counts.SCAFFOLDED||0}</strong></article><article className="metric-card"><span>Total</span><strong>{features?.length??0}</strong></article></div>
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">MASTER BLUEPRINT</span><h3>Tracked requirements</h3></div><History size={20}/></div>{(features??[]).map((f:any)=><article className="feature-admin-full" key={f.feature_id}><span>{f.feature_id}</span><div><strong>{f.feature_name}</strong><small>{f.location||"Location not recorded"} · test {f.test_status}</small><p>{f.notes||"No notes"}</p></div><b>{f.status}</b></article>)}</section>
 </AdminAppShell>;
}