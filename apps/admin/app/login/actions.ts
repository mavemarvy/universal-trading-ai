"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function friendlyAuthError(message: string, code?: string) {
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "Email not confirmed. Confirm the account from the email sent by Supabase, then sign in again.";
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "Invalid email or password.";
  }
  return message;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=Email%20and%20password%20are%20required");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        friendlyAuthError(error.message, error.code)
      )}`
    );
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
