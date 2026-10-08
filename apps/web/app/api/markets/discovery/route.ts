import { NextRequest, NextResponse } from "next/server";

type MarketRow = {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  volume24hUsd: number;
  high24h?: number | null;
  low24h?: number | null;
  venueType: "CEX" | "DEX";
  source: string;
  chain?: string | null;
  liquidityUsd?: number | null;
  marketCap?: number | null;
  pairCreatedAt?: number | null;
  tokenAddress?: string | null;
  icon?: string | null;
  boosted?: boolean;
  venues?: string[];
};

async function json(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 30 },
    headers: {
      Accept: "application/json",
      "User-Agent": "UniversalTradingAI/1.0 unified-market-feed",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function finite(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isLeveraged(base: string) {
  return /(UP|DOWN|BULL|BEAR)$/i.test(base);
}

async function loadOkx(): Promise<MarketRow[]> {
  const payload = await json("https://www.okx.com/api/v5/market/tickers?instType=SPOT");
  const list = Array.isArray(payload?.data) ? payload.data : [];
  return list.flatMap((row: any) => {
    const [base, quote] = String(row.instId ?? "").split("-");
    if (!base || !["USDT", "USDC", "USD"].includes(quote) || isLeveraged(base)) return [];
    const price = finite(row.last);
    if (!(price > 0)) return [];
    return [{
      id: `okx:${row.instId}`,
      symbol: `${base}/${quote}`,
      base,
      quote,
      price,
      change24h: row.open24h ? ((price - finite(row.open24h)) / Math.max(finite(row.open24h), Number.EPSILON)) * 100 : 0,
      volume24hUsd: finite(row.volCcy24h),
      high24h: finite(row.high24h, NaN),
      low24h: finite(row.low24h, NaN),
      venueType: "CEX" as const,
      source: "CEX-A",
      venues: ["CEX-A"],
    }];
  });
}

async function loadBinance(): Promise<MarketRow[]> {
  const payload = await json("https://api.binance.com/api/v3/ticker/24hr");
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((row: any) => {
    const raw = String(row.symbol ?? "");
    const quote = ["USDT", "USDC"].find((q) => raw.endsWith(q));
    if (!quote) return [];
    const base = raw.slice(0, -quote.length);
    if (!base || isLeveraged(base)) return [];
    const price = finite(row.lastPrice);
    if (!(price > 0)) return [];
    return [{
      id: `binance:${raw}`,
      symbol: `${base}/${quote}`,
      base,
      quote,
      price,
      change24h: finite(row.priceChangePercent),
      volume24hUsd: finite(row.quoteVolume),
      high24h: finite(row.highPrice, NaN),
      low24h: finite(row.lowPrice, NaN),
      venueType: "CEX" as const,
      source: "CEX-B",
      venues: ["CEX-B"],
    }];
  });
}

async function loadDexBoosts(mode: "top" | "latest"): Promise<MarketRow[]> {
  const boosts = await json(
    `https://api.dexscreener.com/token-boosts/${mode}/v1`
  );
  const list = Array.isArray(boosts) ? boosts.slice(0, 12) : [];
  const results = await Promise.allSettled(
    list.map(async (boost: any) => {
      const chain = String(boost.chainId ?? "");
      const address = String(boost.tokenAddress ?? "");
      if (!chain || !address) return null;
      const pairs = await json(
        `https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`
      );
      const pairList = Array.isArray(pairs) ? pairs : [];
      const best = pairList
        .filter((pair: any) => finite(pair?.liquidity?.usd) > 0)
        .sort((a: any, b: any) => finite(b?.liquidity?.usd) - finite(a?.liquidity?.usd))[0];
      if (!best?.baseToken?.symbol || !best?.quoteToken?.symbol) return null;
      const price = finite(best.priceUsd);
      if (!(price > 0)) return null;
      return {
        id: `dex:${chain}:${best.pairAddress}`,
        symbol: `${best.baseToken.symbol}/${best.quoteToken.symbol}`,
        base: String(best.baseToken.symbol),
        quote: String(best.quoteToken.symbol),
        price,
        change24h: finite(best?.priceChange?.h24),
        volume24hUsd: finite(best?.volume?.h24),
        venueType: "DEX" as const,
        source: "DEX",
        chain,
        liquidityUsd: finite(best?.liquidity?.usd),
        marketCap: finite(best?.marketCap || best?.fdv),
        pairCreatedAt: finite(best?.pairCreatedAt),
        tokenAddress: address,
        icon: String(boost.icon ?? best?.info?.imageUrl ?? ""),
        boosted: true,
        venues: [String(best.dexId ?? "DEX")],
      } satisfies MarketRow;
    })
  );
  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : []
  );
}

function mergeCex(rows: MarketRow[]) {
  const map = new Map<string, MarketRow>();
  for (const row of rows) {
    const key = `${row.base}:${row.quote}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const best = row.volume24hUsd > existing.volume24hUsd ? row : existing;
    best.venues = Array.from(new Set([...(existing.venues ?? []), ...(row.venues ?? [])]));
    map.set(key, best);
  }
  return [...map.values()];
}

export async function GET(request: NextRequest) {
  const tab = (request.nextUrl.searchParams.get("tab") ?? "trending").toLowerCase();
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toUpperCase();
  const limit = Math.max(5, Math.min(100, Number(request.nextUrl.searchParams.get("limit") ?? 50)));

  const started = Date.now();
  const [okx, binance, dexTop, dexLatest] = await Promise.allSettled([
    loadOkx(),
    loadBinance(),
    loadDexBoosts("top"),
    loadDexBoosts("latest"),
  ]);

  const providerState = {
    cexA: okx.status === "fulfilled",
    cexB: binance.status === "fulfilled",
    dex: dexTop.status === "fulfilled" || dexLatest.status === "fulfilled",
  };

  const cex = mergeCex([
    ...(okx.status === "fulfilled" ? okx.value : []),
    ...(binance.status === "fulfilled" ? binance.value : []),
  ]);
  const topDex = dexTop.status === "fulfilled" ? dexTop.value : [];
  const latestDex = dexLatest.status === "fulfilled" ? dexLatest.value : [];

  let rows: MarketRow[];
  if (tab === "memes") {
    rows = topDex.sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
  } else if (tab === "new") {
    rows = latestDex.sort((a, b) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0));
  } else if (tab === "gainers") {
    rows = cex.filter((row) => row.volume24hUsd > 100_000).sort((a, b) => b.change24h - a.change24h);
  } else if (tab === "losers") {
    rows = cex.filter((row) => row.volume24hUsd > 100_000).sort((a, b) => a.change24h - b.change24h);
  } else {
    rows = cex.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
  }

  if (q) {
    rows = rows.filter((row) =>
      row.symbol.toUpperCase().includes(q) ||
      row.base.toUpperCase().includes(q) ||
      row.quote.toUpperCase().includes(q) ||
      String(row.chain ?? "").toUpperCase().includes(q)
    );
  }

  return NextResponse.json({
    ok: true,
    tab,
    fetchedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    providerState,
    rows: rows.slice(0, limit),
  });
}
