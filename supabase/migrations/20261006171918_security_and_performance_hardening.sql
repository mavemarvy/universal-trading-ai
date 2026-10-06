revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant select on public.system_settings to authenticated;
create policy system_settings_admin_read on public.system_settings for select to authenticated using (app_private.is_admin());

do $$
declare r record; cols text; index_name text;
begin
  for r in select c.oid,c.conname,c.conrelid,c.conkey,n.nspname,t.relname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname='public'
  loop
    select string_agg(quote_ident(a.attname), ', ' order by k.ord) into cols
    from unnest(r.conkey) with ordinality as k(attnum,ord)
    join pg_attribute a on a.attrelid=r.conrelid and a.attnum=k.attnum;
    index_name := 'idx_fk_' || left(r.relname,38) || '_' || substr(md5(r.conname),1,8);
    execute format('create index if not exists %I on %I.%I (%s)',index_name,r.nspname,r.relname,cols);
  end loop;
end $$;
