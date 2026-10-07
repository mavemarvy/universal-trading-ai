import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bitcoin,
  Bot,
  BrainCircuit,
  Cable,
  CandlestickChart,
  CircleDollarSign,
  Gauge,
  Globe2,
  Landmark,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveMarketStream } from "@/components/live-market-stream";

const markets = [
  ["Crypto", Bitcoin],
  ["Forex", Landmark],
  ["Stocks", TrendingUp],
  ["Futures", CandlestickChart],
  ["Memecoins", Radar],
  ["Bots", Bot],
] as const;

const flow = [
  ["01", "Evidence", "Market, news and on-chain truth"],
  ["02", "AI TradeIntent", "Structured opportunity proposal"],
  ["03", "Risk Authority", "Deterministic approve / modify / reject"],
  ["04", "Execution", "Only where platform policy permits"],
] as const;

export default async function Home() {
  const supabase = await createClient();
  const [{ data: claims }, healthResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("api_health"),
  ]);

  const signedIn = Boolean(claims?.claims?.sub);
  const health = healthResult.data as
    | { ok?: boolean; database_time?: string; schema?: string }
    | null;

  return (
    <main className="public-exchange">
      <header className="public-nav">
        <Link href="/" className="public-brand" aria-label="Universal Trading AI home">
          <span className="public-brand-icon"><Zap size={17} /></span>
          <span><b>UTAI</b><small>Universal Trading AI</small></span>
        </Link>

        <nav className="public-nav-links" aria-label="Public navigation">
          <a href="#markets">Markets</a>
          <a href="#ai">AI Trading</a>
          <a href="#risk">Risk</a>
          <a href="#platforms">Platforms</a>
        </nav>

        <div className="public-nav-actions">
          <span className={health?.ok ? "public-health online" : "public-health"}>
            <i /> {health?.ok ? "SYSTEM ONLINE" : "SYSTEM CHECK"}
          </span>
          <Link className="public-login-link" href={signedIn ? "/dashboard" : "/login"}>
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-hero-copy">
          <div className="public-kicker">
            <Sparkles size={14} />
            AI-ASSISTED MULTI-MARKET TRADING
          </div>
          <h1>
            Trade with <span>intelligence</span>,
            <br />not impulse.
          </h1>
          <p>
            One operating system for market evidence, AI trade ideas, portfolio
            context, deterministic risk, paper trading and policy-aware execution.
          </p>

          <div className="public-hero-actions">
            <Link className="public-primary" href={signedIn ? "/dashboard" : "/login"}>
              {signedIn ? "Open trading app" : "Start in paper mode"}
              <ArrowRight size={16} />
            </Link>
            <a className="public-secondary" href="#ai">
              <BrainCircuit size={16} />
              See how AI decisions flow
            </a>
          </div>

          <div className="public-trust-row">
            <span><ShieldCheck size={14} /> Deterministic risk authority</span>
            <span><CircleDollarSign size={14} /> Paper-first onboarding</span>
            <span><Cable size={14} /> Multi-platform architecture</span>
          </div>
        </div>

        <div className="public-terminal-preview" aria-label="Trading terminal preview">
          <div className="preview-top">
            <div>
              <span>AI TERMINAL</span>
              <strong>Market intelligence</strong>
            </div>
            <span className="preview-live"><i /> ANALYSIS MODE</span>
          </div>

          <div className="preview-symbol-row">
            <div className="preview-symbol">
              <span className="coin-orb"><Bitcoin size={18} /></span>
              <div><strong>BTC / USDT</strong><small>Reference workspace</small></div>
            </div>
            <div className="preview-price">
              <strong>—</strong>
              <span>LIVE FEED REQUIRED</span>
            </div>
          </div>

          <div className="preview-chart">
            <div className="preview-chart-grid" />
            <div className="preview-candles">
              <i style={{height:"24%"}} /><i style={{height:"43%"}} /><i style={{height:"31%"}} />
              <i style={{height:"58%"}} /><i style={{height:"48%"}} /><i style={{height:"66%"}} />
              <i style={{height:"52%"}} /><i style={{height:"73%"}} /><i style={{height:"61%"}} />
              <i style={{height:"82%"}} /><i style={{height:"68%"}} /><i style={{height:"76%"}} />
            </div>
            <div className="preview-ai-node">
              <BrainCircuit size={20} />
              <span>AI</span>
            </div>
          </div>

          <div className="preview-bottom">
            <span><b>Signal</b> Waiting for evidence</span>
            <span><b>Risk</b> Fail-closed</span>
            <span><b>Execution</b> Locked</span>
          </div>
        </div>
      </section>

      <LiveMarketStream compact />

      <section className="public-ticker" aria-label="Supported market categories">
        <div className="public-ticker-track">
          {[...markets, ...markets].map(([name, Icon], index) => (
            <span key={`${name}-${index}`}><Icon size={14} /> {name}</span>
          ))}
        </div>
      </section>

      <section className="public-market-section" id="markets">
        <div className="public-section-head">
          <div>
            <span>MARKET UNIVERSE</span>
            <h2>Built for more than one venue.</h2>
          </div>
          <p>
            The interface is ready for multi-market routing while live provider
            data remains disabled until verified.
          </p>
        </div>

        <div className="public-market-grid">
          {markets.map(([name, Icon]) => (
            <article key={name}>
              <span className="public-market-icon"><Icon size={20} /></span>
              <div><strong>{name}</strong><small>Provider required</small></div>
              <ArrowRight size={16} />
            </article>
          ))}
        </div>
      </section>

      <section className="public-ai-section" id="ai">
        <div className="public-ai-copy">
          <span className="public-kicker"><BrainCircuit size={14} /> AI WITH GUARDRAILS</span>
          <h2>The AI can propose. It cannot bypass risk.</h2>
          <p>
            Every opportunity is converted into a structured TradeIntent and must
            pass portfolio context, deterministic limits and platform capability
            policy before execution is even considered.
          </p>
          <div className="public-ai-stats">
            <div><strong>1</strong><span>Evidence layer</span></div>
            <div><strong>1</strong><span>Risk authority</span></div>
            <div><strong>0</strong><span>Withdrawal permissions required</span></div>
          </div>
        </div>

        <div className="public-flow">
          {flow.map(([number, title, note], index) => (
            <div className="public-flow-row" key={number}>
              <span>{number}</span>
              <div><strong>{title}</strong><small>{note}</small></div>
              {index < flow.length - 1 ? <i /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="public-feature-strip" id="risk">
        <article>
          <span><Gauge size={20} /></span>
          <strong>Risk before execution</strong>
          <p>Hard limits, kill switches, exposure and capability checks stay outside the AI model.</p>
        </article>
        <article>
          <span><Wallet size={20} /></span>
          <strong>Portfolio-aware decisions</strong>
          <p>Positions and correlated exposure are considered before another trade is allowed.</p>
        </article>
        <article id="platforms">
          <span><Globe2 size={20} /></span>
          <strong>Universal adapters</strong>
          <p>One normalized interface for approved brokers, exchanges and supported chains.</p>
        </article>
      </section>

      <section className="public-cta">
        <div>
          <span className="public-kicker"><Activity size={14} /> PRODUCTION BACKEND CONNECTED</span>
          <h2>Start with analysis. Prove it in paper. Scale only when verified.</h2>
        </div>
        <Link className="public-primary" href={signedIn ? "/dashboard" : "/login"}>
          {signedIn ? "Go to dashboard" : "Create / access account"}
          <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="public-footer">
        <span>Universal Trading AI</span>
        <span>{health?.schema || "Backend connected"} · No guaranteed profits</span>
      </footer>

      <nav className="public-mobile-nav" aria-label="Mobile public navigation">
        <a href="#markets"><CandlestickChart size={20} /><span>Markets</span></a>
        <a href="#ai"><BrainCircuit size={20} /><span>AI</span></a>
        <Link className="mobile-main-cta" href={signedIn ? "/dashboard" : "/login"}>
          <Zap size={21} /><span>{signedIn ? "Trade" : "Start"}</span>
        </Link>
        <a href="#risk"><Gauge size={20} /><span>Risk</span></a>
        <Link href={signedIn ? "/dashboard#portfolio" : "/login"}><Wallet size={20} /><span>Assets</span></Link>
      </nav>
    </main>
  );
}
