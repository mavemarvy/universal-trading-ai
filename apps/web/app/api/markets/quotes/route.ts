import { NextRequest, NextResponse } from "next/server";

function compactToVenue(symbol: string) {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const quote = ["USDT", "USDC", "USD"].find((q) => clean.endsWith(q)) ?? "USDT";
  const base = clean.endsWith(quote) ? clean.slice(0, -quote.length) : clean;
  return { compact: base + quote, venue: base + "-" + quote, base, quote };
}

async function okxQuotes(symbols: ReturnType<typeof compactToVenue>[]) {
  const response = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SPOT", {
    next: { revalidate: 5 },
    headers: { Accept: "application/json", "User-Agent": "UniversalTradingAI/1.0 quotes" },
    signal: AbortSignal.timeout(7000),
  });
  const payload = await response.json();
  if (!response.ok || payload?.code !== "0" || !Array.isArray(payload?.data)) throw new Error("provider_unavailable");

  const byId = new Map(payload.data.map((row: any) => [String(row.instId), row]));
  return Object.fromEntries(
    symbols.flatMap((symbol) => {
      const row: any = byId.get(symbol.venue);
      const price = Number(row?.last);
      return Number.isFinite(price) && price > 0
        ? [[symbol.compact, { price, bid: Number(row?.bidPx || 0), ask: Number(row?.askPx || 0) }]]
        : [];
    }),
  );
}

async function fallbackQuotes(symbols: ReturnType<typeof compactToVenue>[]) {
  const response = await fetch("https://api.binance.com/api/v3/ticker/price", {
    next: { revalidate: 5 },
    headers: { Accept: "application/json", "User-Agent": "UniversalTradingAI/1.0 quotes" },
    signal: AbortSignal.timeout(7000),
  });
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload)) throw new Error("fallback_unavailable");
  const bySymbol = new Map(payload.map((row: any) => [String(row.symbol), Number(row.price)]));
  return Object.fromEntries(
    symbols.flatMap((symbol) => {
      const price = bySymbol.get(symbol.compact);
      return Number.isFinite(price) && Number(price) > 0
        ? [[symbol.compact, { price: Number(price), bid: 0, ask: 0 }]]
        : [];
    }),
  );
}

export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("symbols") ?? "BTCUSDT")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);

  const symbols = raw.map(compactToVenue);
  let quotes: Record<string, {price:number;bid:number;ask:number}> = {};
  let source = "CEX-A";

  try {
    quotes = await okxQuotes(symbols);
  } catch {
    quotes = await fallbackQuotes(symbols);
    source = "CEX-B";
  }

  return NextResponse.json({
    ok: true,
    source,
    fetchedAt: new Date().toISOString(),
    quotes,
  });
}
