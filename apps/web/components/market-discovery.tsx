"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Flame, RefreshCw, Search, Star, TrendingDown, TrendingUp, Zap } from "lucide-react";

type MarketRow = {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  volume24hUsd: number;
  venueType: "CEX" | "DEX";
  source: string;
  chain?: string | null;
  liquidityUsd?: number | null;
  marketCap?: number | null;
  pairCreatedAt?: number | null;
  tokenAddress?: string | null;
  icon?: string | null;
  venues?: string[];
};

const tabs = [
  ["trending", "Trending", Flame],
  ["gainers", "Gainers", TrendingUp],
  ["losers", "Losers", TrendingDown],
  ["memes", "Memes", Zap],
  ["new", "New", Star],
] as const;

function money(value: number, compact = false) {
  if (!Number.isFinite(value)) return "—";
  if (compact) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  }
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 8;
  return "$" + value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function MarketDiscovery() {
  const [tab, setTab] = useState("trending");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState("");
  const [providers, setProviders] = useState({ cexA: false, cexB: false, dex: false });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("utai.marketFavorites") ?? "[]");
      setFavorites(new Set(Array.isArray(stored) ? stored : []));
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab, limit: "60" });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch("/api/markets/discovery?" + params.toString(), { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.ok) {
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setProviders(data.providerState ?? { cexA: false, cexB: false, dex: false });
        setFetchedAt(data.fetchedAt ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => {
    const timer = window.setTimeout(load, query ? 280 : 0);
    const interval = window.setInterval(load, 45000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load, query]);

  const sourceCount = useMemo(
    () => [providers.cexA, providers.cexB, providers.dex].filter(Boolean).length,
    [providers]
  );

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("utai.marketFavorites", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <section className="market-discovery-shell">
      <header className="market-discovery-head">
        <div>
          <span className="eyebrow-label">UNIFIED MARKETPLACE</span>
          <h2>Real exchange & DEX markets</h2>
          <p>{sourceCount}/3 public market sources online · {fetchedAt ? "auto-refreshing" : "connecting"}</p>
        </div>
        <button type="button" onClick={load} aria-label="Refresh markets">
          <RefreshCw size={15} className={loading ? "spin-icon" : ""}/>
        </button>
      </header>

      <div className="market-search-box">
        <Search size={18}/>
        <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search tokens, symbols, chains…"/>
      </div>

      <nav className="market-tab-row">
        {tabs.map(([key,label,Icon])=>(
          <button type="button" key={key} onClick={()=>setTab(key)} className={tab===key?"active":""}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </nav>

      <div className="market-list-head">
        <span>Market</span><span>Price</span><span>24h</span><span>Volume / Liquidity</span><span/>
      </div>

      <div className="market-live-list">
        {rows.map((row)=>(
          <article key={row.id}>
            <button className={favorites.has(row.id)?"market-favorite active":"market-favorite"} onClick={()=>toggleFavorite(row.id)} aria-label="Toggle favorite">
              <Star size={16}/>
            </button>

            <div className="market-token-cell">
              <span className="market-token-icon">
                {row.icon ? <img src={row.icon} alt="" /> : row.base.slice(0,2)}
              </span>
              <div>
                <strong>{row.base}<small>/{row.quote}</small></strong>
                <span>{row.venueType==="DEX" ? `${row.chain ?? "DEX"} · DEX` : `${row.venues?.length ?? 1} venue${(row.venues?.length ?? 1)>1?"s":""}`}</span>
              </div>
            </div>

            <b className="market-price">{money(row.price)}</b>
            <b className={row.change24h>=0?"market-change up":"market-change down"}>
              {row.change24h>=0?"+":""}{row.change24h.toFixed(2)}%
            </b>
            <div className="market-volume">
              <strong>{money(row.venueType==="DEX" ? (row.liquidityUsd ?? 0) : row.volume24hUsd, true)}</strong>
              <small>{row.venueType==="DEX"?"LIQUIDITY":"24H VOLUME"}</small>
            </div>

            {row.venueType==="CEX" ? (
              <Link href={"/trade?symbol="+encodeURIComponent(row.base+"USDT")} aria-label={"Open "+row.symbol}>
                <ArrowUpRight size={16}/>
              </Link>
            ) : (
              <span className="dex-market-badge">{row.chain?.toUpperCase() ?? "DEX"}</span>
            )}
          </article>
        ))}

        {!loading && !rows.length ? (
          <div className="route-empty"><Search size={24}/><strong>No live markets matched</strong><span>Try another symbol or market tab.</span></div>
        ) : null}
      </div>
    </section>
  );
}
