"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Bell, CircleDot, TrendingUp } from "lucide-react";

type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  at: string;
};

function normalize(kind: string, row: Record<string, any>): ActivityItem {
  const id = String(row.id ?? crypto.randomUUID());
  if (kind === "notification") return { id, kind, title: row.title ?? "Notification", detail: row.body ?? row.category ?? "", at: row.created_at ?? new Date().toISOString() };
  if (kind === "trade") return { id, kind, title: row.event_type ?? "Trade event", detail: row.payload?.message ?? "Trading activity updated", at: row.event_at ?? new Date().toISOString() };
  if (kind === "order") return { id, kind, title: `${row.instrument_key ?? "Order"} · ${row.status ?? "updated"}`, detail: `${row.side ?? ""} ${row.quantity ?? ""}`.trim(), at: row.updated_at ?? row.created_at ?? new Date().toISOString() };
  return { id, kind, title: `${row.instrument_key ?? "Position"} · ${row.status ?? "updated"}`, detail: `${row.side ?? ""} ${row.quantity ?? ""}`.trim(), at: row.opened_at ?? new Date().toISOString() };
}

export function LiveActivity({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [notifications, events, orders, positions] = await Promise.all([
        supabase.from("notifications").select("id,title,body,category,created_at").eq("user_id", userId).order("created_at",{ascending:false}).limit(5),
        supabase.from("trade_events").select("id,event_type,payload,event_at").eq("user_id", userId).order("event_at",{ascending:false}).limit(5),
        supabase.from("orders").select("id,instrument_key,status,side,quantity,created_at,updated_at").eq("user_id", userId).order("updated_at",{ascending:false}).limit(5),
        supabase.from("positions").select("id,instrument_key,status,side,quantity,opened_at").eq("user_id", userId).order("opened_at",{ascending:false}).limit(5),
      ]);
      const merged = [
        ...(notifications.data ?? []).map((x) => normalize("notification", x)),
        ...(events.data ?? []).map((x) => normalize("trade", x)),
        ...(orders.data ?? []).map((x) => normalize("order", x)),
        ...(positions.data ?? []).map((x) => normalize("position", x)),
      ].sort((a,b) => +new Date(b.at) - +new Date(a.at)).slice(0,12);
      if (mounted) setItems(merged);
    }
    load();

    const add = (kind: string) => (payload: any) => {
      const row = payload.new ?? payload.old ?? {};
      setItems((current) => [normalize(kind,row), ...current.filter((x)=>x.id !== String(row.id))].slice(0,12));
    };

    const channel = supabase.channel(`user-activity-${userId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${userId}`},add("notification"))
      .on("postgres_changes",{event:"*",schema:"public",table:"trade_events",filter:`user_id=eq.${userId}`},add("trade"))
      .on("postgres_changes",{event:"*",schema:"public",table:"orders",filter:`user_id=eq.${userId}`},add("order"))
      .on("postgres_changes",{event:"*",schema:"public",table:"positions",filter:`user_id=eq.${userId}`},add("position"))
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase,userId]);

  return (
    <section className="live-activity-card">
      <div className="live-activity-head">
        <div><span className="eyebrow-label">LIVE ACTIVITY</span><h3>Account stream</h3></div>
        <span className={connected ? "realtime-state online" : "realtime-state"}><i /> {connected ? "REALTIME" : "CONNECTING"}</span>
      </div>
      <div className="live-activity-list">
        {items.length ? items.map((item) => (
          <article key={item.id}>
            <span className="activity-icon">{item.kind === "notification" ? <Bell size={14}/> : item.kind === "position" ? <TrendingUp size={14}/> : <CircleDot size={14}/>}</span>
            <div><strong>{item.title}</strong><small>{item.detail || "Activity recorded"}</small></div>
            <time>{new Date(item.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time>
          </article>
        )) : (
          <div className="live-empty"><Activity size={22}/><strong>No account activity yet</strong><span>This is a real feed. New notifications, orders, positions and trade events will appear here instantly.</span></div>
        )}
      </div>
    </section>
  );
}
