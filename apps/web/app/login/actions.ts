"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function appUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function friendlyAuthError(message: string, code?: string) {
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "Email not confirmed. Open the confirmation email from Supabase, or use Resend confirmation below.";
  }
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(message)) {
    return "Confirmation email rate limit reached. Wait about a minute before trying again. If the project-wide email quota is exhausted, try again later.";
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "Invalid email or password.";
  }
  return message;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        friendlyAuthError(error.message, error.code)
      )}&email=${encodeURIComponent(email)}`
    );
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        friendlyAuthError(error.message, error.code)
      )}&email=${encodeURIComponent(email)}`
    );
  }

  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Account created. Check your email and confirm the address before signing in."
      )}&email=${encodeURIComponent(email)}`
    );
  }

  redirect("/dashboard");
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    redirect("/login?error=Enter%20your%20email%20address%20first.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${appUrl()}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        friendlyAuthError(error.message, error.code)
      )}&email=${encodeURIComponent(email)}`
    );
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "A new confirmation email was requested. Check your inbox and spam folder."
    )}&email=${encodeURIComponent(email)}`
  );
}
