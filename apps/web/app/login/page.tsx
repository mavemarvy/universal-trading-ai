import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CandlestickChart,
  CircleDollarSign,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { login, resendConfirmation, signup } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; email?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const healthResult = await supabase.rpc("api_health");
  const health = healthResult.data as { ok?: boolean } | null;

  return (
    <main className="auth-gateway">
      <section className="auth-gateway-story">
        <Link href="/" className="auth-back-link">
          <ArrowLeft size={15} /> Back
        </Link>

        <div className="auth-brand">
          <span><Zap size={18} /></span>
          <div>
            <strong>UTAI</strong>
            <small>Universal Trading AI</small>
          </div>
        </div>

        <div className="auth-story-copy">
          <span className="auth-kicker"><Sparkles size={13} /> ANALYSIS / PAPER FIRST</span>
          <h1>One account for the entire trading operating system.</h1>
          <p>
            Sign in to live public market data, AI readiness, deterministic risk,
            portfolio context and paper trading. Live execution remains locked until
            every required gate is actually ready.
          </p>
        </div>

        <div className="auth-story-grid">
          <article>
            <CandlestickChart size={18} />
            <div><strong>Live markets</strong><span>Public real-time market stream</span></div>
          </article>
          <article>
            <BrainCircuit size={18} />
            <div><strong>AI with guardrails</strong><span>TradeIntent, then independent risk</span></div>
          </article>
          <article>
            <CircleDollarSign size={18} />
            <div><strong>Paper first</strong><span>Simulate before real capital</span></div>
          </article>
          <article>
            <ShieldCheck size={18} />
            <div><strong>Fail-closed safety</strong><span>No fake “ready” state</span></div>
          </article>
        </div>

        <div className={health?.ok ? "auth-health online" : "auth-health"}>
          <i />
          {health?.ok ? "Production database online" : "Checking backend"}
        </div>
      </section>

      <section className="auth-gateway-form-wrap">
        <div className="auth-form-card">
          <div className="auth-form-head">
            <span className="auth-lock"><LockKeyhole size={19} /></span>
            <div>
              <span>ACCOUNT ACCESS</span>
              <h2>Welcome to UTAI</h2>
              <p>New accounts start in Analysis/Paper mode.</p>
            </div>
          </div>

          {query.error ? (
            <div role="alert" className="auth-alert error">
              {query.error}
            </div>
          ) : null}

          {query.message ? (
            <div role="status" className="auth-alert success">
              {query.message}
            </div>
          ) : null}

          <form className="auth-form">
            <label>
              <span><Mail size={14} /> Email address</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                defaultValue={query.email ?? ""}
                required
              />
            </label>

            <label>
              <span><LockKeyhole size={14} /> Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </label>

            <div className="auth-primary-actions">
              <button formAction={login} className="auth-primary-button">
                Sign in <ArrowRight size={16} />
              </button>
              <button formAction={signup} className="auth-secondary-button">
                Create account
              </button>
            </div>
          </form>

          <div className="auth-divider"><span>EMAIL CONFIRMATION</span></div>

          <form className="auth-resend-form">
            <input type="hidden" name="email" value={query.email ?? ""} />
            <button formAction={resendConfirmation} type="submit">
              Resend confirmation email
            </button>
          </form>

          <p className="auth-fineprint">
            Repeated confirmation attempts may be rate-limited by the email provider.
            UTAI never asks for broker passwords, wallet recovery credentials or withdrawal permissions here.
          </p>
        </div>
      </section>
    </main>
  );
}
