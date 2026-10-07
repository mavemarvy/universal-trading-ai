# Deployment

## Vercel frontends

The GitHub repository `mavemarvy/universal-trading-ai` is imported into two independent Vercel projects.

| Vercel project | Root directory | Purpose |
| --- | --- | --- |
| `universal-trading-ai-web` | `apps/web` | User-facing web application |
| `universal-trading-ai-admin` | `apps/admin` | Separate privileged admin surface |

Both projects use the same Supabase production project: `universal-trading-ai-prod`.

Required public frontend environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose a Supabase secret/service-role key through a `NEXT_PUBLIC_` variable.

## Persistent services

The Python/FastAPI services under `services/` are not automatically treated as Vercel frontends. Always-on trading execution, market-data ingestion, intelligence workers, and background processing require persistent compute and must be deployed separately when their provider integrations are ready.

## Production verification

The web and admin production deployments must both pass:

1. Vercel build/type checking.
2. `/api/health/supabase` returns HTTP 200.
3. Supabase health RPC reports `ok: true`.
4. User authentication works against Supabase Auth.
5. Admin access rejects identities without an active admin membership.
6. Admin accounts with `mfa_required = true` must reach AAL2 before privileged access.
