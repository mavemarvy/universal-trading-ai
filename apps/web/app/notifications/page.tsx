import { Bell } from "lucide-react";
import { LiveActivity } from "@/components/live-activity";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function NotificationsPage(){
  const {supabase,userId,displayName,notificationCount}=await requireUser();
  const {data:notifications}=await supabase.from("notifications").select("id,category,title,body,read_at,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(50);
  return <TradingAppShell active="profile" title="Notifications" subtitle="Account and system messages" displayName={displayName} notificationCount={notificationCount}>
    <section className="route-panel notification-route"><div className="route-panel-title"><Bell size={18}/><h3>Notification history</h3></div>{(notifications??[]).map((n:any)=><article className={n.read_at?"notification-row":"notification-row unread"} key={n.id}><span/><div><strong>{n.title}</strong><small>{n.body||n.category}</small></div><time>{new Date(n.created_at).toLocaleString()}</time></article>)}{!notifications?.length?<div className="route-empty"><Bell size={24}/><strong>No notifications yet</strong><span>New real notifications will appear through Supabase Realtime.</span></div>:null}</section>
    <LiveActivity userId={userId}/>
  </TradingAppShell>;
}