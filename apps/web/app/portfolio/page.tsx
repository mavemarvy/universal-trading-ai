import { PieChart, Wallet } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function PortfolioPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const [{data:portfolios},{data:allocations},{data:paper}]=await Promise.all([
    supabase.from("portfolios").select("id,name,base_currency,created_at").eq("user_id",userId).order("created_at",{ascending:false}),
    supabase.from("portfolio_allocations").select("id,portfolio_id,asset_key,target_pct").eq("user_id",userId).order("asset_key"),
    supabase.from("paper_accounts").select("id,name,base_currency,starting_equity,current_equity").eq("user_id",userId)
  ]);
  return <TradingAppShell active="portfolio" title="Portfolio" subtitle="Allocation and capital context" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-hero compact warm-tone"><div><span>PORTFOLIO ENGINE</span><h2>Capital context before every trade.</h2><p>Allocation targets and account equity live here so risk can evaluate total exposure, not isolated orders.</p></div><Wallet size={34}/></section>
    <div className="route-metric-grid"><article><span>Portfolios</span><strong>{portfolios?.length??0}</strong></article><article><span>Allocation rules</span><strong>{allocations?.length??0}</strong></article><article><span>Paper accounts</span><strong>{paper?.length??0}</strong></article></div>
    <section className="route-split"><div className="route-panel"><div className="route-panel-title"><Wallet size={18}/><h3>Portfolios</h3></div>{(portfolios??[]).map((p:any)=><article className="route-list-row" key={p.id}><div><strong>{p.name}</strong><span>Base currency {p.base_currency}</span></div><b>{(allocations??[]).filter((a:any)=>a.portfolio_id===p.id).length} rules</b></article>)}{!portfolios?.length?<div className="route-empty"><Wallet size={24}/><strong>No portfolio created</strong><span>Your production database is empty for this account.</span></div>:null}</div><div className="route-panel"><div className="route-panel-title"><PieChart size={18}/><h3>Target allocations</h3></div>{(allocations??[]).map((a:any)=><article className="route-list-row" key={a.id}><div><strong>{a.asset_key}</strong><span>Target allocation</span></div><b>{a.target_pct}%</b></article>)}{!allocations?.length?<div className="route-empty"><PieChart size={24}/><strong>No allocation targets</strong><span>Nothing is fabricated.</span></div>:null}</div></section>
  </TradingAppShell>;
}