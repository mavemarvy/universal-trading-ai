import { ShieldCheck, Users } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function UsersPage(){
 const {supabase}=await requireAdmin();
 const [{data:profiles},{data:admins},{data:subscriptions}]=await Promise.all([
   supabase.from("profiles").select("id,display_name,experience_level,onboarding_complete,default_automation_mode,created_at").order("created_at",{ascending:false}).limit(100),
   supabase.from("admin_memberships").select("id,user_id,status,mfa_required,created_at,admin_roles(role_key,name)").order("created_at",{ascending:false}),
   supabase.from("subscriptions").select("id,user_id,plan_key,status,current_period_end")
 ]);
 return <AdminAppShell active="users" title="Users & Access" subtitle="Identity, onboarding and privileged membership">
  <section className="metric-grid"><article className="metric-card"><span>Profiles</span><strong>{profiles?.length??0}</strong></article><article className="metric-card"><span>Admin memberships</span><strong>{admins?.length??0}</strong></article><article className="metric-card"><span>Subscriptions</span><strong>{subscriptions?.length??0}</strong></article></section>
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">IDENTITIES</span><h3>User profiles</h3></div><Users size={20}/></div>
  <div className="admin-route-table"><div className="admin-route-table-head"><span>User</span><span>Experience</span><span>Onboarding</span><span>Default mode</span></div>{(profiles??[]).map((p:any)=><div key={p.id}><span><b>{p.display_name||"Unnamed user"}</b><small>{p.id.slice(0,8)}…</small></span><span>{p.experience_level||"—"}</span><span>{p.onboarding_complete?"COMPLETE":"INCOMPLETE"}</span><span>{p.default_automation_mode}</span></div>)}</div></section>
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">PRIVILEGED ACCESS</span><h3>Admin memberships</h3></div><ShieldCheck size={20}/></div>{(admins??[]).map((a:any)=>{const r=Array.isArray(a.admin_roles)?a.admin_roles[0]:a.admin_roles;return <article className="admin-route-list-row" key={a.id}><div><strong>{r?.name||r?.role_key||"Admin"}</strong><span>User {a.user_id.slice(0,8)}… · MFA {a.mfa_required?"required":"optional"}</span></div><b>{a.status}</b></article>})}</section>
 </AdminAppShell>;
}