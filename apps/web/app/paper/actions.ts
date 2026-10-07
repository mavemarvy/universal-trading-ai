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
