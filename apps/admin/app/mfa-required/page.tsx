import { requireAdminIdentity } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import MfaClient from "./mfa-client";

export default async function MfaRequiredPage() {
  const { membership } = await requireAdminIdentity();

  if (!membership.mfa_required) {
    return (
      <main className="shell">
        <div className="card max-w-xl mx-auto">
          <h1 className="text-3xl font-semibold">MFA is not required</h1>
          <p className="muted mt-3">
            This account can continue directly to the admin dashboard.
          </p>
          <a className="button inline-block mt-5" href="/dashboard">
            Continue
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card max-w-xl mx-auto">
        <span className="badge">STEP-UP AUTHENTICATION</span>
        <h1 className="text-3xl font-semibold mt-4">
          Multi-factor authentication required
        </h1>
        <p className="muted mt-3">
          Super-admin access requires an AAL2 session. Use a TOTP authenticator
          such as Google Authenticator, Microsoft Authenticator, 1Password, or
          another compatible app.
        </p>

        <MfaClient />

        <form action={logout} className="mt-6">
          <button type="submit">Sign out</button>
        </form>
      </div>
    </main>
  );
}
