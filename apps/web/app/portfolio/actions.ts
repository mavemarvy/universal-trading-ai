"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function createPortfolio(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || "Main Portfolio";
  const baseCurrency = String(formData.get("base_currency") ?? "USD").trim().toUpperCase().slice(0, 8) || "USD";

  const { error } = await supabase.from("portfolios").insert({
    user_id: userId,
    name,
    base_currency: baseCurrency,
  });

  if (error) redirect("/portfolio?error=create");

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  redirect("/portfolio?created=1");
}
