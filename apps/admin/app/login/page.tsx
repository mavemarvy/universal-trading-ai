import Link from "next/link";
import { login } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="shell">
      <div className="card max-w-md mx-auto">
        <span className="badge">ADMIN ACCESS</span>
        <h1 className="text-2xl font-semibold mt-4">Admin sign-in</h1>
        <p className="muted mt-2">
          Use the shared Supabase identity. Access is granted only after the
          server verifies an active admin membership and any required MFA level.
        </p>

        {query.error ? (
          <p role="alert" className="mt-4 text-sm">
            {query.error}
          </p>
        ) : null}

        <form className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm muted">Email</span>
            <input
              className="mt-1"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm muted">Password</span>
            <input
              className="mt-1"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              minLength={8}
              required
            />
          </label>

          <button className="w-full" formAction={login}>
            Sign in securely
          </button>
        </form>

        <p className="muted text-sm mt-4">
          There is no admin self-registration. An existing account must have an
          active server-side admin membership.
        </p>

        <Link className="inline-block mt-5 text-sm" href="/">
          Back to admin home
        </Link>
      </div>
    </main>
  );
}
