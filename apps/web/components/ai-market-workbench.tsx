"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Cable,
  CheckCircle2,
  Gauge,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AnalysisResult = {
  ok: true;
  action: "analyze";
  intentId: string;
  decisionId: string;
  symbol: string;
  tradeAction: "BUY" | "SELL" | "NO_TRADE";
  decisionStatus: "APPROVE" | "REJECT";
  confidence: number;
  probabilityUp: number;
  validationAccuracy: number;
  expectedEdge: number;
  entry: number;
  stop: number | null;
  target: number | null;
  proposedSize: number;
  reasons: string[];
  regime: string;
  marketSource: string;
};

function fmt(value: number | null | undefined, digits = 6) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return (value * 100).toFixed(1) + "%";
}

export function AIMarketWorkbench({
  initialSymbol = "BTCUSDT",
  paperReady = false,
}: {
  initialSymbol?: string;
  paperReady?: boolean;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState("15m");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [paperLoading, setPaperLoading] = useState(false);
  const [paperFill, setPaperFill] = useState<{ fillPrice:number; quantity:number; fee:number } | null>(null);
  const [error, setError] = useState("");

  async function analyze(event?: FormEvent) {
    event?.preventDefault();
    const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
    if (!clean) return;

    setLoading(true);
    setError("");
    setPaperFill(null);

    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("quant-trade-analysis", {
        body: { action: "analyze", symbol: clean, timeframe },
      });

      if (invokeError || data?.error || data?.ok !== true) {
        throw new Error(data?.error || invokeError?.message || "Analysis failed");
      }

      setSymbol(clean);
      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function executePaper() {
    if (!result?.intentId) return;
    setPaperLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("quant-trade-analysis", {
        body: { action: "paper_execute", intentId: result.intentId },
      });

      if (invokeError || data?.error || data?.ok !== true) {
        throw new Error(data?.error || invokeError?.message || "Paper execution failed");
      }

      setPaperFill({
        fillPrice: Number(data.fillPrice),
        quantity: Number(data.quantity),
        fee: Number(data.fee),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paper execution failed");
    } finally {
      setPaperLoading(false);
    }
  }

  const directionClass =
    result?.tradeAction === "BUY" ? "buy" :
    result?.tradeAction === "SELL" ? "sell" : "wait";

  return (
    <section className="ai-workbench">
      <header className="ai-workbench-head">
        <div>
          <span className="eyebrow-label">LOCAL ML + QUANT COPILOT</span>
          <h2>Analyze a real market and create a risk-governed intent</h2>
          <p>
            Recent real candles train a small statistical classifier on demand. Its proposal is then
            checked by your deterministic risk policy before paper execution is allowed.
          </p>
        </div>
        <span className="ai-engine-pill"><BrainCircuit size={14}/> UTAI ML CORE</span>
      </header>

      <form className="ai-symbol-form" onSubmit={analyze}>
        <label>
          <span>Market symbol</span>
          <input
            value={symbol}
            onChange={(event)=>setSymbol(event.target.value)}
            placeholder="BTCUSDT"
            autoCapitalize="characters"
          />
        </label>

        <label>
          <span>Timeframe</span>
          <select value={timeframe} onChange={(event)=>setTimeframe(event.target.value)}>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
            <option value="4h">4 hours</option>
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? <LoaderCircle size={17} className="spin-icon"/> : <Sparkles size={17}/>}
          {loading ? "Training + evaluating…" : "Analyze with ML"}
        </button>
      </form>

      {error ? <div className="route-error"><Bot size={16}/>{error}</div> : null}

      {result ? (
        <>
          <section className="ai-analysis-hero">
            <div className={"ai-direction " + directionClass}>
              {result.tradeAction === "BUY" ? <TrendingUp size={25}/> :
               result.tradeAction === "SELL" ? <TrendingDown size={25}/> :
               <ShieldCheck size={25}/>}
              <div>
                <span>MODEL PROPOSAL</span>
                <strong>{result.tradeAction}</strong>
              </div>
            </div>

            <div>
              <span>Confidence</span>
              <strong>{pct(result.confidence)}</strong>
            </div>

            <div>
              <span>Risk decision</span>
              <strong className={result.decisionStatus === "APPROVE" ? "good-text" : "bad-text"}>
                {result.decisionStatus}
              </strong>
            </div>

            <div>
              <span>Regime</span>
              <strong>{result.regime.replaceAll("_"," ")}</strong>
            </div>
          </section>

          <section className="ai-indicator-grid">
            <article><span>P(up next bar)</span><strong>{pct(result.probabilityUp)}</strong></article>
            <article><span>Validation accuracy</span><strong>{pct(result.validationAccuracy)}</strong></article>
            <article><span>Expected-edge score</span><strong>{pct(result.expectedEdge)}</strong></article>
            <article><span>Entry reference</span><strong>{fmt(result.entry)}</strong></article>
            <article><span>Invalidation</span><strong>{fmt(result.stop)}</strong></article>
            <article><span>Target</span><strong>{fmt(result.target)}</strong></article>
            <article><span>Approved quantity</span><strong>{fmt(result.decisionStatus === "APPROVE" ? result.proposedSize : 0, 8)}</strong></article>
            <article><span>Market source</span><strong>UNIFIED FEED</strong></article>
          </section>

          <section className="ai-analysis-grid">
            <article>
              <div className="ai-analysis-card-head"><BrainCircuit size={17}/><strong>Model interpretation</strong></div>
              <p>
                The classifier estimates next-bar direction from returns, moving-average spread,
                volatility, range expansion and volume behavior. Validation accuracy is calculated
                on held-out recent candles rather than the training rows.
              </p>
              <div className="ai-probability-track">
                <span style={{width: Math.max(2, Math.min(98, result.probabilityUp * 100)) + "%"}}/>
              </div>
              <div className="ai-probability-labels"><span>DOWN</span><b>{pct(result.probabilityUp)} UP</b></div>
            </article>

            <article>
              <div className="ai-analysis-card-head"><Gauge size={17}/><strong>Deterministic risk verdict</strong></div>
              {result.reasons.length ? (
                <ul className="ai-reason-list">
                  {result.reasons.map((reason)=><li key={reason}>{reason.replaceAll("_"," ")}</li>)}
                </ul>
              ) : (
                <div className="ai-risk-approved"><CheckCircle2 size={18}/><span>Current proposal passed the configured risk checks.</span></div>
              )}
              <small className="ai-sizing-note">Live execution remains a separate execution-policy gate even when risk approves.</small>
            </article>
          </section>

          <section className="ai-gate-grid">
            <Link href="/risk" className={result.decisionStatus === "APPROVE" ? "ready" : ""}>
              <Gauge size={17}/>
              <div><strong>Risk authority</strong><span>{result.decisionStatus}</span></div>
              <ArrowRight size={14}/>
            </Link>

            <Link href="/connections">
              <Cable size={17}/>
              <div><strong>Exchange accounts</strong><span>Manage connections</span></div>
              <ArrowRight size={14}/>
            </Link>

            <Link href="/paper" className={paperReady ? "ready" : ""}>
              <ShieldCheck size={17}/>
              <div><strong>Paper account</strong><span>{paperReady ? "Ready" : "Create first"}</span></div>
              <ArrowRight size={14}/>
            </Link>
          </section>

          <div className="ai-intent-actions">
            {result.decisionStatus === "APPROVE" && ["BUY","SELL"].includes(result.tradeAction) ? (
              paperReady ? (
                <button type="button" onClick={executePaper} disabled={paperLoading || Boolean(paperFill)}>
                  {paperLoading ? <LoaderCircle size={16} className="spin-icon"/> : <ShieldCheck size={16}/>}
                  {paperFill ? "Paper trade filled" : paperLoading ? "Executing paper trade…" : "Execute in Paper Account"}
                </button>
              ) : (
                <Link href="/paper">Create paper account <ArrowRight size={15}/></Link>
              )
            ) : (
              <Link href="/risk">Review risk settings <ArrowRight size={15}/></Link>
            )}

            <Link href={"/trade?symbol="+encodeURIComponent(symbol)}>
              Open live terminal <ArrowRight size={15}/>
            </Link>
          </div>

          {paperFill ? (
            <div className="route-success">
              <CheckCircle2 size={16}/>
              Paper fill recorded at {fmt(paperFill.fillPrice,8)} · quantity {fmt(paperFill.quantity,8)} · fee {fmt(paperFill.fee,8)}
            </div>
          ) : null}

          <div className="ai-engine-disclosure">
            <Bot size={15}/>
            <div>
              <strong>UTAI Local ML Core 1.0</strong>
              <span>
                This is a real on-demand statistical classifier plus deterministic risk checks—not
                a guaranteed-profit predictor. News/on-chain specialist models remain separate evidence inputs.
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="ai-workbench-empty">
          <BrainCircuit size={30}/>
          <strong>Select a market and run the model</strong>
          <span>Use a centralized-market symbol such as BTCUSDT, ETHUSDT, SOLUSDT or DOGEUSDT.</span>
        </div>
      )}
    </section>
  );
}
