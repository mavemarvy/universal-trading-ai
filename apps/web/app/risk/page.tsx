import { Gauge, Save, ShieldAlert, ShieldCheck } from "lucide-react";
import { TradingAppShell } from "@/components/trading-app-shell";
import { requireUser } from "@/lib/auth";
import { updateRiskSettings } from "./actions";

export default async function RiskPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, userId, displayName, notificationCount } = await requireUser();

  const [{ data: profile }, { data: limits }, { data: controls }, { data: kills }] =
    await Promise.all([
      supabase
        .from("risk_profiles")
        .select("id,mode,trading_capital,max_acceptable_loss,profit_target")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("risk_limits")
        .select(
          "max_risk_per_trade,max_daily_loss,max_drawdown,max_leverage,max_positions,max_correlated_exposure,max_platform_exposure,max_asset_exposure,max_memecoin_exposure,max_slippage_bps,min_liquidity,min_confidence,min_expected_edge,max_spread_bps"
        )
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("account_trading_controls")
        .select("id,suspended,mode,reason,updated_at")
        .eq("user_id", userId),
      supabase
        .from("kill_switches")
        .select("id,scope_type,scope_ref,mode,active,reason,activated_at")
        .eq("active", true),
    ]);

  const hardLimits = [
    ["Risk / trade", limits?.max_risk_per_trade],
    ["Daily loss", limits?.max_daily_loss],
    ["Drawdown", limits?.max_drawdown],
    ["Max leverage", limits?.max_leverage],
    ["Max positions", limits?.max_positions],
    ["Correlated exposure", limits?.max_correlated_exposure],
    ["Platform exposure", limits?.max_platform_exposure],
    ["Asset exposure", limits?.max_asset_exposure],
    ["Memecoin exposure", limits?.max_memecoin_exposure],
    ["Max slippage bps", limits?.max_slippage_bps],
    ["Min confidence", limits?.min_confidence],
    ["Min expected edge", limits?.min_expected_edge],
  ] as const;

  return (
    <TradingAppShell
      active="risk"
      title="Risk Center"
      subtitle="Hard authority over every trade"
      displayName={displayName}
      notificationCount={notificationCount}
    >
      <section className="route-hero compact risk-tone">
        <div>
          <span>DETERMINISTIC RISK</span>
          <h2>Set the boundaries before any strategy is allowed to act.</h2>
          <p>
            These limits are stored independently from model output. AI may propose a trade,
            but it cannot override this risk profile.
          </p>
        </div>
        <Gauge size={34} />
      </section>

      {query.saved ? (
        <div className="route-success">
          <ShieldCheck size={16} /> Risk settings saved.
        </div>
      ) : null}
      {query.error ? (
        <div className="route-error">
          <ShieldAlert size={16} /> Some risk settings could not be saved. Review the values and try again.
        </div>
      ) : null}

      <div className="route-metric-grid">
        <article>
          <span>Mode</span>
          <strong>{profile?.mode ?? "NOT SET"}</strong>
        </article>
        <article>
          <span>Trading capital</span>
          <strong>{profile?.trading_capital ?? "—"}</strong>
        </article>
        <article>
          <span>Active kill switches</span>
          <strong>{kills?.length ?? 0}</strong>
        </article>
      </div>

      <section className="route-panel risk-editor-panel">
        <div className="route-panel-title">
          <Gauge size={18} />
          <div>
            <h3>Configure deterministic limits</h3>
            <small>Decimals are stored exactly as entered. Example: 0.01 means 1% where the engine interprets a ratio.</small>
          </div>
        </div>

        <form className="risk-settings-form">
          <div className="risk-form-grid">
            <label>
              Risk mode
              <select name="mode" defaultValue={profile?.mode ?? "CONSERVATIVE"}>
                <option value="CONSERVATIVE">Conservative</option>
                <option value="BALANCED">Balanced</option>
                <option value="AGGRESSIVE">Aggressive</option>
              </select>
            </label>

            <label>
              Trading capital
              <input name="trading_capital" type="number" min="0" step="0.01" defaultValue={profile?.trading_capital ?? ""} />
            </label>

            <label>
              Max acceptable loss
              <input name="max_acceptable_loss" type="number" min="0" step="0.01" defaultValue={profile?.max_acceptable_loss ?? ""} />
            </label>

            <label>
              Profit target
              <input name="profit_target" type="number" min="0" step="0.01" defaultValue={profile?.profit_target ?? ""} />
            </label>

            <label>
              Max risk / trade
              <input name="max_risk_per_trade" type="number" min="0" step="0.001" defaultValue={limits?.max_risk_per_trade ?? ""} />
            </label>

            <label>
              Max daily loss
              <input name="max_daily_loss" type="number" min="0" step="0.001" defaultValue={limits?.max_daily_loss ?? ""} />
            </label>

            <label>
              Max drawdown
              <input name="max_drawdown" type="number" min="0" step="0.001" defaultValue={limits?.max_drawdown ?? ""} />
            </label>

            <label>
              Max leverage
              <input name="max_leverage" type="number" min="0" step="0.1" defaultValue={limits?.max_leverage ?? ""} />
            </label>

            <label>
              Max positions
              <input name="max_positions" type="number" min="0" step="1" defaultValue={limits?.max_positions ?? ""} />
            </label>

            <label>
              Max correlated exposure
              <input name="max_correlated_exposure" type="number" min="0" step="0.001" defaultValue={limits?.max_correlated_exposure ?? ""} />
            </label>

            <label>
              Max platform exposure
              <input name="max_platform_exposure" type="number" min="0" step="0.001" defaultValue={limits?.max_platform_exposure ?? ""} />
            </label>

            <label>
              Max asset exposure
              <input name="max_asset_exposure" type="number" min="0" step="0.001" defaultValue={limits?.max_asset_exposure ?? ""} />
            </label>

            <label>
              Max memecoin exposure
              <input name="max_memecoin_exposure" type="number" min="0" step="0.001" defaultValue={limits?.max_memecoin_exposure ?? ""} />
            </label>

            <label>
              Max slippage (bps)
              <input name="max_slippage_bps" type="number" min="0" step="0.1" defaultValue={limits?.max_slippage_bps ?? ""} />
            </label>

            <label>
              Max spread (bps)
              <input name="max_spread_bps" type="number" min="0" step="0.1" defaultValue={limits?.max_spread_bps ?? ""} />
            </label>

            <label>
              Minimum confidence
              <input name="min_confidence" type="number" min="0" step="0.001" defaultValue={limits?.min_confidence ?? ""} />
            </label>

            <label>
              Minimum expected edge
              <input name="min_expected_edge" type="number" min="0" step="0.001" defaultValue={limits?.min_expected_edge ?? ""} />
            </label>
          </div>

          <button formAction={updateRiskSettings} className="route-action primary risk-save-button">
            <Save size={16} /> Save risk policy
          </button>
        </form>
      </section>

      <section className="route-split">
        <div className="route-panel">
          <div className="route-panel-title">
            <ShieldCheck size={18} />
            <h3>Current hard limits</h3>
          </div>
          <div className="limit-grid">
            {hardLimits.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value ?? "Not set"}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="route-panel">
          <div className="route-panel-title">
            <ShieldAlert size={18} />
            <h3>Account controls</h3>
          </div>

          {(controls ?? []).map((control: any) => (
            <article className="route-list-row" key={control.id}>
              <div>
                <strong>{control.mode}</strong>
                <span>
                  {control.suspended ? "Suspended" : "Active"} · {control.reason || "No reason recorded"}
                </span>
              </div>
            </article>
          ))}

          {!controls?.length ? (
            <div className="route-empty">
              <ShieldCheck size={24} />
              <strong>No account override active</strong>
              <span>Normal deterministic policy remains in force.</span>
            </div>
          ) : null}
        </div>
      </section>
    </TradingAppShell>
  );
}
