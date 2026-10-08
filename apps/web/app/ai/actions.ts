"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

function msg(value: unknown) {
  return encodeURIComponent(String(value ?? "Request failed").slice(0, 180));
}

export async function runQuantAnalysis(formData: FormData) {
  const { supabase } = await requireUser();
  const symbol = String(formData.get("symbol") ?? "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const timeframe = String(formData.get("timeframe") ?? "15m");

  const { data, error } = await supabase.functions.invoke("quant-trade-analysis", {
    body: { action: "analyze", symbol, timeframe },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/ai?error=" + msg(data?.error || error?.message || "Analysis failed") + "&symbol=" + encodeURIComponent(symbol));
  }

  revalidatePath("/ai");
  revalidatePath("/journal");
  redirect(
    "/ai?analysis=1&intent=" +
      encodeURIComponent(data.intentId) +
      "&symbol=" +
      encodeURIComponent(symbol)
  );
}

export async function executePaperIntent(formData: FormData) {
  const { supabase } = await requireUser();
  const intentId = String(formData.get("intent_id") ?? "");

  const { data, error } = await supabase.functions.invoke("quant-trade-analysis", {
    body: { action: "paper_execute", intentId },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/ai?error=" + msg(data?.error || error?.message || "Paper execution failed") + "&intent=" + encodeURIComponent(intentId));
  }

  revalidatePath("/ai");
  revalidatePath("/paper");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  redirect("/ai?paper=1&intent=" + encodeURIComponent(intentId));
}
