import { Cable, ShieldCheck } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function PlatformsPage(){
 const {supabase}=await requireAdmin();
 const {data:platforms}=await supabase.from("trading_platforms").select("id,platform_key,name,family,active,platform_capabilities(*)").order("name");
 return <AdminAppShell active="platforms" title="Platforms & Capabilities" subtitle="Policy truth for every supported venue">
  <section className="admin-route-hero"><div><span>VENUE POLICY</span><h2>Automation is a capability, not an assumption.</h2><p>Every platform remains fail-closed until its exact feature and policy state is reviewed.</p></div><Cable size={32}/></section>
  <section className="panel span-12"><div className="admin-route-table platform"><div className="admin-route-table-head"><span>Platform</span><span>Class</span><span>Market data</span><span>Auto execution</span><span>Policy</span></div>{(platforms??[]).map((p:any)=>{const c=Array.isArray(p.platform_capabilities)?p.platform_capabilities[0]:p.platform_capabilities;return <div key={p.id}><span><b>{p.name}</b><small>{p.family||p.platform_key}</small></span><span>{c?.execution_class||"UNKNOWN"}</span><span>{c?.market_data?"YES":"NO"}</span><span>{c?.automated_execution?"YES":"NO"}</span><span>{c?.policy_reviewed?<><ShieldCheck size={13}/> REVIEWED</>:"NEEDS REVIEW"}</span></div>})}</div></section>
 </AdminAppShell>;
}