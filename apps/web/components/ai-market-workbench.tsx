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
  Play,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type QuantResult = {
  ok: boolean;
  action: "analyze";
  intentId: string;
  decisionId: string;
  symbol: string;
  tradeAction: "BUY" | "SELL" | "NO_TRADE";
  decisionStatus: "APPROVE" | "MODIFY" | "REJECT";
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

type PaperResult = {
  ok: boolean;
  action: "paper_execute";
  paperOrderId: string;
  fillPrice: number;
  quantity: number;
  fee: number;
  source: string;
};

function fmt(value: number | null | undefined, digits = 6) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function percent(value: number | null | undefined) {
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
  const [result, setResult] = useState<QuantResult | null>(null);
  const [paper, setPaper] = useState<PaperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [paperLoading, setPaperLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
    if (!clean) return;

    setLoading(true);
    setError("");
    setPaper(null);

    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("quant-trade-analysis", {
        body: { action: "analyze", symbol: clean, timeframe },
      });

      if (invokeError || data?.error || data?.ok !== true) {
        throw new Error(data?.error || invokeError?.message || "Analysis failed");
      }

      setSymbol(clean);
      setResult(data as QuantResult);
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

      setPaper(data as PaperResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paper execution failed");
    } finally {
      setPaperLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void analyze();
  }

  const actionClass =
    result?.tradeAction === "BUY" ? "buy" :
    result?.tradeAction === "SELL" ? "sell" : "wait";

  const decisionClass =
    result?.decisionStatus === "APPROVE" ? "approve" :
    result?.decisionStatus === "MODIFY" ? "modify" : "reject";

  return (
    <section className="ai-workbench">
      <header className="ai-workbench-head">
        <div>
          <span className="eyebrow-label">AI / QUANT TRADE ENGINE</span>
          <h2>Analyze a live market and route it through risk.</h2>
          <p>
            A local market model is trained on recent candles for this request. The resulting
            TradeIntent is then evaluated by deterministic risk before Paper execution is allowed.
          </p>
        </div>
        <span className="ai-engine-pill"><BrainCircuit size={14} /> UTAI QUANT CORE</span>
      </header>

      <form className="ai-symbol-form ai-symbol-form-v2" onSubmit={submit}>
        <label>
          <span>Market</span>
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="BTCUSDT"
            autoCapitalize="characters"
          />
        </label>

        <label>
          <span>Timeframe</span>
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
            <option value="4h">4 hours</option>
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? <LoaderCircle size={17} className="spin-icon" /> : <Sparkles size={17} />}
          {loading ? "Training + analyzing…" : "Run AI analysis"}
        </button>
      </form>

      {error ? <div className="route-error"><Bot size={16} /> {error}</div> : null}

      {result ? (
        <>
          <section className="ai-analysis-hero">
            <div className={"ai-direction " + actionClass}>
              {result.tradeAction === "BUY" ? <TrendingUp size={25} /> :
               result.tradeAction === "SELL" ? <TrendingDown size={25} /> :
               <ShieldCheck size={25} />}
              <div>
                <span>MODEL ACTION</span>
                <strong>{result.tradeAction.replace("_", " ")}</strong>
              </div>
            </div>

            <div>
              <span>Risk decision</span>
              <strong className={"risk-decision-text " + decisionClass}>{result.decisionStatus}</strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong>{percent(result.confidence)}</strong>
            </div>

            <div>
              <span>Regime</span>
              <strong>{result.regime.replaceAll("_", " ")}</strong>
            </div>
          </section>

          <section className="ai-indicator-grid ai-model-grid">
            <article><span>P(up)</span><strong>{percent(result.probabilityUp)}</strong></article>
            <article><span>Validation accuracy</span><strong>{percent(result.validationAccuracy)}</strong></article>
            <article><span>Expected edge</span><strong>{percent(result.expectedEdge)}</strong></article>
            <article><span>Entry reference</span><strong>{fmt(result.entry, 8)}</strong></article>
            <article><span>Stop / invalidation</span><strong>{fmt(result.stop, 8)}</strong></article>
            <article><span>Target</span><strong>{fmt(result.target, 8)}</strong></article>
            <article><span>Risk-sized quantity</span><strong>{fmt(result.proposedSize, 8)}</strong></article>
            <article><span>Market source</span><strong>{result.marketSource.replaceAll("_", " ")}</strong></article>
          </section>

          <section className="ai-analysis-grid">
            <article>
              <div className="ai-analysis-card-head"><BrainCircuit size={17} /><strong>Model output</strong></div>
              <p>
                The engine trained on recent {timeframe} candles and created TradeIntent{" "}
                <b>{result.intentId.slice(0, 8)}…</b>. Validation accuracy and probability are shown
                above instead of being hidden behind a generic “AI” label.
              </p>
              <div className="ai-model-disclosure">
                <span>Model</span><b>Local logistic market classifier</b>
                <span>Execution</span><b>Deterministic risk authority</b>
                <span>Live order bypass</span><b>Disabled</b>
              </div>
            </article>

            <article>
              <div className="ai-analysis-card-head"><Gauge size={17} /><strong>Risk result</strong></div>
              {result.reasons.length ? (
                <ul>
                  {result.reasons.map((reason) => (
                    <li key={reason}>{reason.replaceAll("_", " ")}</li>
                  ))}
                </ul>
              ) : (
                <div className="ai-risk-approved">
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Deterministic checks approved this intent.</strong>
                    <span>The approved quantity is {fmt(result.proposedSize, 8)}.</span>
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="ai-gate-grid">
            <Link href="/risk" className={result.decisionStatus === "APPROVE" ? "ready" : ""}>
              <Gauge size={17} />
              <div><strong>Risk authority</strong><span>{result.decisionStatus}</span></div>
              <ArrowRight size={14} />
            </Link>
            <Link href="/connections">
              <Cable size={17} />
              <div><strong>Live account</strong><span>Manage exchange connection</span></div>
              <ArrowRight size={14} />
            </Link>
            <Link href="/paper" className={paperReady ? "ready" : ""}>
              <ShieldCheck size={17} />
              <div><strong>Paper account</strong><span>{paperReady ? "Ready" : "Create first"}</span></div>
              <ArrowRight size={14} />
            </Link>
          </section>

          <div className="ai-intent-actions">
            {result.decisionStatus === "APPROVE" && result.tradeAction !== "NO_TRADE" ? (
              <button type="button" onClick={() => void executePaper()} disabled={paperLoading || !paperReady}>
                {paperLoading ? <LoaderCircle size={16} className="spin-icon" /> : <Play size={16} />}
                {paperLoading ? "Executing simulation…" : paperReady ? "Execute Paper Trade" : "Create Paper Account First"}
              </button>
            ) : (
              <span className="ai-no-execution">Execution unavailable: deterministic risk did not approve this intent.</span>
            )}

            <Link href={"/trade?symbol=" + encodeURIComponent(symbol)}>
              Open live terminal <ArrowRight size={15} />
            </Link>
          </div>

          {paper ? (
            <div className="route-success paper-execution-success">
              <CheckCircle2 size={16} />
              Paper order filled at {fmt(paper.fillPrice, 8)} · quantity {fmt(paper.quantity, 8)} · fee {fmt(paper.fee, 8)}.
            </div>
          ) : null}

          <div className="ai-engine-disclosure">
            <Bot size={15} />
            <div>
              <strong>What “AI” means on this screen</strong>
              <span>
                The active path is a locally trained quantitative classifier plus deterministic risk.
                It is real computation on current market history. The broader specialist-AI ensemble
                from the master blueprint is still being built and is not mislabeled as complete.
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="ai-workbench-empty">
          <BrainCircuit size={30} />
          <strong>Pick a market and run the model.</strong>
          <span>
            You can launch this screen directly from any centralized-market row. The analysis will
            create a TradeIntent and a deterministic risk decision.
          </span>
        </div>
      )}
    </section>
  );
}
