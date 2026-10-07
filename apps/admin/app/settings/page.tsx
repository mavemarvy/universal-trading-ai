import { Settings2, ShieldCheck } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSettingsPage(){
 const {supabase,userId,membership}=await requireAdmin();
 const [{data:role},{data:permissions},{data:aal}]=await Promise.all([
  supabase.from("admin_roles").select("role_key,name").eq("id",membership.admin_role_id).maybeSingle(),
  supabase.from("admin_role_permissions").select("admin_permissions(permission_key,description)").eq("admin_role_id",membership.admin_role_id),
  supabase.auth.mfa.getAuthenticatorAssuranceLevel()
 ]);
 return <AdminAppShell active="settings" title="Admin Settings" subtitle="Your privileged session and permissions">
  <section className="admin-route-hero neutral"><div><span>SESSION SECURITY</span><h2>{role?.name||role?.role_key||"Administrator"}</h2><p>User {userId.slice(0,8)}… · membership {membership.status} · current assurance {aal?.currentLevel||"unknown"}.</p></div><Settings2 size={32}/></section>
  <section className="panel span-12"><div className="panel-head"><div><span className="section-kicker">PERMISSIONS</span><h3>Effective role mapping</h3></div><ShieldCheck size={20}/></div><div className="permission-grid">{(permissions??[]).map((p:any)=>{const permission=Array.isArray(p.admin_permissions)?p.admin_permissions[0]:p.admin_permissions;return <article key={permission?.permission_key}><strong>{permission?.permission_key}</strong><span>{permission?.description||"No description"}</span></article>})}</div></section>
 </AdminAppShell>;
}