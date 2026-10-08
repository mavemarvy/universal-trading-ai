"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  Flame,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";

type VenueQuote = {
  venue: "BYBIT" | "BINANCE" | "OKX";
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
};

type CexAsset = {
  kind: "CEX";
  symbol: string;
  base: string;
  quote: string;
  price: number | null;
  change24h: number | null;
  turnover24h: number | null;
  volume24h: number | null;
  launchTime: number | null;
  venues: VenueQuote[];
};

type DexAsset = {
  kind: "DEX";
  symbol: string;
  name: string;
  chain: string;
  dex: string;
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  liquidity: number | null;
  image: string | null;
  pairAddress: string;
  tokenAddress: string;
  url: string;
};

type ExplorerPayload = {
  ok: boolean;
  query: string;
  fetchedAt: string;
  latencyMs: number;
  providers: Record<string, boolean>;
  trending: CexAsset[];
  gainers: CexAsset[];
  newListings: CexAsset[];
  memes: DexAsset[];
  searchDex: DexAsset[];
};

type Tab = "trending" | "gainers" | "new" | "memes" | "watchlist";

const tabs: Array<[Tab, string]> = [
  ["trending", "Trending"],
  ["gainers", "Top Gainers"],
  ["new", "New"],
  ["memes", "Memes"],
  ["watchlist", "Watchlist"],
];

function compact(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function price(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1000) return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (value >= 0.01) return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function change(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tokenKey(asset: CexAsset | DexAsset) {
  if (asset.kind === "CEX") return "cex:" + asset.symbol;
  return `dex:${asset.chain}:${asset.tokenAddress}`;
}

function fallbackLogo(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export function MarketExplorer() {
  const [tab, setTab] = useState<Tab>("trending");
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<ExplorerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("utai:watchlist");
      const parsed = raw ? JSON.parse(raw) : [];
      setWatchlist(Array.isArray(parsed) ? parsed : []);
    } catch {
      setWatchlist([]);
    }
  }, []);

  const toggleWatch = useCallback((key: string) => {
    setWatchlist((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      try {
        localStorage.setItem("utai:watchlist", JSON.stringify(next));
      } catch {
        // Local watchlist storage is optional.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          "/api/markets/explore" + (query.trim() ? "?q=" + encodeURIComponent(query.trim()) : ""),
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok || data?.ok !== true) throw new Error("Market providers unavailable");
        setPayload(data);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Market providers could not be reached.");
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const rows = useMemo(() => {
    if (!payload) return [] as Array<CexAsset | DexAsset>;

    let source: Array<CexAsset | DexAsset>;
    if (query.trim()) {
      source = [...payload.trending, ...payload.searchDex];
    } else if (tab === "gainers") {
      source = payload.gainers;
    } else if (tab === "new") {
      source = payload.newListings;
    } else if (tab === "memes") {
      source = payload.memes;
    } else if (tab === "watchlist") {
      source = [...payload.trending, ...payload.gainers, ...payload.newListings, ...payload.memes]
        .filter((asset, index, all) => all.findIndex((other) => tokenKey(other) === tokenKey(asset)) === index)
        .filter((asset) => watchlist.includes(tokenKey(asset)));
    } else {
      source = payload.trending;
    }

    return source.slice(0, 60);
  }, [payload, query, tab, watchlist]);

  const providersOnline = payload
    ? Object.values(payload.providers).filter(Boolean).length
    : 0;

  return (
    <section className="market-explorer">
      <div className="market-explorer-search">
        <Search size={22} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tokens, symbols, DEX pairs or addresses..."
          aria-label="Search live markets"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>
        ) : null}
      </div>

      <div className="market-explorer-status">
        <span className={providersOnline ? "live" : ""}>
          {providersOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {providersOnline}/{payload ? Object.keys(payload.providers).length : 4} live sources
        </span>
        <span>{payload ? `${payload.latencyMs} ms aggregate` : "Loading providers"}</span>
      </div>

      {!query ? (
        <nav className="market-explorer-tabs">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {key === "trending" ? <Flame size={14} /> : null}
              {key === "gainers" ? <TrendingUp size={14} /> : null}
              {key === "memes" ? <Sparkles size={14} /> : null}
              {key === "watchlist" ? <Star size={14} /> : null}
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="market-explorer-head">
        <span>Asset</span>
        <span>Price</span>
        <span>24h</span>
        <span>Market / liquidity</span>
        <span />
      </div>

      <div className="market-explorer-list">
        {rows.map((asset) => {
          const key = tokenKey(asset);
          const watched = watchlist.includes(key);
          const isDex = asset.kind === "DEX";
          const displayName = isDex ? asset.name : asset.base;
          const symbol = isDex ? asset.symbol : asset.symbol.replace("USDT", "");
          const pct = asset.change24h;

          return (
            <article className="market-explorer-row" key={key}>
              <div className="market-asset-cell">
                {isDex && asset.image ? (
                  <img src={asset.image} alt="" className="market-token-logo" />
                ) : (
                  <span className={isDex ? "market-token-fallback dex" : "market-token-fallback"}>
                    {fallbackLogo(symbol)}
                  </span>
                )}
                <div>
                  <strong>{displayName}</strong>
                  <span>
                    {symbol}
                    {isDex ? ` · ${asset.chain} · ${asset.dex}` : " / USDT"}
                  </span>
                  {!isDex ? (
                    <div className="market-venue-pills">
                      {asset.venues.map((venue) => (
                        <b key={venue.venue}>{venue.venue}</b>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="market-price-cell">
                <strong>{price(asset.price)}</strong>
                <small>
                  {isDex
                    ? `Vol ${compact(asset.volume24h)}`
                    : `${asset.venues.length} venue${asset.venues.length === 1 ? "" : "s"}`}
                </small>
              </div>

              <div className={Number(pct ?? 0) >= 0 ? "market-change up" : "market-change down"}>
                {change(pct)}
              </div>

              <div className="market-cap-cell">
                {isDex ? (
                  <>
                    <strong>{compact(asset.marketCap)}</strong>
                    <small>Liquidity {compact(asset.liquidity)}</small>
                  </>
                ) : (
                  <>
                    <strong>{compact(asset.turnover24h)}</strong>
                    <small>24h turnover</small>
                  </>
                )}
              </div>

              <div className="market-row-actions">
                <button
                  type="button"
                  className={watched ? "watch-button active" : "watch-button"}
                  onClick={() => toggleWatch(key)}
                  aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Star size={17} fill={watched ? "currentColor" : "none"} />
                </button>

                {isDex ? (
                  <a href={asset.url} target="_blank" rel="noreferrer" className="market-open-button">
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <>
                    <Link href={"/ai?symbol=" + encodeURIComponent(asset.symbol)} className="market-ai-button" aria-label={"Analyze " + asset.symbol + " with AI"}>
                      <Bot size={15} />
                    </Link>
                    <Link href={"/trade?symbol=" + encodeURIComponent(asset.symbol)} className="market-open-button" aria-label={"Trade " + asset.symbol}>
                      <ArrowRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </article>
          );
        })}

        {loading && !rows.length ? (
          <div className="market-explorer-empty">
            <Sparkles size={25} />
            <strong>Loading real market data…</strong>
            <span>Bybit, Binance, OKX and DEX Screener are being queried.</span>
          </div>
        ) : null}

        {!loading && !rows.length ? (
          <div className="market-explorer-empty">
            <Search size={25} />
            <strong>{error || "No matching markets"}</strong>
            <span>Try another symbol, token name or contract address.</span>
          </div>
        ) : null}
      </div>

      <footer className="market-explorer-foot">
        <span>Centralized prices: Bybit / Binance / OKX</span>
        <span>DEX discovery: DEX Screener</span>
        <span>Watchlist stored on this device</span>
      </footer>
    </section>
  );
}
