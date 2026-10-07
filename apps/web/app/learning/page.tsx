import { BookOpen, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function LearningPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:settings},{data:risk}]=await Promise.all([
    supabase.from("user_settings").select("beginner_mode,locale,timezone").eq("user_id",userId).maybeSingle(),
    supabase.from("risk_profiles").select("mode").eq("user_id",userId).maybeSingle()
  ]);
  const lessons=[
    ["What AI TradeIntent means",Sparkles,"An AI proposal is not an order. It is structured evidence for the risk layer."],
    ["Why risk has final authority",Gauge,"The deterministic engine can modify or reject a setup even when AI confidence is high."],
    ["Why paper comes first",ShieldCheck,"Simulation exposes strategy and execution behavior before live capital is permitted."],
  ] as const;
  return <TradingAppShell active="learning" title="Learning" subtitle="Beginner Guardian" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact purple-tone"><div><span>BEGINNER GUARDIAN</span><h2>Understand the system before trusting it.</h2><p>Your current mode is {settings?.beginner_mode===false?"Pro":"Beginner"} and risk profile is {risk?.mode||"not configured"}.</p></div><BookOpen size={34}/></section>
    <section className="learning-route-grid">{lessons.map(([title,Icon,body],i)=><article key={title}><span>0{i+1}</span><Icon size={22}/><strong>{title}</strong><p>{body}</p></article>)}</section>
  </TradingAppShell>;
}