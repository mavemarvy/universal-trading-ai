import { login, resendConfirmation, signup } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; email?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="shell">
      <div className="card max-w-md mx-auto">
        <h1 className="text-2xl font-semibold">Account access</h1>
        <p className="muted mt-2">
          New accounts start in Analysis/Paper mode. Email confirmation is
          required before password sign-in.
        </p>

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
            defaultValue={query.email ?? ""}
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
          <div className="flex gap-2 flex-wrap">
            <button formAction={login}>Sign in</button>
            <button formAction={signup}>Create account</button>
          </div>
        </form>

        <form className="mt-5">
          <input
            type="hidden"
            name="email"
            value={query.email ?? ""}
          />
          <button formAction={resendConfirmation} type="submit">
            Resend confirmation
          </button>
        </form>

        <p className="muted text-sm mt-4">
          If confirmation emails stop arriving after repeated attempts, wait
          before retrying because Supabase applies email-send rate limits.
        </p>
      </div>
    </main>
  );
}
