import { ExternalLink, Globe2, Newspaper, Radar, ShieldCheck } from "lucide-react";
import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/auth";
import { fetchAdminLiveNews } from "@/lib/provider-probes";

function displayDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`).toLocaleString();
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Recent";
}

export default async function AdminNewsPage() {
  const { supabase } = await requireAdmin();

  const [live, storedNews, economic, impacts] = await Promise.all([
    fetchAdminLiveNews(15),
    supabase.from("news_events").select("id,source,headline,source_timestamp,importance,sentiment", { count: "exact" }).order("source_timestamp", { ascending: false }).limit(20),
    supabase.from("economic_events").select("id,provider,event_key,country,currency,event_time,importance", { count: "exact" }).order("event_time", { ascending: false }).limit(20),
    supabase.from("news_asset_impacts").select("id", { count: "exact", head: true }),
  ]);

  return (
    <AdminAppShell active="news" title="News & Macro" subtitle="Live source health and evidence ingestion">
      <section className="admin-route-hero purple">
        <div>
          <span>INTELLIGENCE OPERATIONS</span>
          <h2>Separate live coverage from analyzed trading evidence.</h2>
          <p>
            The public news stream can be live while ingestion and AI evidence remain partially
            configured. The control plane makes that distinction visible.
          </p>
        </div>
        <Newspaper size={32} />
      </section>

      <div className="metric-grid">
        <article className="metric-card"><span>Live source</span><strong>{live.ok ? "ONLINE" : "OFFLINE"}</strong></article>
        <article className="metric-card"><span>Stored news evidence</span><strong>{storedNews.count ?? 0}</strong></article>
        <article className="metric-card"><span>Economic events</span><strong>{economic.count ?? 0}</strong></article>
        <article className="metric-card"><span>Asset impact records</span><strong>{impacts.count ?? 0}</strong></article>
      </div>

      <section className="admin-news-provider">
        <div>
          <Globe2 size={18} />
          <div><strong>GDELT public market-news source</strong><span>Checked {new Date(live.fetchedAt).toLocaleString()}</span></div>
        </div>
        <b className={live.ok ? "ok" : "bad"}>{live.ok ? "LIVE" : "UNAVAILABLE"} · {live.latencyMs} ms</b>
      </section>

      <section className="admin-news-grid">
        {live.articles.map((article: any, index: number) => (
          <a href={article.url} target="_blank" rel="noreferrer" key={article.url + index}>
            <div>
              <span>{article.source}</span>
              <small>{displayDate(article.publishedAt)}</small>
            </div>
            <strong>{article.title}</strong>
            <footer><span>{article.sourceCountry || "Global"}</span><ExternalLink size={13} /></footer>
          </a>
        ))}

        {!live.articles.length ? (
          <div className="route-empty">
            <Newspaper size={24} />
            <strong>No live articles returned</strong>
            <span>The admin does not fabricate provider output.</span>
          </div>
        ) : null}
      </section>

      <section className="route-split admin-route-split">
        <div className="panel">
          <div className="panel-head">
            <div><span className="section-kicker">STORED EVIDENCE</span><h3>Latest ingested news</h3></div>
            <ShieldCheck size={20} />
          </div>
          {(storedNews.data ?? []).map((item: any) => (
            <article className="admin-route-list-row" key={item.id}>
              <div>
                <strong>{item.headline}</strong>
                <span>{item.source} · {new Date(item.source_timestamp).toLocaleString()}</span>
              </div>
              <b>{item.importance ?? "—"}</b>
            </article>
          ))}
          {!storedNews.data?.length ? (
            <div className="route-empty">
              <Radar size={24} />
              <strong>No analyzed news evidence yet</strong>
              <span>The live feed above is not silently mislabeled as AI-scored evidence.</span>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><span className="section-kicker">MACRO CALENDAR</span><h3>Stored economic events</h3></div>
            <Radar size={20} />
          </div>
          {(economic.data ?? []).map((item: any) => (
            <article className="admin-route-list-row" key={item.id}>
              <div>
                <strong>{item.event_key}</strong>
                <span>{item.currency || item.country || item.provider} · {new Date(item.event_time).toLocaleString()}</span>
              </div>
              <b>{item.importance || "—"}</b>
            </article>
          ))}
          {!economic.data?.length ? (
            <div className="route-empty">
              <Radar size={24} />
              <strong>No economic-calendar ingestion yet</strong>
              <span>A provider worker is still required for persistent macro ingestion.</span>
            </div>
          ) : null}
        </div>
      </section>
    </AdminAppShell>
  );
}
