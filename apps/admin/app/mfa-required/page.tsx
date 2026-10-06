export default function MfaRequiredPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-semibold">Multi-factor authentication required</h1>
      <p className="mt-4 text-zinc-600">This administrator account requires an AAL2 session before privileged access is permitted. Complete MFA in the authentication flow and try again.</p>
    </main>
  );
}
