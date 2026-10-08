"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, ExternalLink, Globe2, Newspaper, RefreshCw, Wifi, WifiOff } from "lucide-react";

type Article = {
  title: string;
  url: string;
  image: string;
  source: string;
  publishedAt: string;
  language: string;
  sourceCountry: string;
};

const topics = [
  ["all", "All"],
  ["crypto", "Crypto"],
  ["macro", "Macro"],
  ["forex", "Forex"],
  ["stocks", "Stocks"],
] as const;

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "recent";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LiveNewsFeed() {
  const [topic, setTopic] = useState("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [provider, setProvider] = useState("GDELT DOC 2.0");
  const [fetchedAt, setFetchedAt] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/news/live?topic=" + encodeURIComponent(topic), {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || data?.ok !== true) throw new Error("provider unavailable");
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setProvider(data.provider ?? "GDELT");
      setFetchedAt(data.fetchedAt ?? "");
      setLatencyMs(typeof data.latencyMs === "number" ? data.latencyMs : null);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 90000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <section className="live-news-shell">
      <header className="live-news-head">
        <div>
          <span className="eyebrow-label">LIVE NEWS</span>
          <h2>Market intelligence stream</h2>
        </div>
        <div className="news-live-tools">
          <span className={online ? "market-connection live" : "market-connection"}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? "LIVE" : "OFFLINE"}
          </span>
          <button type="button" onClick={load} aria-label="Refresh live news">
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
          </button>
        </div>
      </header>

      <nav className="news-topic-tabs">
        {topics.map(([key, label]) => (
          <button
            type="button"
            className={topic === key ? "active" : ""}
            onClick={() => setTopic(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="news-provider-bar">
        <span><Globe2 size={13} /> {provider}</span>
        <span>{latencyMs == null ? "—" : `${latencyMs} ms`}</span>
        <span>{fetchedAt ? `Updated ${relativeTime(fetchedAt)}` : "Waiting for provider"}</span>
      </div>

      <div className="live-news-grid">
        {articles.map((article, index) => (
          <a
            className={index === 0 ? "live-news-card lead" : "live-news-card"}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            key={article.url + index}
          >
            {article.image ? (
              <div
                className="news-image"
                style={{ backgroundImage: `url("${article.image.replaceAll('"', "%22")}")` }}
                aria-hidden="true"
              />
            ) : (
              <div className="news-image placeholder"><Newspaper size={24} /></div>
            )}

            <div className="news-card-body">
              <div className="news-source-line">
                <span>{article.source}</span>
                <span><Clock3 size={11} /> {relativeTime(article.publishedAt)}</span>
              </div>
              <strong>{article.title}</strong>
              <div className="news-card-foot">
                <span>{article.sourceCountry || article.language || "Global"}</span>
                <ExternalLink size={13} />
              </div>
            </div>
          </a>
        ))}

        {!articles.length && !loading ? (
          <div className="route-empty">
            <Newspaper size={24} />
            <strong>No articles returned right now</strong>
            <span>The page does not fabricate headlines when the public provider has no result.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
