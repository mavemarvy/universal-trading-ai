# Implementation Status

## Foundation initialized

- GitHub monorepo structure and shared contracts.
- Separate Next.js user and admin applications.
- Supabase SSR/browser client utilities and route protection foundation.
- Production database schema, explicit Data API grants, RLS, admin RBAC foundation, audit framework and health RPC.
- Versioned TradeIntent/platform capability contracts.
- Deterministic Python risk, portfolio, execution-gate and profit-protection cores with unit tests.
- Python FastAPI service skeletons for AI/intelligence domains.
- Universal platform-adapter interface and fail-closed capability registry seeds.
- CI, CodeQL, Dependabot, CODEOWNERS and security documentation.
- Vercel production projects created from the same GitHub repository:
  - `universal-trading-ai-web` with root `apps/web`.
  - `universal-trading-ai-admin` with root `apps/admin`.
- Both Vercel projects are connected to `universal-trading-ai-prod` using the public Supabase project URL and modern publishable key.
- User and admin Supabase health routes return HTTP 200 against production.
- Admin sign-in uses the shared Supabase identity.
- Active admin membership is enforced server-side.
- `SUPER_ADMIN` is mapped to all current admin permissions.
- TOTP enrollment/challenge/verification is implemented for admin AAL2 step-up authentication.
- The first requested administrator identity has an active `SUPER_ADMIN` membership. Its email confirmation is still pending.
- The second requested administrator identity is not yet present in Supabase Auth and must complete the normal signup flow before it can be granted an admin membership.

## Security follow-up

- Supabase Security Advisor currently reports that leaked-password protection is disabled. Enable leaked-password protection in Supabase Auth before declaring authentication production-hardened.
- Do not place user passwords, service-role keys, or provider secrets in Git, frontend variables, or database plaintext.
- Admin accounts should use MFA before privileged control-plane access.

## Deliberately not claimed as complete

External live market-data feeds, broker/exchange credentials, live adapters, model training, on-chain providers, news providers, Telegram credentials, mobile app parity, historical datasets and unrestricted live automation are not configured. They remain SCAFFOLDED/BLOCKED/NOT_STARTED in `FEATURE_REGISTRY.md` until real providers and tests exist.

The Vercel frontend deployments are live, but the overall Universal Trading AI platform is still under active implementation and must not be described as fully production-ready yet.
