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
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

async function bybitAssets(): Promise<CexAsset[]> {
  const [tickersResult, instrumentsResult] = await Promise.allSettled([
    fetchJson("https://api.bybit.com/v5/market/tickers?category=spot"),
    fetchJson("https://api.bybit.com/v5/market/instruments-info?category=spot"),
  ]);

  if (tickersResult.status !== "fulfilled") throw tickersResult.reason;

  const launches = new Map<string, number | null>();
  if (instrumentsResult.status === "fulfilled") {
    for (const row of instrumentsResult.value?.result?.list ?? []) {
      launches.set(String(row.symbol ?? ""), n(row.launchTime));
    }
  }

  const assets: CexAsset[] = [];
  for (const row of tickersResult.value?.result?.list ?? []) {
    const symbol = String(row.symbol ?? "");
    if (!symbol.endsWith("USDT")) continue;
    const { base, quote } = splitSymbol(symbol);
    const change = n(row.price24hPcnt);
    assets.push({
      kind: "CEX",
      symbol,
      base,
      quote,
      price: n(row.lastPrice),
      change24h: change == null ? null : change * 100,
      turnover24h: n(row.turnover24h),
      volume24h: n(row.volume24h),
      launchTime: launches.get(symbol) ?? null,
      venues: [{
        venue: "BYBIT",
        price: n(row.lastPrice),
        change24h: change == null ? null : change * 100,
        volume24h: n(row.volume24h),
      }],
    });
  }
  return assets;
}

async function binanceAssets(): Promise<CexAsset[]> {
  const payload = await fetchJson("https://api.binance.com/api/v3/ticker/24hr");
  if (!Array.isArray(payload)) return [];

  const assets: CexAsset[] = [];
  for (const row of payload) {
    const symbol = String(row.symbol ?? "");
    if (!symbol.endsWith("USDT")) continue;
    const { base, quote } = splitSymbol(symbol);
    assets.push({
      kind: "CEX",
      symbol,
      base,
      quote,
      price: n(row.lastPrice),
      change24h: n(row.priceChangePercent),
      turnover24h: n(row.quoteVolume),
      volume24h: n(row.volume),
      launchTime: null,
      venues: [{
        venue: "BINANCE",
        price: n(row.lastPrice),
        change24h: n(row.priceChangePercent),
        volume24h: n(row.volume),
      }],
    });
  }
  return assets;
}

async function okxAssets(): Promise<CexAsset[]> {
  const [tickersResult, instrumentsResult] = await Promise.allSettled([
    fetchJson("https://www.okx.com/api/v5/market/tickers?instType=SPOT"),
    fetchJson("https://www.okx.com/api/v5/public/instruments?instType=SPOT"),
  ]);

  if (tickersResult.status !== "fulfilled") throw tickersResult.reason;

  const launches = new Map<string, number | null>();
  if (instrumentsResult.status === "fulfilled") {
    for (const row of instrumentsResult.value?.data ?? []) {
      const instId = String(row.instId ?? "");
      launches.set(instId.replaceAll("-", ""), n(row.listTime));
    }
  }

  const assets: CexAsset[] = [];
  for (const row of tickersResult.value?.data ?? []) {
    const instId = String(row.instId ?? "");
    if (!instId.endsWith("-USDT")) continue;
    const symbol = instId.replaceAll("-", "");
    const { base, quote } = splitSymbol(symbol);
    const last = n(row.last);
    const open = n(row.open24h);
    const change = last != null && open != null && open !== 0 ? ((last - open) / open) * 100 : null;
    assets.push({
      kind: "CEX",
      symbol,
      base,
      quote,
      price: last,
      change24h: change,
      turnover24h: n(row.volCcy24h),
      volume24h: n(row.vol24h),
      launchTime: launches.get(symbol) ?? null,
      venues: [{
        venue: "OKX",
        price: last,
        change24h: change,
        volume24h: n(row.vol24h),
      }],
    });
  }
  return assets;
}

function mergeCex(groups: CexAsset[][]) {
  const merged = new Map<string, CexAsset>();

  for (const group of groups) {
    for (const asset of group) {
      const existing = merged.get(asset.symbol);
      if (!existing) {
        merged.set(asset.symbol, {
          ...asset,
          venues: [...asset.venues],
        });
        continue;
      }

      const venueNames = new Set(existing.venues.map((venue) => venue.venue));
      for (const venue of asset.venues) {
        if (!venueNames.has(venue.venue)) existing.venues.push(venue);
      }

      if (existing.price == null && asset.price != null) existing.price = asset.price;
      if (existing.change24h == null && asset.change24h != null) existing.change24h = asset.change24h;
      existing.turnover24h = Math.max(Number(existing.turnover24h ?? 0), Number(asset.turnover24h ?? 0)) || null;
      existing.volume24h = Math.max(Number(existing.volume24h ?? 0), Number(asset.volume24h ?? 0)) || null;
      existing.launchTime = Math.max(Number(existing.launchTime ?? 0), Number(asset.launchTime ?? 0)) || null;
    }
  }

  return [...merged.values()].filter((asset) => asset.price != null);
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
        "https://api.dexscreener.com/tokens/v1/" +
        encodeURIComponent(chain) + "/" +
        addresses.slice(0, 30).map(encodeURIComponent).join(","),
      );
      if (Array.isArray(payload)) pairs.push(...payload);
    } catch {
      // One chain failing must not take down the whole explorer.
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

  const boostIndex = new Map(items.map((item: any) => [String(item.tokenAddress ?? ""), item]));
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
    binanceAssets(),
    okxAssets(),
    dexBoosted(),
    dexSearch(q),
  ]);

  const bybit = bybitResult.status === "fulfilled" ? bybitResult.value : [];
  const binance = binanceResult.status === "fulfilled" ? binanceResult.value : [];
  const okx = okxResult.status === "fulfilled" ? okxResult.value : [];

  // OKX is first because it is currently the most reliable server-side source in our Vercel region.
  // The UI still merges all reachable venues per symbol.
  const cex = mergeCex([okx, bybit, binance]);

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
