import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminIdentity() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("admin_memberships")
    .select("id,status,admin_role_id,mfa_required")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!membership) redirect("/unauthorized");

  return { supabase, userId, membership };
}

export async function requireAdmin() {
  const context = await requireAdminIdentity();

  if (context.membership.mfa_required) {
    const { data: aal, error: aalError } =
      await context.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError || aal?.currentLevel !== "aal2") {
      redirect("/mfa-required");
    }
  }

  return context;
}

export async function requireAdminPermission(permissionKey: string) {
  const context = await requireAdmin();

  const { data, error } = await context.supabase
    .from("admin_role_permissions")
    .select("admin_permissions!inner(permission_key)")
    .eq("admin_role_id", context.membership.admin_role_id);

  if (error) redirect("/unauthorized");

  const allowed = (data ?? []).some(
    (row: any) => row.admin_permissions?.permission_key === permissionKey
  );

  if (!allowed) redirect("/unauthorized");
  return context;
}
