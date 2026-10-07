import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("display_name,onboarding_complete").eq("id", userId).maybeSingle(),
    supabase.from("notifications").select("id").eq("user_id", userId).is("read_at", null),
  ]);

  return {
    supabase,
    userId,
    displayName: profile?.display_name || "Trader",
    onboardingComplete: Boolean(profile?.onboarding_complete),
    notificationCount: notifications?.length ?? 0,
  };
}
