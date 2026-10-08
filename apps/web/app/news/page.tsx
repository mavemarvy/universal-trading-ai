import { Newspaper, Radar } from "lucide-react";
import { LiveNewsFeed } from "@/components/live-news-feed";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";

export default async function NewsPage() {
  const { supabase, displayName, notificationCount } = await requireUser();

  const [{ count: storedNews }, { count: economicEvents }] = await Promise.all([
    supabase.from("news_events").select("id", { count: "exact", head: true }),
    supabase.from("economic_events").select("id", { count: "exact", head: true }),
  ]);

  return (
    <TradingAppShell
      active="news"
      title="News & Macro"
      subtitle="Live coverage plus evidence storage"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero compact purple-tone">
        <div>
          <span>LIVE INTELLIGENCE</span>
          <h2>See the news before the AI turns it into evidence.</h2>
          <p>
            Current global coverage is shown directly from a public news provider. Stored evidence
            remains separate so UTAI never pretends a headline has been analyzed when it has not.
          </p>
        </div>
        <Newspaper size={34} />
      </section>

      <div className="route-metric-grid">
        <article><span>Stored news evidence</span><strong>{storedNews ?? 0}</strong></article>
        <article><span>Economic events stored</span><strong>{economicEvents ?? 0}</strong></article>
        <article><span>Live source</span><strong>GDELT</strong></article>
      </div>

      <LiveNewsFeed />

      <section className="route-panel news-evidence-note">
        <Radar size={18} />
        <div>
          <strong>Evidence boundary</strong>
          <p>
            Live headlines are informational. A headline only becomes trade evidence after the
            intelligence pipeline scores source quality, relevance, impact and confidence.
          </p>
        </div>
      </section>
    </TradingAppShell>
  );
}
