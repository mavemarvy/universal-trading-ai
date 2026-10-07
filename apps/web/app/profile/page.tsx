import Link from "next/link";
import { Bell, Cable, Gauge, KeyRound, LogOut, Save, ShieldCheck, UserCircle } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";
import { logout, updateProfile } from "./actions";

export default async function ProfilePage({searchParams}:{searchParams:Promise<{updated?:string}>}){
  const query=await searchParams;
  const {supabase,userId,displayName,notificationCount,onboardingComplete}=await requireUser();
  const [{data:profile},{data:settings},{data:userData}]=await Promise.all([
    supabase.from("profiles").select("display_name,experience_level,default_automation_mode,created_at").eq("id",userId).maybeSingle(),
    supabase.from("user_settings").select("locale,timezone,beginner_mode").eq("user_id",userId).maybeSingle(),
    supabase.auth.getUser()
  ]);
  return <TradingAppShell active="profile" title="Profile" subtitle="Identity, preferences and account controls" displayName={displayName} notificationCount={notificationCount}>
    <section className="profile-route-head"><div className="profile-avatar-large">{displayName.slice(0,1).toUpperCase()}</div><div><span>TRADING PROFILE</span><h2>{displayName}</h2><p>{userData.data.user?.email||"Authenticated account"} · Onboarding {onboardingComplete?"complete":"incomplete"}</p></div></section>
    {query.updated?<div className="route-success"><ShieldCheck size={16}/> Profile saved.</div>:null}
    <section className="route-split">
      <form className="route-panel profile-form">
        <div className="route-panel-title"><UserCircle size={18}/><h3>Personal settings</h3></div>
        <label>Display name<input name="display_name" defaultValue={profile?.display_name||""}/></label>
        <label>Experience level<select name="experience_level" defaultValue={profile?.experience_level||""}><option value="">Not selected</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
        <label className="toggle-line"><input type="checkbox" name="beginner_mode" defaultChecked={settings?.beginner_mode!==false}/><span>Beginner Guardian enabled</span></label>
        <button formAction={updateProfile} className="route-action primary"><Save size={16}/>Save profile</button>
      </form>
      <div className="route-panel">
        <div className="route-panel-title"><KeyRound size={18}/><h3>Account shortcuts</h3></div>
        <div className="profile-link-grid">
          <Link href="/notifications"><Bell size={18}/><div><strong>Notifications</strong><span>{notificationCount} unread</span></div></Link>
          <Link href="/connections"><Cable size={18}/><div><strong>Platform connections</strong><span>Broker / exchange access</span></div></Link>
          <Link href="/risk"><Gauge size={18}/><div><strong>Risk center</strong><span>Limits and safety</span></div></Link>
          <Link href="/security"><ShieldCheck size={18}/><div><strong>Security</strong><span>Session and authentication</span></div></Link>
        </div>
        <form><button formAction={logout} className="route-action danger"><LogOut size={16}/>Sign out</button></form>
      </div>
    </section>
  </TradingAppShell>;
}