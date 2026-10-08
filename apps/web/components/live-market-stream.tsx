"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";

type Ticker = {
  symbol: string;
  lastPrice?: string;
  price24hPcnt?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  volume24h?: string;
  turnover24h?: string;
};

type Trade = {
  symbol: string;
  side: string;
  price: string;
  size: string;
  time: number;
  id: string;
};

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;
const WS_URL = "wss://ws.okx.com:8443/ws/v5/public";

function instId(symbol: string) {
  return symbol.endsWith("USDT") ? symbol.slice(0, -4) + "-USDT" : symbol;
}

function compact(id: string) {
  return id.replaceAll("-", "");
}

function label(symbol: string) {
  return symbol.replace("USDT", "/USDT");
}

function percent(value?: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}

function price(value?: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function LiveMarketStream({ compact: compactMode = false }: { compact?: boolean }) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "reconnecting" | "offline">("connecting");
  const retryRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const ordered = useMemo(
    () => SYMBOLS.map((symbol) => tickers[symbol] ?? { symbol }),
    [tickers]
  );

  useEffect(() => {
    stoppedRef.current = false;
    let ws: WebSocket | null = null;
    let heartbeat: number | null = null;

    const connect = () => {
      if (stoppedRef.current) return;
      setStatus((current) => current === "live" ? "reconnecting" : "connecting");
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setStatus("live");
        ws?.send(JSON.stringify({
          op: "subscribe",
          args: SYMBOLS.flatMap((symbol) => [
            { channel: "tickers", instId: instId(symbol) },
            { channel: "trades", instId: instId(symbol) },
          ]),
        }));
        heartbeat = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const message = JSON.parse(String(event.data));
          const channel = String(message?.arg?.channel ?? "");
          const id = String(message?.arg?.instId ?? "");
          if (!id || !Array.isArray(message?.data)) return;
          const symbol = compact(id);

          if (channel === "tickers") {
            const raw = message.data[0] ?? {};
            const last = Number(raw.last);
            const open = Number(raw.open24h);
            const change = Number.isFinite(last) && Number.isFinite(open) && open !== 0
              ? (last - open) / open
              : 0;
            setTickers((current) => ({
              ...current,
              [symbol]: {
                symbol,
                lastPrice: String(raw.last ?? ""),
                price24hPcnt: String(change),
                highPrice24h: String(raw.high24h ?? ""),
                lowPrice24h: String(raw.low24h ?? ""),
                volume24h: String(raw.vol24h ?? ""),
                turnover24h: String(raw.volCcy24h ?? ""),
              },
            }));
          }

          if (channel === "trades") {
            const incoming: Trade[] = message.data.slice(-10).reverse().map((row: any) => ({
              symbol,
              side: String(row.side ?? "").toLowerCase() === "buy" ? "Buy" : "Sell",
              price: String(row.px ?? ""),
              size: String(row.sz ?? ""),
              time: Number(row.ts ?? Date.now()),
              id: String(row.tradeId ?? `${symbol}-${row.ts}-${row.px}`),
            }));
            setTrades((current) => {
              const seen = new Set<string>();
              return [...incoming, ...current]
                .filter((item) => item.id && !seen.has(item.id) && seen.add(item.id))
                .slice(0, 12);
            });
          }
        } catch {
          // Ignore provider control frames.
        }
      };

      ws.onerror = () => setStatus("offline");
      ws.onclose = () => {
        if (heartbeat) window.clearInterval(heartbeat);
        if (stoppedRef.current) return;
        setStatus("reconnecting");
        retryRef.current = window.setTimeout(connect, 2500);
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      if (heartbeat) window.clearInterval(heartbeat);
      if (retryRef.current) window.clearTimeout(retryRef.current);
      ws?.close();
    };
  }, []);

  return (
    <section className={compactMode ? "live-market-stream compact" : "live-market-stream"}>
      <div className="live-market-head">
        <div>
          <span className="eyebrow-label">LIVE MARKET</span>
          <strong>UTAI Unified Market Feed</strong>
        </div>
        <span className={status === "live" ? "market-connection live" : "market-connection"}>
          {status === "live" ? <Wifi size={13} /> : <WifiOff size={13} />}
          {status.toUpperCase()}
        </span>
      </div>

      <div className="live-ticker-grid">
        {ordered.map((ticker) => {
          const change = Number(ticker.price24hPcnt);
          return (
            <article key={ticker.symbol}>
              <div><strong>{label(ticker.symbol)}</strong><small>SPOT</small></div>
              <b>{price(ticker.lastPrice)}</b>
              <span className={Number.isFinite(change) && change >= 0 ? "ticker-change up" : "ticker-change down"}>
                {percent(ticker.price24hPcnt)}
              </span>
            </article>
          );
        })}
      </div>

      {!compactMode ? (
        <div className="trade-tape">
          <div className="trade-tape-title"><Activity size={14} /><span>RECENT PUBLIC TRADES</span></div>
          <div className="trade-tape-track">
            {trades.length ? trades.map((trade) => (
              <span key={trade.id}>
                <b>{trade.symbol.replace("USDT","")}</b>
                <i className={trade.side === "Buy" ? "buy" : "sell"}>{trade.side}</i>
                {price(trade.price)}
                <small>{trade.size}</small>
              </span>
            )) : <span className="tape-waiting">Waiting for public trades…</span>}
          </div>
        </div>
      ) : null}

      <p className="live-source-note">Aggregated public market data. No private account credential is used for this feed.</p>
    </section>
  );
}
