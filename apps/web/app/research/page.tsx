import { Bot, Newspaper, Radar, ShieldCheck, Wallet } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function ResearchPage(){
  const {supabase,displayName,notificationCount}=await requireUser();
  const [news,econ,security,wallets,bot]=await Promise.all([
    supabase.from("news_events").select("id",{count:"exact",head:true}),
    supabase.from("economic_events").select("id",{count:"exact",head:true}),
    supabase.from("token_security_reports").select("id",{count:"exact",head:true}),
    supabase.from("wallet_entities").select("id",{count:"exact",head:true}),
    supabase.from("bot_activity").select("id",{count:"exact",head:true}),
  ]);
  const modules=[
    ["News & Macro",Newspaper,news.count??0,"news_events"],
    ["Economic Calendar",Radar,econ.count??0,"economic_events"],
    ["Token Security",ShieldCheck,security.count??0,"token_security_reports"],
    ["Wallet Intelligence",Wallet,wallets.count??0,"wallet_entities"],
    ["Bot / Sniper Activity",Bot,bot.count??0,"bot_activity"],
  ] as const;
  return <TradingAppShell active="research" title="Research" subtitle="Evidence and market intelligence" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact purple-tone"><div><span>RESEARCH MATRIX</span><h2>Every AI claim should point back to evidence.</h2><p>This page exposes what is really present in the intelligence database; unavailable providers remain unavailable.</p></div><Radar size={34}/></section>
    <section className="research-route-grid">{modules.map(([name,Icon,count,table])=><article key={name}><span><Icon size={20}/></span><strong>{name}</strong><b>{count} records</b><small>{table}</small></article>)}</section>
  </TradingAppShell>;
}