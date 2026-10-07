import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  KeyRound,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  UserCog,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { login } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const healthResult = await supabase.rpc("api_health");
  const health = healthResult.data as { ok?: boolean } | null;

  return (
    <main className="admin-auth-gateway">
      <section className="admin-auth-story">
        <Link href="/" className="admin-auth-back">
          <ArrowLeft size={15} /> Back to control gateway
        </Link>

        <div className="admin-auth-brand">
          <span><Zap size={18} /></span>
          <div>
            <strong>UTAI CONTROL</strong>
            <small>Privileged operations</small>
          </div>
        </div>

        <div className="admin-auth-copy">
          <span><ShieldCheck size={13} /> SERVER-ENFORCED ADMINISTRATION</span>
          <h1>Identity proves who you are. It does not grant privilege.</h1>
          <p>
            Every administrative request still requires an active admin membership,
            server-side permission checks and MFA step-up when configured.
          </p>
        </div>

        <div className="admin-auth-security-grid">
          <article><UserCog size={18} /><div><strong>Membership</strong><span>Active admin role required</span></div></article>
          <article><LockKeyhole size={18} /><div><strong>MFA</strong><span>AAL2 enforced when required</span></div></article>
          <article><ScrollText size={18} /><div><strong>Audit</strong><span>Privileged activity recorded</span></div></article>
          <article><Database size={18} /><div><strong>RLS</strong><span>Database remains authoritative</span></div></article>
        </div>

        <div className={health?.ok ? "admin-auth-health online" : "admin-auth-health"}>
          <i /> {health?.ok ? "Production database online" : "Checking backend"}
        </div>
      </section>

      <section className="admin-auth-form-wrap">
        <div className="admin-auth-card">
          <div className="admin-auth-head">
            <span><KeyRound size={20} /></span>
            <div>
              <p>CONTROL PLANE ACCESS</p>
              <h2>Administrator sign-in</h2>
              <small>No self-registration. Existing membership only.</small>
            </div>
          </div>

          {query.error ? (
            <div className="admin-auth-alert" role="alert">
              {query.error}
            </div>
          ) : null}

          <form className="admin-auth-form">
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                minLength={8}
                required
              />
            </label>

            <button formAction={login}>
              Authenticate <ArrowRight size={16} />
            </button>
          </form>

          <div className="admin-auth-boundary">
            <ShieldCheck size={15} />
            <p>
              Successful password authentication still does not bypass admin membership,
              permission mapping or required MFA.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
