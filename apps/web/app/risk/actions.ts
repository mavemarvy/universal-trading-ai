"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

function optionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}`);
  return value;
}

export async function updateRiskSettings(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const mode = String(formData.get("mode") ?? "CONSERVATIVE").trim().toUpperCase();
  const allowedModes = new Set(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]);
  if (!allowedModes.has(mode)) redirect("/risk?error=mode");

  const profilePayload = {
    mode,
    trading_capital: optionalNumber(formData, "trading_capital"),
    max_acceptable_loss: optionalNumber(formData, "max_acceptable_loss"),
    profit_target: optionalNumber(formData, "profit_target"),
  };

  let { data: profile, error: profileReadError } = await supabase
    .from("risk_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileReadError) redirect("/risk?error=profile");

  if (!profile) {
    const created = await supabase
      .from("risk_profiles")
      .insert({ user_id: userId, ...profilePayload })
      .select("id")
      .single();

    if (created.error || !created.data) redirect("/risk?error=profile");
    profile = created.data;
  } else {
    const updated = await supabase
      .from("risk_profiles")
      .update(profilePayload)
      .eq("id", profile.id);

    if (updated.error) redirect("/risk?error=profile");
  }

  const limitsPayload = {
    max_risk_per_trade: optionalNumber(formData, "max_risk_per_trade"),
    max_daily_loss: optionalNumber(formData, "max_daily_loss"),
    max_drawdown: optionalNumber(formData, "max_drawdown"),
    max_leverage: optionalNumber(formData, "max_leverage"),
    max_positions: optionalNumber(formData, "max_positions"),
    max_correlated_exposure: optionalNumber(formData, "max_correlated_exposure"),
    max_platform_exposure: optionalNumber(formData, "max_platform_exposure"),
    max_asset_exposure: optionalNumber(formData, "max_asset_exposure"),
    max_memecoin_exposure: optionalNumber(formData, "max_memecoin_exposure"),
    max_slippage_bps: optionalNumber(formData, "max_slippage_bps"),
    min_confidence: optionalNumber(formData, "min_confidence"),
    min_expected_edge: optionalNumber(formData, "min_expected_edge"),
    max_spread_bps: optionalNumber(formData, "max_spread_bps"),
  };

  const existing = await supabase
    .from("risk_limits")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing.error) redirect("/risk?error=limits");

  if (existing.data) {
    const updated = await supabase
      .from("risk_limits")
      .update(limitsPayload)
      .eq("id", existing.data.id);

    if (updated.error) redirect("/risk?error=limits");
  } else {
    const created = await supabase
      .from("risk_limits")
      .insert({
        user_id: userId,
        risk_profile_id: profile.id,
        ...limitsPayload,
      });

    if (created.error) redirect("/risk?error=limits");
  }

  revalidatePath("/risk");
  revalidatePath("/dashboard");
  redirect("/risk?saved=1");
}
