import { KeyRound, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function SecurityPage(){
  const {supabase,displayName,notificationCount}=await requireUser();
  const [{data:userData},{data:aal},{data:factors}]=await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors()
  ]);
  const user=userData.user;
  const allFactors=[...(factors?.totp??[]),...(factors?.phone??[])];
  return <TradingAppShell active="profile" title="Security" subtitle="Authentication and session state" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact green-tone"><div><span>ACCOUNT SECURITY</span><h2>Your identity boundary.</h2><p>Security state below is read from the current Supabase Auth session.</p></div><ShieldCheck size={34}/></section>
    <div className="route-metric-grid"><article><span>Email confirmed</span><strong>{user?.email_confirmed_at?"YES":"NO"}</strong></article><article><span>Current AAL</span><strong>{aal?.currentLevel??"AAL1"}</strong></article><article><span>MFA factors</span><strong>{allFactors.length}</strong></article></div>
    <section className="route-panel"><div className="route-panel-title"><KeyRound size={18}/><h3>Identity</h3></div><div className="limit-grid"><div><span>Email</span><strong>{user?.email||"—"}</strong></div><div><span>User ID</span><strong className="mono-break">{user?.id||"—"}</strong></div><div><span>Last sign in</span><strong>{user?.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleString():"—"}</strong></div><div><span>Session assurance</span><strong>{aal?.currentLevel??"aal1"}</strong></div></div></section>
  </TradingAppShell>;
}