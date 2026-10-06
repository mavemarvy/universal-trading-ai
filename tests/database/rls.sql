-- Non-destructive database security assertions.
do $$
declare missing_rls int;
begin
  select count(*) into missing_rls from pg_tables t where t.schemaname='public' and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=t.schemaname and c.relname=t.tablename and c.relrowsecurity);
  if missing_rls <> 0 then raise exception 'RLS missing on % public tables', missing_rls; end if;
end $$;
do $$ begin
  if exists(select 1 from public.platform_capabilities where withdrawal_required) then raise exception 'withdrawal_required invariant violated'; end if;
  if exists(select 1 from public.platform_connections where withdrawal_permission) then raise exception 'withdrawal_permission invariant violated'; end if;
end $$;
