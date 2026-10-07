import { Gauge, ShieldAlert, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function RiskPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:profile},{data:limits},{data:controls},{data:kills}]=await Promise.all([
    supabase.from("risk_profiles").select("id,mode,trading_capital,max_acceptable_loss,profit_target").eq("user_id",userId).maybeSingle(),
    supabase.from("risk_limits").select("max_risk_per_trade,max_daily_loss,max_drawdown,max_leverage,max_positions,max_correlated_exposure,max_platform_exposure,max_asset_exposure,max_memecoin_exposure,max_slippage_bps,min_liquidity,min_confidence,min_expected_edge,max_spread_bps").eq("user_id",userId).maybeSingle(),
    supabase.from("account_trading_controls").select("id,suspended,mode,reason,updated_at").eq("user_id",userId),
    supabase.from("kill_switches").select("id,scope_type,scope_ref,mode,active,reason,activated_at").eq("active",true)
  ]);
  const rows=[["Risk / trade",limits?.max_risk_per_trade],["Daily loss",limits?.max_daily_loss],["Drawdown",limits?.max_drawdown],["Max leverage",limits?.max_leverage],["Max positions",limits?.max_positions],["Correlated exposure",limits?.max_correlated_exposure],["Platform exposure",limits?.max_platform_exposure],["Asset exposure",limits?.max_asset_exposure],["Memecoin exposure",limits?.max_memecoin_exposure],["Max slippage bps",limits?.max_slippage_bps],["Min confidence",limits?.min_confidence],["Min expected edge",limits?.min_expected_edge]] as const;
  return <TradingAppShell active="risk" title="Risk Center" subtitle="Hard authority over every trade" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact risk-tone"><div><span>DETERMINISTIC RISK</span><h2>AI cannot override this page.</h2><p>Limits are stored independently from model output and remain authoritative even when AI services are unavailable.</p></div><Gauge size={34}/></section>
    <div className="route-metric-grid"><article><span>Mode</span><strong>{profile?.mode??"NOT SET"}</strong></article><article><span>Capital</span><strong>{profile?.trading_capital??"—"}</strong></article><article><span>Active kill switches</span><strong>{kills?.length??0}</strong></article></div>
    <section className="route-split"><div className="route-panel"><div className="route-panel-title"><ShieldCheck size={18}/><h3>Hard limits</h3></div><div className="limit-grid">{rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value??"Not set"}</strong></div>)}</div></div><div className="route-panel"><div className="route-panel-title"><ShieldAlert size={18}/><h3>Account controls</h3></div>{(controls??[]).map((c:any)=><article className="route-list-row" key={c.id}><div><strong>{c.mode}</strong><span>{c.suspended?"Suspended":"Active"} · {c.reason||"No reason recorded"}</span></div></article>)}{!controls?.length?<div className="route-empty"><ShieldCheck size={24}/><strong>No account override active</strong><span>Normal deterministic policy remains in force.</span></div>:null}</div></section>
  </TradingAppShell>;
}