import { ScrollText } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { AdminLiveActivity } from "@/components/admin-live-activity";
import { requireAdmin } from "@/lib/auth";

export default async function AuditPage(){
 const {supabase}=await requireAdmin();
 const {data:logs}=await supabase.from("audit_logs").select("id,actor_user_id,actor_db_role,action,table_name,row_id,correlation_id,created_at").order("created_at",{ascending:false}).limit(200);
 return <AdminAppShell active="audit" title="Audit Trail" subtitle="Privileged history and accountability">
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">IMMUTABLE HISTORY</span><h3>Recent audit entries</h3></div><ScrollText size={20}/></div><div className="audit-admin-table"><div><b>Action</b><b>Table</b><b>Actor</b><b>Time</b></div>{(logs??[]).map((l:any)=><div key={l.id}><span>{l.action}</span><span>{l.table_name||"system"}</span><span>{l.actor_user_id?l.actor_user_id.slice(0,8)+"…":l.actor_db_role||"system"}</span><time>{new Date(l.created_at).toLocaleString()}</time></div>)}</div></section>
  <AdminLiveActivity/>
 </AdminAppShell>;
}