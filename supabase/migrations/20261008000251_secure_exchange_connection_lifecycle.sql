alter table public.platform_connections
  add column if not exists connection_label text,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists capability_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists credential_kind text not null default 'API_KEY',
  add column if not exists environment text not null default 'LIVE',
  add column if not exists endpoint_region text not null default 'GLOBAL',
  add column if not exists last_error text,
  add column if not exists verified_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='platform_connections_environment_check'
  ) then
    alter table public.platform_connections
      add constraint platform_connections_environment_check
      check (environment in ('LIVE','DEMO','TESTNET'));
  end if;
end $$;

create unique index if not exists platform_connections_user_platform_uidx
  on public.platform_connections(user_id, platform_id);

create index if not exists platform_connections_user_status_idx
  on public.platform_connections(user_id, status);

create or replace function public.store_platform_connection_credentials(
  p_platform_key text,
  p_secret_payload jsonb,
  p_external_ref text default null,
  p_permissions jsonb default '{}'::jsonb,
  p_capability_snapshot jsonb default '{}'::jsonb,
  p_connection_label text default null,
  p_environment text default 'LIVE',
  p_endpoint_region text default 'GLOBAL'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_platform_id uuid;
  v_connection_id uuid;
  v_old_secret uuid;
  v_secret_id uuid;
  v_secret_name text;
  v_withdrawal boolean := false;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if p_environment not in ('LIVE','DEMO','TESTNET') then
    raise exception 'invalid environment';
  end if;

  begin
    v_withdrawal := coalesce((p_permissions ->> 'withdrawal')::boolean, false);
  exception when others then
    raise exception 'invalid withdrawal permission value';
  end;

  if v_withdrawal then
    raise exception 'withdrawal-enabled credentials are forbidden';
  end if;

  if coalesce(length(p_secret_payload ->> 'api_key'),0) = 0
     or coalesce(length(p_secret_payload ->> 'api_secret'),0) = 0 then
    raise exception 'api credentials are incomplete';
  end if;

  select id into v_platform_id
  from public.trading_platforms
  where upper(platform_key)=upper(p_platform_key)
    and active=true
  limit 1;

  if v_platform_id is null then
    raise exception 'platform is not registered or active';
  end if;

  select id, nullif(credential_reference,'')::uuid
    into v_connection_id, v_old_secret
  from public.platform_connections
  where user_id=v_user and platform_id=v_platform_id
  limit 1;

  if v_old_secret is not null then
    delete from vault.secrets where id=v_old_secret;
  end if;

  v_secret_name := 'utai:' || v_user::text || ':' || upper(p_platform_key) || ':' || gen_random_uuid()::text;
  select vault.create_secret(
    p_secret_payload::text,
    v_secret_name,
    'Encrypted exchange credential for Universal Trading AI'
  ) into v_secret_id;

  if v_connection_id is null then
    insert into public.platform_connections(
      user_id, platform_id, credential_reference, account_external_ref,
      automation_mode, withdrawal_permission, status, last_health_at,
      connection_label, permissions, capability_snapshot, credential_kind,
      environment, endpoint_region, last_error, verified_at
    )
    values(
      v_user, v_platform_id, v_secret_id::text, p_external_ref,
      'ANALYSIS', false, 'CONNECTED', now(),
      nullif(trim(p_connection_label),''), coalesce(p_permissions,'{}'::jsonb),
      coalesce(p_capability_snapshot,'{}'::jsonb), 'API_KEY',
      p_environment, upper(coalesce(p_endpoint_region,'GLOBAL')), null, now()
    )
    returning id into v_connection_id;
  else
    update public.platform_connections
    set credential_reference=v_secret_id::text,
        account_external_ref=p_external_ref,
        withdrawal_permission=false,
        status='CONNECTED',
        last_health_at=now(),
        connection_label=nullif(trim(p_connection_label),''),
        permissions=coalesce(p_permissions,'{}'::jsonb),
        capability_snapshot=coalesce(p_capability_snapshot,'{}'::jsonb),
        credential_kind='API_KEY',
        environment=p_environment,
        endpoint_region=upper(coalesce(p_endpoint_region,'GLOBAL')),
        last_error=null,
        verified_at=now(),
        updated_at=now()
    where id=v_connection_id and user_id=v_user;
  end if;

  return v_connection_id;
end
$function$;

revoke all on function public.store_platform_connection_credentials(text,jsonb,text,jsonb,jsonb,text,text,text) from public, anon;
grant execute on function public.store_platform_connection_credentials(text,jsonb,text,jsonb,jsonb,text,text,text) to authenticated;

create or replace function public.disconnect_platform_connection(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_secret uuid;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select nullif(credential_reference,'')::uuid
    into v_secret
  from public.platform_connections
  where id=p_connection_id and user_id=v_user
  for update;

  if not found then
    return false;
  end if;

  if v_secret is not null then
    delete from vault.secrets where id=v_secret;
  end if;

  update public.platform_connections
  set credential_reference=null,
      status='DISCONNECTED',
      last_health_at=now(),
      last_error=null,
      updated_at=now()
  where id=p_connection_id and user_id=v_user;

  return true;
end
$function$;

revoke all on function public.disconnect_platform_connection(uuid) from public, anon;
grant execute on function public.disconnect_platform_connection(uuid) to authenticated;

update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes='Secure encrypted credential lifecycle and user connection workflow under implementation.',
    updated_at=now()
where feature_id in ('F-05','F-06');
