# Universal Trading AI

Production-oriented monorepo for a multi-market AI-assisted trading operating system. The system is intentionally **paper/analysis first**. AI services create evidence-backed `TradeIntent` objects; they cannot directly send orders. Deterministic portfolio, risk, platform-capability, and execution-policy layers must approve any live action.

## Monorepo

- `apps/web` — user web application (future Vercel project `universal-trading-ai-web`).
- `apps/admin` — separate admin application (future Vercel project `universal-trading-ai-admin`).
- `apps/telegram-mini-app`, `apps/telegram-bot`, `apps/mobile` — shared-backend client surfaces.
- `services/*` — persistent AI, market-data, intelligence, risk, portfolio, execution, and profit-protection services.
- `packages/*` — versioned TypeScript contracts, platform registry, validation, UI, API and trading-core packages.
- `supabase/*` — reproducible migrations, seeds, function/config documentation.
- `infrastructure/*` — persistent-compute deployment placeholders; never put always-on execution loops in Vercel/Supabase Edge Functions.

## Safety invariants

1. New users default to `ANALYSIS` / paper-first operation.
2. AI never directly calls exchange/broker execution APIs.
3. Withdrawal permission is never required for ordinary automated trading connections.
4. `TradeIntent -> Portfolio -> Deterministic Risk -> Capability -> Execution Policy -> Adapter` is mandatory.
5. COPILOT/UNSUPPORTED platforms cannot receive automated orders.
6. Kill switches and hard limits do not depend on an LLM.
7. Platform credentials are stored only as encrypted secret-manager references, never plaintext browser/database values.

## Local development

1. Copy `.env.example` to `.env.local` in `apps/web` and `apps/admin` and supply the project URL + publishable key.
2. Keep server-only secrets outside the repository.
3. Install Node 22+ and pnpm 12.9.1.
4. `pnpm install`
5. `pnpm typecheck`
6. `python3 -m pytest -q tests/unit tests/integration`
7. `pnpm build`

## Supabase

Production project: `universal-trading-ai-prod`.

Migrations use explicit Data API grants and RLS. The public API health RPC intentionally exposes only database time/schema readiness and no private data.

## Vercel — intentionally not deployed yet

- `universal-trading-ai-web` -> root directory `apps/web`
- `universal-trading-ai-admin` -> root directory `apps/admin`

Both must use this same repository and the same Supabase production project.

See `FEATURE_REGISTRY.md`, `implementation-status.md`, and `docs/` for current scope and limitations.
