"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Cable,
  CheckCircle2,
  Gauge,
  LoaderCircle,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Analysis = {
  direction: "BUY" | "SELL" | "WAIT";
  confidence: number;
  score: number;
  regime: string;
  lastPrice: number;
  previousPrice: number;
  change24h: number;
  ema9: number;
  ema21: number;
  ema50: number;
  rsi14: number;
  atr14: number;
  volumeRatio: number;
  stop: number | null;
  targets: number[];
  evidence: string[];
  reasonSummary: string;
};

type Result = {
  ok: boolean;
  symbol: string;
  analysis: Analysis;
  gates: {
    riskProfile: boolean;
    riskLimits: boolean;
    connectedExchange: boolean;
    paperAccount: boolean;
    directExecution: boolean;
  };
  intentId: string | null;
  engine: {
    name: string;
    version: string;
    modelType: string;
    generativeModelConfigured: boolean;
  };
};

function fmt(value: number | null | undefined, digits = 4) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function AIMarketWorkbench({ initialSymbol = "BTCUSDT" }: { initialSymbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function invoke(action: "analyze" | "create_intent") {
    const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
    if (!clean) return;

    action === "analyze" ? setLoading(true) : setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("ai-market-analysis", {
        body: { action, symbol: clean },
      });

      if (invokeError || data?.error || data?.ok !== true) {
        throw new Error(data?.error || invokeError?.message || "Analysis failed");
      }

      setSymbol(data.symbol);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void invoke("analyze");
  }

  const analysis = result?.analysis;
  const directionClass =
    analysis?.direction === "BUY" ? "buy" :
    analysis?.direction === "SELL" ? "sell" : "wait";

  return (
    <section className="ai-workbench">
      <header className="ai-workbench-head">
        <div>
          <span className="eyebrow-label">MARKET ANALYSIS ENGINE</span>
          <h2>Analyze a live market</h2>
          <p>Real candles in. Structured TradeIntent out. Deterministic risk remains independent.</p>
        </div>
        <span className="ai-engine-pill"><BrainCircuit size={14} /> UTAI QUANT CORE</span>
      </header>

      <form className="ai-symbol-form" onSubmit={submit}>
        <label>
          <span>Market symbol</span>
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="BTCUSDT"
            autoCapitalize="characters"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? <LoaderCircle size={17} className="spin-icon" /> : <Sparkles size={17} />}
          {loading ? "Analyzing…" : "Analyze market"}
        </button>
      </form>

      {error ? <div className="route-error"><Bot size={16} /> {error}</div> : null}

      {analysis ? (
        <>
          <section className="ai-analysis-hero">
            <div className={"ai-direction " + directionClass}>
              {analysis.direction === "BUY" ? <TrendingUp size={25} /> :
               analysis.direction === "SELL" ? <TrendingDown size={25} /> :
               <ShieldCheck size={25} />}
              <div>
                <span>CURRENT BIAS</span>
                <strong>{analysis.direction}</strong>
              </div>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{Math.round(analysis.confidence * 100)}%</strong>
            </div>
            <div>
              <span>Regime</span>
              <strong>{analysis.regime.replaceAll("_", " ")}</strong>
            </div>
            <div>
              <span>Last price</span>
              <strong>{fmt(analysis.lastPrice, 8)}</strong>
            </div>
          </section>

          <section className="ai-indicator-grid">
            <article><span>EMA 9</span><strong>{fmt(analysis.ema9, 8)}</strong></article>
            <article><span>EMA 21</span><strong>{fmt(analysis.ema21, 8)}</strong></article>
            <article><span>EMA 50</span><strong>{fmt(analysis.ema50, 8)}</strong></article>
            <article><span>RSI 14</span><strong>{fmt(analysis.rsi14, 1)}</strong></article>
            <article><span>ATR 14</span><strong>{fmt(analysis.atr14, 8)}</strong></article>
            <article><span>Volume ratio</span><strong>{fmt(analysis.volumeRatio, 2)}×</strong></article>
            <article><span>24h change</span><strong>{analysis.change24h >= 0 ? "+" : ""}{fmt(analysis.change24h, 2)}%</strong></article>
            <article><span>Signal score</span><strong>{fmt(analysis.score, 2)}</strong></article>
          </section>

          <section className="ai-analysis-grid">
            <article>
              <div className="ai-analysis-card-head"><Sparkles size={17} /><strong>Evidence</strong></div>
              <ul>
                {analysis.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p>{analysis.reasonSummary}</p>
            </article>

            <article>
              <div className="ai-analysis-card-head"><Gauge size={17} /><strong>Proposed structure</strong></div>
              <div className="ai-level-list">
                <span><small>Entry reference</small><b>{fmt(analysis.lastPrice, 8)}</b></span>
                <span><small>Invalidation</small><b>{fmt(analysis.stop, 8)}</b></span>
                <span><small>Target 1</small><b>{fmt(analysis.targets[0], 8)}</b></span>
                <span><small>Target 2</small><b>{fmt(analysis.targets[1], 8)}</b></span>
              </div>
              <small className="ai-sizing-note">Position size remains zero until deterministic risk sizing runs.</small>
            </article>
          </section>

          <section className="ai-gate-grid">
            <Link href="/risk" className={result?.gates.riskLimits ? "ready" : ""}>
              <Gauge size={17} />
              <div><strong>Risk limits</strong><span>{result?.gates.riskLimits ? "Ready" : "Configure"}</span></div>
              <ArrowRight size={14} />
            </Link>
            <Link href="/connections" className={result?.gates.connectedExchange ? "ready" : ""}>
              <Cable size={17} />
              <div><strong>Exchange</strong><span>{result?.gates.connectedExchange ? "Connected" : "Connect"}</span></div>
              <ArrowRight size={14} />
            </Link>
            <Link href="/paper" className={result?.gates.paperAccount ? "ready" : ""}>
              <ShieldCheck size={17} />
              <div><strong>Paper account</strong><span>{result?.gates.paperAccount ? "Ready" : "Create"}</span></div>
              <ArrowRight size={14} />
            </Link>
          </section>

          <div className="ai-intent-actions">
            <button type="button" onClick={() => void invoke("create_intent")} disabled={saving}>
              {saving ? <LoaderCircle size={16} className="spin-icon" /> : <Save size={16} />}
              {saving ? "Creating TradeIntent…" : "Create TradeIntent"}
            </button>
            <Link href={"/trade?symbol=" + encodeURIComponent(result?.symbol ?? symbol)}>
              Open live terminal <ArrowRight size={15} />
            </Link>
          </div>

          {result?.intentId ? (
            <div className="route-success">
              <CheckCircle2 size={16} />
              TradeIntent created: {result.intentId.slice(0, 8)}… It still requires an independent risk decision before execution.
            </div>
          ) : null}

          <div className="ai-engine-disclosure">
            <Bot size={15} />
            <div>
              <strong>{result?.engine.name} {result?.engine.version}</strong>
              <span>
                This active engine is deterministic technical analysis. A separate generative/model inference layer
                is not yet configured, and the UI does not pretend otherwise.
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="ai-workbench-empty">
          <BrainCircuit size={30} />
          <strong>Choose a market and run analysis</strong>
          <span>You can also launch this screen directly from any centralized market row.</span>
        </div>
      )}
    </section>
  );
}
