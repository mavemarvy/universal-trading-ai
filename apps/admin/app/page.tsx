import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="shell">
      <span className="badge">SEPARATE ADMIN SURFACE</span>
      <h1 className="text-4xl font-semibold mt-4">Universal Trading AI Admin</h1>
      <p className="muted mt-3 max-w-3xl">
        Authorization is enforced server-side and by Supabase RLS. Signing in
        only establishes identity; privileged access additionally requires an
        active admin membership and any required MFA level.
      </p>
      <div className="mt-6 flex gap-3">
        <Link className="button inline-block" href="/login">
          Admin sign-in
        </Link>
        <Link className="button inline-block" href="/dashboard">
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
