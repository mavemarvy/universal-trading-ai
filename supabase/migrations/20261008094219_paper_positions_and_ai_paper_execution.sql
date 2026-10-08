create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_account_id uuid not null references public.paper_accounts(id) on delete cascade,
  trade_intent_id uuid references public.trade_intents(id) on delete set null,
  paper_order_id uuid references public.paper_orders(id) on delete set null,
  instrument_key text not null,
  side public.position_side not null,
  quantity numeric not null check (quantity > 0),
  entry_price numeric not null check (entry_price > 0),
  current_price numeric not null check (current_price > 0),
  unrealized_pnl numeric not null default 0,
  realized_pnl numeric not null default 0,
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.paper_positions enable row level security;
revoke all on table public.paper_positions from anon, authenticated;
grant select on public.paper_positions to authenticated;

drop policy if exists owner_select_paper_positions on public.paper_positions;
create policy owner_select_paper_positions
on public.paper_positions
for select
to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin());

create index if not exists paper_positions_user_status_idx
  on public.paper_positions(user_id,status);
