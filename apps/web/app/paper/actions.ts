"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function createPaperAccount(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || "Primary Paper Account";
  const baseCurrency = String(formData.get("base_currency") ?? "USD").trim().toUpperCase().slice(0, 8) || "USD";
  const startingEquity = Number(String(formData.get("starting_equity") ?? "10000"));

  if (!Number.isFinite(startingEquity) || startingEquity < 0) {
    redirect("/paper?error=equity");
  }

  const { error } = await supabase.from("paper_accounts").insert({
    user_id: userId,
    name,
    base_currency: baseCurrency,
    starting_equity: startingEquity,
    current_equity: startingEquity,
  });

  if (error) redirect("/paper?error=create");

  revalidatePath("/paper");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  redirect("/paper?created=1");
}


export async function refreshPaperPosition(formData: FormData) {
  const { supabase } = await requireUser();
  const positionId = String(formData.get("position_id") ?? "");

  const { data, error } = await supabase.functions.invoke("quant-trade-analysis", {
    body: { action: "paper_refresh", positionId },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/paper?error=" + encodeURIComponent(String(data?.error || error?.message || "Position refresh failed").slice(0, 160)));
  }

  revalidatePath("/paper");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  redirect("/paper?refreshed=1");
}

export async function closePaperPosition(formData: FormData) {
  const { supabase } = await requireUser();
  const positionId = String(formData.get("position_id") ?? "");

  const { data, error } = await supabase.functions.invoke("quant-trade-analysis", {
    body: { action: "paper_close", positionId },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/paper?error=" + encodeURIComponent(String(data?.error || error?.message || "Position close failed").slice(0, 160)));
  }

  revalidatePath("/paper");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/journal");
  redirect("/paper?closed=1");
}
