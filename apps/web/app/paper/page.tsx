import Link from "next/link";
import { ArrowRight, CircleDollarSign, Plus, ReceiptText, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";
import { createPaperAccount } from "./actions";

function money(value: string | number | null | undefined, currency = "USD") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function PaperPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, userId, displayName, notificationCount } = await requireUser();

  const [{ data: accounts }, { data: orders }, { data: trades }] = await Promise.all([
    supabase
      .from("paper_accounts")
      .select("id,name,base_currency,starting_equity,current_equity,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("paper_orders")
      .select("id,instrument_key,side,order_type,quantity,requested_price,status,simulated_latency_ms,simulated_slippage_bps,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("paper_trades")
      .select("id,quantity,fill_price,fee,filled_at")
      .eq("user_id", userId)
      .order("filled_at", { ascending: false })
      .limit(30),
  ]);

  const primary = accounts?.[0] ?? null;

  return (
    <TradingAppShell
      active="portfolio"
      title="Paper Trading"
      subtitle="Simulation before bounded automation"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero compact green-tone">
        <div>
          <span>SIMULATION</span>
          <h2>Prove behavior before risking capital.</h2>
          <p>
            Paper orders preserve latency, slippage and fills separately from live execution,
            so strategy behavior can be observed before any real account is involved.
          </p>
        </div>
        <CircleDollarSign size={34} />
      </section>

      {query.created ? (
        <div className="route-success">
          <ShieldCheck size={16} /> Paper account created.
        </div>
      ) : null}
      {query.error ? (
        <div className="route-error">
          <CircleDollarSign size={16} /> Paper account could not be created.
        </div>
      ) : null}

      <div className="route-metric-grid">
        <article>
          <span>Paper accounts</span>
          <strong>{accounts?.length ?? 0}</strong>
        </article>
        <article>
          <span>Current equity</span>
          <strong>{primary ? money(primary.current_equity, primary.base_currency) : "—"}</strong>
        </article>
        <article>
          <span>Paper fills</span>
          <strong>{trades?.length ?? 0}</strong>
        </article>
      </div>

      {!accounts?.length ? (
        <section className="route-panel">
          <div className="route-panel-title">
            <Plus size={18} />
            <div>
              <h3>Create your first paper account</h3>
              <small>This creates a real simulation account record in your Supabase profile.</small>
            </div>
          </div>

          <form className="paper-account-form">
            <label>
              Account name
              <input name="name" placeholder="Primary Paper Account" />
            </label>
            <label>
              Starting equity
              <input name="starting_equity" type="number" min="0" step="0.01" defaultValue="10000" />
            </label>
            <label>
              Base currency
              <select name="base_currency" defaultValue="USD">
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
                <option value="NGN">NGN</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
            <button formAction={createPaperAccount} className="route-action primary">
              <Plus size={16} /> Create paper account
            </button>
          </form>
        </section>
      ) : (
        <section className="paper-account-grid">
          {(accounts ?? []).map((account: any) => (
            <article key={account.id}>
              <span>SIMULATION ACCOUNT</span>
              <strong>{account.name}</strong>
              <b>{money(account.current_equity, account.base_currency)}</b>
              <small>
                Started at {money(account.starting_equity, account.base_currency)} · {account.base_currency}
              </small>
            </article>
          ))}
        </section>
      )}

      <section className="route-panel">
        <div className="route-panel-title">
          <ReceiptText size={18} />
          <h3>Recent paper orders</h3>
        </div>

        {(orders ?? []).map((order: any) => (
          <article className="route-list-row" key={order.id}>
            <div>
              <strong>{order.instrument_key}</strong>
              <span>{order.side} · {order.order_type} · qty {order.quantity}</span>
              <small>
                Latency {order.simulated_latency_ms ?? "—"} ms · slippage{" "}
                {order.simulated_slippage_bps ?? "—"} bps
              </small>
            </div>
            <b>{order.status}</b>
          </article>
        ))}

        {!orders?.length ? (
          <div className="route-empty">
            <CircleDollarSign size={24} />
            <strong>No paper orders yet</strong>
            <span>
              Once the paper execution path receives an approved TradeIntent, simulated orders will
              appear here with latency, slippage and fill records.
            </span>
            <Link href="/ai" className="empty-cta">
              Review AI readiness <ArrowRight size={14} />
            </Link>
          </div>
        ) : null}
      </section>
    </TradingAppShell>
  );
}
