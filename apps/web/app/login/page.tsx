import { login, signup } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="shell">
      <div className="card max-w-md mx-auto">
        <h1 className="text-2xl font-semibold">Account access</h1>
        <p className="muted mt-2">New accounts start in Analysis/Paper mode.</p>

        {query.error ? (
          <p role="alert" className="mt-3 text-sm">
            {query.error}
          </p>
        ) : null}

        {query.message ? (
          <p role="status" className="mt-3 text-sm">
            {query.message}
          </p>
        ) : null}

        <form className="mt-6 space-y-3">
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
          />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            minLength={8}
            required
          />
          <div className="flex gap-2">
            <button formAction={login}>Sign in</button>
            <button formAction={signup}>Create account</button>
          </div>
        </form>
      </div>
    </main>
  );
}
