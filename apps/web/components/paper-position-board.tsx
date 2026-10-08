"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";

type PaperPosition = {
  id: string;
  instrument_key: string;
  side: "LONG" | "SHORT";
  quantity: number | string;
  entry_price: number | string;
  status: string;
  opened_at: string;
};

function compactSymbol(key: string) {
  const clean = key.replace(/^CRYPTO:/i, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return clean || key;
}

function fmt(value: number, digits = 6) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function PaperPositionBoard({ positions }: { positions: PaperPosition[] }) {
  const symbols = useMemo(
    () => Array.from(new Set(positions.map((row) => compactSymbol(row.instrument_key)))),
    [positions],
  );
  const [quotes, setQuotes] = useState<Record<string,{price:number}>>({});
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!symbols.length) return;
    let stopped = false;

    async function load() {
      try {
        const response = await fetch("/api/markets/quotes?symbols=" + encodeURIComponent(symbols.join(",")), {
          cache: "no-store",
        });
        const data = await response.json();
        if (!stopped && response.ok && data?.ok) {
          setQuotes(data.quotes ?? {});
          setOnline(true);
        }
      } catch {
        if (!stopped) setOnline(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 10000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [symbols]);

  return (
    <section className="paper-position-board">
      <header>
        <div><Activity size={17}/><div><span>OPEN PAPER POSITIONS</span><strong>Live marked simulation</strong></div></div>
        <b className={online ? "online" : ""}>{online ? "LIVE MARK" : "CONNECTING"}</b>
      </header>

      <div className="paper-position-list">
        {positions.map((position) => {
          const symbol = compactSymbol(position.instrument_key);
          const current = Number(quotes[symbol]?.price ?? position.entry_price);
          const entry = Number(position.entry_price);
          const qty = Number(position.quantity);
          const multiplier = position.side === "LONG" ? 1 : -1;
          const pnl = Number.isFinite(current) && Number.isFinite(entry) && Number.isFinite(qty)
            ? (current - entry) * qty * multiplier
            : 0;
          const pnlPct = entry > 0 ? ((current - entry) / entry) * 100 * multiplier : 0;

          return (
            <article key={position.id}>
              <div className="paper-position-symbol">
                <span>{position.side === "LONG" ? <TrendingUp size={15}/> : <TrendingDown size={15}/>}</span>
                <div><strong>{position.instrument_key.replace(/^CRYPTO:/,"")}</strong><small>{position.side} · qty {fmt(qty,8)}</small></div>
              </div>
              <div><small>Entry</small><strong>{fmt(entry,8)}</strong></div>
              <div><small>Mark</small><strong>{fmt(current,8)}</strong></div>
              <div className={pnl >= 0 ? "paper-pnl up" : "paper-pnl down"}>
                <small>Unrealized</small><strong>{pnl >= 0 ? "+" : ""}{fmt(pnl,4)}</strong><span>{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
