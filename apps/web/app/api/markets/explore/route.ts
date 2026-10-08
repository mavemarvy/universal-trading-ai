import { NextRequest, NextResponse } from "next/server";

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

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitSymbol(symbol: string) {
  const knownQuotes = ["USDT", "USDC", "BTC", "ETH", "DAI", "EUR"];
  const quote = knownQuotes.find((item) => symbol.endsWith(item)) ?? "";
  return { base: quote ? symbol.slice(0, -quote.length) : symbol, quote };
}

async function fetchJson(url: string, timeout = 7000) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
    headers: { "User-Agent": "UniversalTradingAI/1.0 market-discovery" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function bybitAssets() {
  const [tickersPayload, instrumentsPayload] = await Promise.all([
    fetchJson("https://api.bybit.com/v5/market/tickers?category=spot"),
    fetchJson("https://api.bybit.com/v5/market/instruments-info?category=spot"),
  ]);

  const launches = new Map<string, number | null>();
  for (const row of instrumentsPayload?.result?.list ?? []) {
    launches.set(String(row.symbol ?? ""), n(row.launchTime));
  }

  const assets: CexAsset[] = [];
  for (const row of tickersPayload?.result?.list ?? []) {
    const symbol = String(row.symbol ?? "");
    if (!symbol.endsWith("USDT")) continue;
    const { base, quote } = splitSymbol(symbol);
    assets.push({
      kind: "CEX",
      symbol,
      base,
      quote,
      price: n(row.lastPrice),
      change24h: n(row.price24hPcnt) == null ? null : Number(row.price24hPcnt) * 100,
      turnover24h: n(row.turnover24h),
      volume24h: n(row.volume24h),
      launchTime: launches.get(symbol) ?? null,
      venues: [{
        venue: "BYBIT",
        price: n(row.lastPrice),
        change24h: n(row.price24hPcnt) == null ? null : Number(row.price24hPcnt) * 100,
        volume24h: n(row.volume24h),
      }],
    });
  }
  return assets;
}

async function binanceQuotes() {
  const payload = await fetchJson("https://api.binance.com/api/v3/ticker/24hr");
  const map = new Map<string, VenueQuote>();
  if (!Array.isArray(payload)) return map;
  for (const row of payload) {
    const symbol = String(row.symbol ?? "");
    if (!symbol.endsWith("USDT")) continue;
    map.set(symbol, {
      venue: "BINANCE",
      price: n(row.lastPrice),
      change24h: n(row.priceChangePercent),
      volume24h: n(row.volume),
    });
  }
  return map;
}

async function okxQuotes() {
  const payload = await fetchJson("https://www.okx.com/api/v5/market/tickers?instType=SPOT");
  const map = new Map<string, VenueQuote>();
  for (const row of payload?.data ?? []) {
    const instId = String(row.instId ?? "");
    if (!instId.endsWith("-USDT")) continue;
    const symbol = instId.replaceAll("-", "");
    const last = n(row.last);
    const open = n(row.open24h);
    map.set(symbol, {
      venue: "OKX",
      price: last,
      change24h: last != null && open != null && open !== 0 ? ((last - open) / open) * 100 : null,
      volume24h: n(row.vol24h),
    });
  }
  return map;
}

async function dexBoosted() {
  const boosts = await fetchJson("https://api.dexscreener.com/token-boosts/top/v1");
  const items = Array.isArray(boosts) ? boosts.slice(0, 18) : [];
  const grouped = new Map<string, string[]>();

  for (const item of items) {
    const chain = String(item.chainId ?? "");
    const address = String(item.tokenAddress ?? "");
    if (!chain || !address) continue;
    const bucket = grouped.get(chain) ?? [];
    if (!bucket.includes(address)) bucket.push(address);
    grouped.set(chain, bucket);
  }

  const pairs: any[] = [];
  await Promise.all([...grouped.entries()].map(async ([chain, addresses]) => {
    try {
      const payload = await fetchJson(
        `https://api.dexscreener.com/tokens/v1/${encodeURIComponent(chain)}/${addresses.slice(0, 30).map(encodeURIComponent).join(",")}`,
      );
      if (Array.isArray(payload)) pairs.push(...payload);
    } catch {
      // One DEX chain failing must not take down the whole market explorer.
    }
  }));

  const best = new Map<string, any>();
  for (const pair of pairs) {
    const address = String(pair?.baseToken?.address ?? "");
    if (!address) continue;
    const current = best.get(address);
    if (!current || Number(pair?.liquidity?.usd ?? 0) > Number(current?.liquidity?.usd ?? 0)) {
      best.set(address, pair);
    }
  }

  const boostIndex = new Map(
    items.map((item: any) => [String(item.tokenAddress ?? ""), item]),
  );

  const result: DexAsset[] = [];
  for (const [address, pair] of best) {
    const boost: any = boostIndex.get(address);
    result.push({
      kind: "DEX",
      symbol: String(pair?.baseToken?.symbol ?? "TOKEN"),
      name: String(pair?.baseToken?.name ?? "Unknown token"),
      chain: String(pair?.chainId ?? boost?.chainId ?? ""),
      dex: String(pair?.dexId ?? ""),
      price: n(pair?.priceUsd),
      change24h: n(pair?.priceChange?.h24),
      volume24h: n(pair?.volume?.h24),
      marketCap: n(pair?.marketCap ?? pair?.fdv),
      liquidity: n(pair?.liquidity?.usd),
      image: String(pair?.info?.imageUrl ?? boost?.icon ?? "") || null,
      pairAddress: String(pair?.pairAddress ?? ""),
      tokenAddress: address,
      url: String(pair?.url ?? boost?.url ?? ""),
    });
  }

  return result
    .sort((a, b) => Number(b.volume24h ?? 0) - Number(a.volume24h ?? 0))
    .slice(0, 18);
}

async function dexSearch(query: string) {
  if (query.trim().length < 2) return [] as DexAsset[];
  try {
    const payload = await fetchJson(
      "https://api.dexscreener.com/latest/dex/search?q=" + encodeURIComponent(query.trim()),
    );
    const pairs = Array.isArray(payload?.pairs) ? payload.pairs.slice(0, 24) : [];
    return pairs.map((pair: any): DexAsset => ({
      kind: "DEX",
      symbol: String(pair?.baseToken?.symbol ?? "TOKEN"),
      name: String(pair?.baseToken?.name ?? "Unknown token"),
      chain: String(pair?.chainId ?? ""),
      dex: String(pair?.dexId ?? ""),
      price: n(pair?.priceUsd),
      change24h: n(pair?.priceChange?.h24),
      volume24h: n(pair?.volume?.h24),
      marketCap: n(pair?.marketCap ?? pair?.fdv),
      liquidity: n(pair?.liquidity?.usd),
      image: String(pair?.info?.imageUrl ?? "") || null,
      pairAddress: String(pair?.pairAddress ?? ""),
      tokenAddress: String(pair?.baseToken?.address ?? ""),
      url: String(pair?.url ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const started = Date.now();

  const [bybitResult, binanceResult, okxResult, dexResult, dexSearchResult] = await Promise.allSettled([
    bybitAssets(),
    binanceQuotes(),
    okxQuotes(),
    dexBoosted(),
    dexSearch(q),
  ]);

  const cex = bybitResult.status === "fulfilled" ? bybitResult.value : [];
  const binance = binanceResult.status === "fulfilled" ? binanceResult.value : new Map<string, VenueQuote>();
  const okx = okxResult.status === "fulfilled" ? okxResult.value : new Map<string, VenueQuote>();

  for (const asset of cex) {
    const b = binance.get(asset.symbol);
    const o = okx.get(asset.symbol);
    if (b) asset.venues.push(b);
    if (o) asset.venues.push(o);
  }

  const filtered = q
    ? cex.filter((asset) =>
        asset.symbol.toLowerCase().includes(q.toLowerCase()) ||
        asset.base.toLowerCase().includes(q.toLowerCase())
      )
    : cex;

  const trending = [...filtered]
    .sort((a, b) => Number(b.turnover24h ?? 0) - Number(a.turnover24h ?? 0))
    .slice(0, 40);

  const gainers = [...filtered]
    .filter((asset) => asset.change24h != null)
    .sort((a, b) => Number(b.change24h ?? 0) - Number(a.change24h ?? 0))
    .slice(0, 40);

  const newest = [...filtered]
    .filter((asset) => asset.launchTime != null)
    .sort((a, b) => Number(b.launchTime ?? 0) - Number(a.launchTime ?? 0))
    .slice(0, 40);

  return NextResponse.json({
    ok: true,
    query: q,
    fetchedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    providers: {
      bybit: bybitResult.status === "fulfilled",
      binance: binanceResult.status === "fulfilled",
      okx: okxResult.status === "fulfilled",
      dexscreener: dexResult.status === "fulfilled",
    },
    trending,
    gainers,
    newListings: newest,
    memes: dexResult.status === "fulfilled" ? dexResult.value : [],
    searchDex: dexSearchResult.status === "fulfilled" ? dexSearchResult.value : [],
  });
}
