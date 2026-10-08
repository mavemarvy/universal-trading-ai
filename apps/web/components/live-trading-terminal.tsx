"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Cable,
  CandlestickChart,
  Gauge,
  Wifi,
  WifiOff,
} from "lucide-react";

type Ticker = {
  symbol?: string;
  lastPrice?: string;
  price24hPcnt?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  volume24h?: string;
  turnover24h?: string;
  bid1Price?: string;
  ask1Price?: string;
};

type Candle = {
  start: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Trade = {
  id: string;
  side: string;
  price: number;
  size: number;
  time: number;
};

type Book = { bids: [number, number][]; asks: [number, number][] };

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "BNBUSDT",
  "ADAUSDT",
  "AVAXUSDT",
] as const;

function fmt(value: number | string | undefined, max = 4) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString(undefined, { maximumFractionDigits: max });
}

function pct(value?: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const percent = number * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function mergeLevels(
  current: [number, number][],
  updates: [string, string][],
  descending: boolean,
) {
  const map = new Map(current.map(([price, size]) => [price, size]));
  for (const [priceText, sizeText] of updates) {
    const price = Number(priceText);
    const size = Number(sizeText);
    if (!Number.isFinite(price) || !Number.isFinite(size)) continue;
    if (size === 0) map.delete(price);
    else map.set(price, size);
  }
  return [...map.entries()]
    .sort((a, b) => (descending ? b[0] - a[0] : a[0] - b[0]))
    .slice(0, 18) as [number, number][];
}

export function LiveTradingTerminal({
  hasConnection,
  riskReady,
  paperReady,
}: {
  hasConnection: boolean;
  riskReady: boolean;
  paperReady: boolean;
}) {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [ticker, setTicker] = useState<Ticker>({});
  const [candles, setCandles] = useState<Candle[]>([]);
  const [book, setBook] = useState<Book>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const stopped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const response = await fetch(
          `https://api.bybit.com/v5/market/kline?category=spot&symbol=${encodeURIComponent(symbol)}&interval=1&limit=100`,
          { cache: "no-store" },
        );
        const json = await response.json();
        const list = Array.isArray(json?.result?.list) ? json.result.list : [];
        const next = list
          .map((row: string[]) => ({
            start: Number(row[0]),
            open: Number(row[1]),
            high: Number(row[2]),
            low: Number(row[3]),
            close: Number(row[4]),
            volume: Number(row[5]),
          }))
          .filter((row: Candle) => Number.isFinite(row.start))
          .reverse();
        if (!cancelled) setCandles(next);
      } catch {
        if (!cancelled) setCandles([]);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    stopped.current = false;
    setTicker({});
    setBook({ bids: [], asks: [] });
    setTrades([]);
    setStatus("connecting");

    let ws: WebSocket | null = null;
    let heartbeat: number | null = null;
    let retry: number | null = null;

    const connect = () => {
      if (stopped.current) return;
      ws = new WebSocket("wss://stream.bybit.com/v5/public/spot");

      ws.onopen = () => {
        setStatus("live");
        ws?.send(
          JSON.stringify({
            op: "subscribe",
            args: [
              `tickers.${symbol}`,
              `publicTrade.${symbol}`,
              `orderbook.50.${symbol}`,
              `kline.1.${symbol}`,
            ],
          }),
        );
        heartbeat = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: "ping" }));
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data));
          const topic = String(message.topic ?? "");

          if (topic === `tickers.${symbol}`) {
            const raw = Array.isArray(message.data) ? message.data[0] : message.data;
            if (raw) setTicker((current) => ({ ...current, ...raw }));
          }

          if (topic === `publicTrade.${symbol}` && Array.isArray(message.data)) {
            const incoming = message.data
              .slice(-20)
              .reverse()
              .map((row: any) => ({
                id: String(row.i ?? `${row.T}-${row.p}-${row.v}`),
                side: String(row.S ?? ""),
                price: Number(row.p),
                size: Number(row.v),
                time: Number(row.T ?? Date.now()),
              }));
            setTrades((current) => {
              const seen = new Set<string>();
              return [...incoming, ...current]
                .filter((trade) => trade.id && !seen.has(trade.id) && seen.add(trade.id))
                .slice(0, 24);
            });
          }

          if (topic === `orderbook.50.${symbol}`) {
            const data = message.data ?? {};
            const bids = Array.isArray(data.b) ? data.b : [];
            const asks = Array.isArray(data.a) ? data.a : [];
            if (message.type === "snapshot") {
              setBook({
                bids: bids.map((row: string[]) => [Number(row[0]), Number(row[1])]).slice(0, 18),
                asks: asks.map((row: string[]) => [Number(row[0]), Number(row[1])]).slice(0, 18),
              });
            } else {
              setBook((current) => ({
                bids: mergeLevels(current.bids, bids, true),
                asks: mergeLevels(current.asks, asks, false),
              }));
            }
          }

          if (topic === `kline.1.${symbol}` && Array.isArray(message.data)) {
            const row = message.data[0];
            const candle: Candle = {
              start: Number(row.start),
              open: Number(row.open),
              high: Number(row.high),
              low: Number(row.low),
              close: Number(row.close),
              volume: Number(row.volume),
            };
            if (!Number.isFinite(candle.start)) return;
            setCandles((current) => {
              const index = current.findIndex((item) => item.start === candle.start);
              const next = [...current];
              if (index >= 0) next[index] = candle;
              else next.push(candle);
              return next.sort((a, b) => a.start - b.start).slice(-120);
            });
          }
        } catch {
          // Ignore heartbeat acknowledgements and malformed provider frames.
        }
      };

      ws.onerror = () => setStatus("offline");
      ws.onclose = () => {
        if (heartbeat) window.clearInterval(heartbeat);
        if (stopped.current) return;
        setStatus("connecting");
        retry = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      stopped.current = true;
      if (heartbeat) window.clearInterval(heartbeat);
      if (retry) window.clearTimeout(retry);
      ws?.close();
    };
  }, [symbol]);

  const chart = useMemo(() => candles.slice(-72), [candles]);
  const chartMetrics = useMemo(() => {
    if (!chart.length) return null;
    const high = Math.max(...chart.map((c) => c.high));
    const low = Math.min(...chart.map((c) => c.low));
    const span = high - low || 1;
    const width = 1000;
    const height = 300;
    const padX = 18;
    const padY = 18;
    const step = (width - padX * 2) / Math.max(chart.length, 1);
    const y = (price: number) => padY + ((high - price) / span) * (height - padY * 2);
    return { high, low, width, height, padX, step, y };
  }, [chart]);

  const change = Number(ticker.price24hPcnt);
  const orderAction =
    mode === "paper"
      ? !paperReady
        ? { href: "/paper", label: "Create paper account" }
        : !riskReady
          ? { href: "/risk", label: "Configure risk first" }
          : { href: "/ai", label: "Create paper intent through AI / risk" }
      : !hasConnection
        ? { href: "/connections", label: "Connect exchange account" }
        : !riskReady
          ? { href: "/risk", label: "Configure deterministic risk" }
          : { href: "/ai", label: "Route live intent through AI / risk" };

  return (
    <section className="terminal-shell">
      <header className="terminal-symbol-bar">
        <div className="terminal-symbol-tabs">
          {SYMBOLS.map((item) => (
            <button
              type="button"
              className={symbol === item ? "active" : ""}
              onClick={() => setSymbol(item)}
              key={item}
            >
              {item.replace("USDT", "")}
              <small>/USDT</small>
            </button>
          ))}
        </div>
        <span className={status === "live" ? "market-connection live" : "market-connection"}>
          {status === "live" ? <Wifi size={13} /> : <WifiOff size={13} />}
          {status.toUpperCase()}
        </span>
      </header>

      <div className="terminal-market-head">
        <div className="terminal-pair">
          <span className="terminal-coin">{symbol.slice(0, 1)}</span>
          <div>
            <strong>{symbol.replace("USDT", "/USDT")}</strong>
            <small>BYBIT PUBLIC SPOT</small>
          </div>
        </div>
        <div className="terminal-last">
          <strong>{fmt(ticker.lastPrice, 6)}</strong>
          <span className={Number.isFinite(change) && change >= 0 ? "up" : "down"}>
            {pct(ticker.price24hPcnt)}
          </span>
        </div>
        <div className="terminal-stats">
          <span><small>24h high</small><b>{fmt(ticker.highPrice24h, 6)}</b></span>
          <span><small>24h low</small><b>{fmt(ticker.lowPrice24h, 6)}</b></span>
          <span><small>24h volume</small><b>{fmt(ticker.volume24h, 2)}</b></span>
          <span><small>Bid / Ask</small><b>{fmt(ticker.bid1Price, 6)} / {fmt(ticker.ask1Price, 6)}</b></span>
        </div>
      </div>

      <div className="terminal-grid">
        <section className="terminal-chart-card">
          <div className="terminal-card-head">
            <div><CandlestickChart size={16} /><strong>1m Candles</strong></div>
            <span>REAL PUBLIC DATA</span>
          </div>
          <div className="terminal-chart-wrap">
            {chartMetrics ? (
              <svg viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`} preserveAspectRatio="none" aria-label="Live candlestick chart">
                {chart.map((candle, index) => {
                  const x = chartMetrics.padX + index * chartMetrics.step + chartMetrics.step / 2;
                  const openY = chartMetrics.y(candle.open);
                  const closeY = chartMetrics.y(candle.close);
                  const highY = chartMetrics.y(candle.high);
                  const lowY = chartMetrics.y(candle.low);
                  const rising = candle.close >= candle.open;
                  const top = Math.min(openY, closeY);
                  const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
                  return (
                    <g key={candle.start} className={rising ? "candle-up" : "candle-down"}>
                      <line x1={x} x2={x} y1={highY} y2={lowY} />
                      <rect
                        x={x - Math.max(2.2, chartMetrics.step * 0.28)}
                        y={top}
                        width={Math.max(4.4, chartMetrics.step * 0.56)}
                        height={bodyHeight}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="terminal-loading">Loading candles…</div>
            )}
          </div>
          <div className="terminal-chart-foot">
            <span>High {chartMetrics ? fmt(chartMetrics.high, 6) : "—"}</span>
            <span>Low {chartMetrics ? fmt(chartMetrics.low, 6) : "—"}</span>
            <span>{chart.length} candles</span>
          </div>
        </section>

        <section className="terminal-orderbook">
          <div className="terminal-card-head">
            <div><Activity size={16} /><strong>Order Book</strong></div>
            <span>50 LEVEL FEED</span>
          </div>
          <div className="book-head"><span>Price</span><span>Size</span></div>
          <div className="book-side asks">
            {book.asks.slice(0, 8).reverse().map(([price, size]) => (
              <div key={"a" + price}><span>{fmt(price, 6)}</span><b>{fmt(size, 4)}</b></div>
            ))}
          </div>
          <div className="book-mid">{fmt(ticker.lastPrice, 6)}</div>
          <div className="book-side bids">
            {book.bids.slice(0, 8).map(([price, size]) => (
              <div key={"b" + price}><span>{fmt(price, 6)}</span><b>{fmt(size, 4)}</b></div>
            ))}
          </div>
        </section>

        <section className="terminal-trades">
          <div className="terminal-card-head">
            <div><Activity size={16} /><strong>Recent Trades</strong></div>
            <span>LIVE TAPE</span>
          </div>
          <div className="trade-list-head"><span>Price</span><span>Size</span><span>Time</span></div>
          <div className="terminal-trade-list">
            {trades.slice(0, 15).map((trade) => (
              <div key={trade.id}>
                <span className={trade.side === "Buy" ? "buy" : "sell"}>
                  {trade.side === "Buy" ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {fmt(trade.price, 6)}
                </span>
                <b>{fmt(trade.size, 4)}</b>
                <time>{new Date(trade.time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</time>
              </div>
            ))}
          </div>
        </section>

        <aside className="terminal-ticket">
          <div className="terminal-card-head">
            <div><BrainCircuit size={16} /><strong>Order Route</strong></div>
            <span>RISK GATED</span>
          </div>

          <div className="ticket-mode-tabs">
            <button type="button" onClick={() => setMode("paper")} className={mode === "paper" ? "active" : ""}>Paper</button>
            <button type="button" onClick={() => setMode("live")} className={mode === "live" ? "active" : ""}>Live</button>
          </div>

          <div className="ticket-pair">
            <span>Instrument</span>
            <strong>{symbol.replace("USDT", "/USDT")}</strong>
          </div>

          <div className="ticket-gates">
            <span className={riskReady ? "ready" : ""}><Gauge size={14} /> Risk policy <b>{riskReady ? "READY" : "SET UP"}</b></span>
            <span className={hasConnection ? "ready" : ""}><Cable size={14} /> Exchange <b>{hasConnection ? "CONNECTED" : "MISSING"}</b></span>
            <span className={paperReady ? "ready" : ""}><CandlestickChart size={14} /> Paper account <b>{paperReady ? "READY" : "MISSING"}</b></span>
          </div>

          <div className="ticket-notice">
            <strong>No bypass execution.</strong>
            <p>
              The market terminal is live. Orders still have to become a TradeIntent and pass deterministic
              risk before any paper or live execution path can act.
            </p>
          </div>

          <Link href={orderAction.href} className="ticket-action">{orderAction.label}</Link>
        </aside>
      </div>
    </section>
  );
}
