"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

function message(value: unknown) {
  return encodeURIComponent(String(value ?? "Connection failed").slice(0, 180));
}

export async function connectExchange(formData: FormData) {
  const { supabase } = await requireUser();

  const platform = String(formData.get("platform") ?? "").toUpperCase();
  const apiKey = String(formData.get("api_key") ?? "").trim();
  const apiSecret = String(formData.get("api_secret") ?? "").trim();
  const passphrase = String(formData.get("passphrase") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const environment = String(formData.get("environment") ?? "LIVE").toUpperCase();
  const region = String(formData.get("region") ?? "GLOBAL").toUpperCase();

  if (!["BYBIT", "BINANCE", "OKX"].includes(platform)) {
    redirect("/connections?error=" + message("That exchange connector is not active yet."));
  }
  if (!apiKey || !apiSecret) {
    redirect("/connections?error=" + message("API key and secret are required."));
  }

  const { data, error } = await supabase.functions.invoke("exchange-connection", {
    body: {
      action: "connect",
      platform,
      apiKey,
      apiSecret,
      passphrase,
      label,
      environment,
      region,
    },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/connections?error=" + message(data?.error || error?.message || "Connection verification failed."));
  }

  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/ai");
  redirect("/connections?connected=" + encodeURIComponent(platform));
}

export async function disconnectExchange(formData: FormData) {
  const { supabase } = await requireUser();
  const connectionId = String(formData.get("connection_id") ?? "");

  const { data, error } = await supabase.functions.invoke("exchange-connection", {
    body: { action: "disconnect", connectionId },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/connections?error=" + message(data?.error || error?.message || "Disconnect failed."));
  }

  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/ai");
  redirect("/connections?disconnected=1");
}


export async function refreshExchange(formData: FormData) {
  const { supabase } = await requireUser();
  const connectionId = String(formData.get("connection_id") ?? "");

  const { data, error } = await supabase.functions.invoke("exchange-connection", {
    body: { action: "refresh", connectionId },
  });

  if (error || data?.error || data?.ok !== true) {
    redirect("/connections?error=" + message(data?.error || error?.message || "Account refresh failed."));
  }

  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/ai");
  revalidatePath("/portfolio");
  redirect("/connections?refreshed=1");
}
