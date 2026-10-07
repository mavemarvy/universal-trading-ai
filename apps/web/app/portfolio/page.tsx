import Link from "next/link";
import { ArrowRight, CircleDollarSign, PieChart, Plus, TrendingUp, Wallet } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";
import { createPortfolio } from "./actions";

function money(value: string | number | null | undefined, currency = "USD") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, userId, displayName, notificationCount } = await requireUser();

  const [
    { data: portfolios },
    { data: allocations },
    { data: paper },
    { data: positions },
  ] = await Promise.all([
    supabase
      .from("portfolios")
      .select("id,name,base_currency,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("portfolio_allocations")
      .select("id,portfolio_id,asset_key,target_pct")
      .eq("user_id", userId)
      .order("asset_key"),
    supabase
      .from("paper_accounts")
      .select("id,name,base_currency,starting_equity,current_equity")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("positions")
      .select("id,status")
      .eq("user_id", userId),
  ]);

  const activePositions = (positions ?? []).filter(
    (position: any) => String(position.status).toUpperCase() === "OPEN"
  );
  const primaryPaper = paper?.[0] ?? null;

  return (
    <TradingAppShell
      active="portfolio"
      title="Portfolio"
      subtitle="Allocation and capital context"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero compact warm-tone">
        <div>
          <span>PORTFOLIO ENGINE</span>
          <h2>See capital, exposure and allocation in one place.</h2>
          <p>
            Portfolio context feeds the deterministic risk engine so every new trade is evaluated
            against total exposure, not in isolation.
          </p>
        </div>
        <Wallet size={34} />
      </section>

      {query.created ? (
        <div className="route-success">
          <Wallet size={16} /> Portfolio created.
        </div>
      ) : null}
      {query.error ? (
        <div className="route-error">
          <Wallet size={16} /> Portfolio could not be created.
        </div>
      ) : null}

      <div className="route-metric-grid">
        <article>
          <span>Portfolios</span>
          <strong>{portfolios?.length ?? 0}</strong>
        </article>
        <article>
          <span>Open positions</span>
          <strong>{activePositions.length}</strong>
        </article>
        <article>
          <span>Paper equity</span>
          <strong>
            {primaryPaper
              ? money(primaryPaper.current_equity, primaryPaper.base_currency)
              : "Not created"}
          </strong>
        </article>
      </div>

      <section className="portfolio-action-grid">
        <Link href="/paper">
          <span><CircleDollarSign size={18} /></span>
          <div>
            <strong>Paper trading</strong>
            <small>Create a simulation account before live execution.</small>
          </div>
          <ArrowRight size={16} />
        </Link>
        <Link href="/risk">
          <span><TrendingUp size={18} /></span>
          <div>
            <strong>Set risk limits</strong>
            <small>Define capital and exposure boundaries.</small>
          </div>
          <ArrowRight size={16} />
        </Link>
      </section>

      <section className="route-split">
        <div className="route-panel">
          <div className="route-panel-title">
            <Wallet size={18} />
            <h3>Your portfolios</h3>
          </div>

          {(portfolios ?? []).map((portfolio: any) => (
            <article className="route-list-row" key={portfolio.id}>
              <div>
                <strong>{portfolio.name}</strong>
                <span>Base currency {portfolio.base_currency}</span>
              </div>
              <b>
                {(allocations ?? []).filter(
                  (allocation: any) => allocation.portfolio_id === portfolio.id
                ).length}{" "}
                rules
              </b>
            </article>
          ))}

          {!portfolios?.length ? (
            <div className="portfolio-create-empty">
              <div className="route-empty">
                <Wallet size={24} />
                <strong>No portfolio yet</strong>
                <span>Create one now. It will be stored in your production Supabase account.</span>
              </div>
              <form className="portfolio-create-form">
                <input name="name" placeholder="Main Portfolio" aria-label="Portfolio name" />
                <select name="base_currency" defaultValue="USD" aria-label="Base currency">
                  <option value="USD">USD</option>
                  <option value="USDT">USDT</option>
                  <option value="NGN">NGN</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <button formAction={createPortfolio} className="route-action primary">
                  <Plus size={16} /> Create portfolio
                </button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="route-panel">
          <div className="route-panel-title">
            <PieChart size={18} />
            <h3>Target allocations</h3>
          </div>

          {(allocations ?? []).map((allocation: any) => (
            <article className="route-list-row" key={allocation.id}>
              <div>
                <strong>{allocation.asset_key}</strong>
                <span>Target allocation</span>
              </div>
              <b>{allocation.target_pct}%</b>
            </article>
          ))}

          {!allocations?.length ? (
            <div className="route-empty">
              <PieChart size={24} />
              <strong>No target allocations yet</strong>
              <span>
                Allocation rules will appear here when you assign target exposure to a portfolio.
              </span>
            </div>
          ) : null}
        </div>
      </section>
    </TradingAppShell>
  );
}
