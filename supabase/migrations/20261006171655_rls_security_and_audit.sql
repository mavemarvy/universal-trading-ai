-- Security: RLS, explicit Data API grants, auth bootstrap, admin RBAC and audit.
create or replace function app_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.admin_memberships m where m.user_id=(select auth.uid()) and m.status='ACTIVE')
$$;
revoke all on function app_private.is_admin() from public;
grant execute on function app_private.is_admin() to authenticated;

create or replace function app_private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name')) on conflict do nothing;
 insert into public.user_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.user_roles(user_id,role_key) values(new.id,'USER') on conflict do nothing;
 insert into public.risk_profiles(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function app_private.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function app_private.handle_new_user();

create or replace function app_private.audit_row_change() returns trigger language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 rid=coalesce((case when tg_op='DELETE' then old.id else new.id end),gen_random_uuid());
 insert into public.audit_logs(actor_user_id,actor_db_role,action,table_name,row_id,old_data,new_data,correlation_id)
 values((select auth.uid()),current_user,tg_op,tg_table_name,rid,case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,nullif(current_setting('request.headers',true),'')::jsonb->>'x-correlation-id');
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function app_private.audit_row_change() from public,anon,authenticated;

do $$ declare r record; begin for r in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',r.tablename); end loop; end $$;
do $$ declare r record; begin for r in select tablename from pg_tables where schemaname='public' loop execute format('revoke all on table public.%I from anon, authenticated',r.tablename); end loop; end $$;
grant usage on schema public to anon,authenticated;

do $$
declare t text; arr text[]:=array['user_settings','portfolios','portfolio_allocations','risk_profiles','risk_limits','strategy_assignments','watchlists','watchlist_items','alerts','paper_accounts','paper_orders','backtests','backtest_runs','market_replay_sessions'];
begin
 foreach t in array arr loop execute format('grant select,insert,update,delete on public.%I to authenticated',t); end loop;
end $$;
grant select,update on public.profiles to authenticated;
grant select on public.user_roles,public.platform_connections,public.trading_accounts,public.positions,public.orders,public.trades,public.trade_events,public.trade_intents,public.trade_evidence,public.trade_decisions,public.risk_events,public.notifications,public.paper_trades,public.subscriptions,public.account_trading_controls to authenticated;

do $$
declare t text; arr text[]:=array['trading_platforms','platform_capabilities','strategies','strategy_versions','models','model_versions','model_metrics','market_instruments','market_symbols','symbol_mappings','news_events','economic_events','news_asset_impacts','tokens','token_security_reports','liquidity_snapshots','holder_snapshots','wallet_entities','wallet_relationships','wallet_clusters','wallet_cluster_members','creator_entities','creator_wallet_links','creator_projects','creator_reputation_history','projects','project_authenticity_reports','rug_events','security_incidents','scam_reports','sniper_activity','bot_activity','mev_events'];
begin
 foreach t in array arr loop
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy %I on public.%I for select to authenticated using (true)', 'authenticated_read_'||t,t);
 end loop;
end $$;

grant select on public.feature_registry,public.system_health,public.kill_switches to authenticated;
grant select on public.admin_memberships to authenticated;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid())=id or app_private.is_admin());
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid())=id or app_private.is_admin()) with check ((select auth.uid())=id or app_private.is_admin());

do $$
declare t text; arr text[]:=array['user_settings','portfolios','portfolio_allocations','risk_profiles','risk_limits','strategy_assignments','watchlists','watchlist_items','alerts','paper_accounts','paper_orders','backtests','backtest_runs','market_replay_sessions'];
begin
 foreach t in array arr loop
   execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id or app_private.is_admin())','owner_select_'||t,t);
   execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid())=user_id or app_private.is_admin())','owner_insert_'||t,t);
   execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid())=user_id or app_private.is_admin()) with check ((select auth.uid())=user_id or app_private.is_admin())','owner_update_'||t,t);
   execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid())=user_id or app_private.is_admin())','owner_delete_'||t,t);
 end loop;
end $$;

do $$
declare t text; arr text[]:=array['user_roles','platform_connections','trading_accounts','positions','orders','trades','trade_events','trade_intents','trade_evidence','trade_decisions','risk_events','notifications','paper_trades','subscriptions','account_trading_controls'];
begin foreach t in array arr loop execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id or app_private.is_admin())','owner_read_'||t,t); end loop; end $$;

create policy admin_memberships_own_read on public.admin_memberships for select to authenticated using ((select auth.uid())=user_id or app_private.is_admin());
create policy admin_roles_admin_read on public.admin_roles for select to authenticated using (app_private.is_admin());
create policy admin_permissions_admin_read on public.admin_permissions for select to authenticated using (app_private.is_admin());
create policy admin_role_permissions_admin_read on public.admin_role_permissions for select to authenticated using (app_private.is_admin());
grant select on public.admin_roles,public.admin_permissions,public.admin_role_permissions to authenticated;

create policy feature_registry_admin_read on public.feature_registry for select to authenticated using (app_private.is_admin());
create policy system_health_admin_read on public.system_health for select to authenticated using (app_private.is_admin());
create policy provider_health_admin_read on public.provider_health for select to authenticated using (app_private.is_admin());
create policy kill_switches_admin_read on public.kill_switches for select to authenticated using (app_private.is_admin());
grant select on public.provider_health to authenticated;

grant select on public.audit_logs to authenticated;
create policy audit_logs_read on public.audit_logs for select to authenticated using (actor_user_id=(select auth.uid()) or app_private.is_admin());

create or replace function public.api_health() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('ok',true,'database_time',now(),'schema','utai-foundation-v1') $$;
revoke all on function public.api_health() from public;
grant execute on function public.api_health() to anon,authenticated;

do $$ declare t text; arr text[]:=array['platform_connections','risk_profiles','risk_limits','trade_intents','trade_decisions','orders','positions','admin_memberships','system_settings','kill_switches','account_trading_controls']; begin foreach t in array arr loop execute format('drop trigger if exists audit_%I on public.%I',t,t); execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function app_private.audit_row_change()',t,t); end loop; end $$;

create index if not exists idx_trade_intents_user_created on public.trade_intents(user_id,created_at desc);
create index if not exists idx_orders_user_status on public.orders(user_id,status);
create index if not exists idx_positions_user_status on public.positions(user_id,status);
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);
create index if not exists idx_wallet_relationships_from on public.wallet_relationships(from_wallet_id);
create index if not exists idx_wallet_relationships_to on public.wallet_relationships(to_wallet_id);
