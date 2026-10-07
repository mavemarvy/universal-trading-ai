"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Database, RadioTower, ScrollText } from "lucide-react";

type Item = { id:string; kind:string; title:string; detail:string; at:string };

function auditItem(row:any): Item {
  return { id:String(row.id), kind:"audit", title:row.action ?? "Audit event", detail:`${row.table_name ?? "system"} · ${row.actor_db_role ?? "authenticated"}`, at:row.created_at ?? new Date().toISOString() };
}
function healthItem(kind:string,row:any): Item {
  return { id:String(row.id), kind, title:row.component ?? row.provider_key ?? "Health update", detail:row.status ?? "UNKNOWN", at:row.checked_at ?? new Date().toISOString() };
}

export function AdminLiveActivity() {
  const supabase = useMemo(()=>createClient(),[]);
  const [items,setItems]=useState<Item[]>([]);
  const [connected,setConnected]=useState(false);

  useEffect(()=>{
    let mounted=true;
    async function load(){
      const [audit,system,providers]=await Promise.all([
        supabase.from("audit_logs").select("id,action,table_name,actor_db_role,created_at").order("created_at",{ascending:false}).limit(8),
        supabase.from("system_health").select("id,component,status,checked_at").order("checked_at",{ascending:false}).limit(6),
        supabase.from("provider_health").select("id,provider_key,status,checked_at").order("checked_at",{ascending:false}).limit(6),
      ]);
      const merged=[
        ...(audit.data??[]).map(auditItem),
        ...(system.data??[]).map((x)=>healthItem("system",x)),
        ...(providers.data??[]).map((x)=>healthItem("provider",x)),
      ].sort((a,b)=>+new Date(b.at)-+new Date(a.at)).slice(0,14);
      if(mounted)setItems(merged);
    }
    load();

    const push=(item:Item)=>setItems((current)=>[item,...current.filter((x)=>x.id!==item.id)].slice(0,14));
    const channel=supabase.channel("admin-control-plane-activity")
      .on("postgres_changes",{event:"*",schema:"public",table:"audit_logs"},(p:any)=>push(auditItem(p.new??p.old)))
      .on("postgres_changes",{event:"*",schema:"public",table:"system_health"},(p:any)=>push(healthItem("system",p.new??p.old)))
      .on("postgres_changes",{event:"*",schema:"public",table:"provider_health"},(p:any)=>push(healthItem("provider",p.new??p.old)))
      .subscribe((status)=>setConnected(status==="SUBSCRIBED"));

    return()=>{mounted=false;supabase.removeChannel(channel);};
  },[supabase]);

  return (
    <section className="panel span-12 admin-live-panel">
      <div className="panel-head">
        <div><span className="section-kicker">REALTIME OPERATIONS</span><h3>Control-plane activity</h3></div>
        <span className={connected ? "realtime-state online" : "realtime-state"}><i/>{connected ? "REALTIME" : "CONNECTING"}</span>
      </div>
      <div className="admin-live-list">
        {items.length ? items.map((item)=>(
          <article key={item.id}>
            <span className="admin-live-icon">{item.kind==="audit"?<ScrollText size={14}/>:item.kind==="provider"?<RadioTower size={14}/>:<Database size={14}/>}</span>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <time>{new Date(item.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time>
          </article>
        )):<div className="live-empty"><Activity size={22}/><strong>No new privileged activity</strong><span>This is a real Supabase Realtime stream; audit and health changes appear immediately.</span></div>}
      </div>
    </section>
  );
}
