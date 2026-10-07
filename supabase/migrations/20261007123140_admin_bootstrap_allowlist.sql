create table if not exists app_private.admin_bootstrap_allowlist (
  email_hash text primary key,
  role_key text not null default 'SUPER_ADMIN',
  active boolean not null default true,
  mfa_required boolean not null default true,
  created_at timestamptz not null default now()
);

revoke all on table app_private.admin_bootstrap_allowlist from public, anon, authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  bootstrap_role_key text;
  bootstrap_mfa_required boolean;
  bootstrap_role_id uuid;
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name'))
  on conflict do nothing;

  insert into public.user_settings(user_id)
  values(new.id)
  on conflict(user_id) do nothing;

  insert into public.user_roles(user_id,role_key)
  values(new.id,'USER')
  on conflict do nothing;

  insert into public.risk_profiles(user_id)
  values(new.id)
  on conflict do nothing;

  select a.role_key, a.mfa_required
    into bootstrap_role_key, bootstrap_mfa_required
  from app_private.admin_bootstrap_allowlist a
  where a.active = true
    and a.email_hash = encode(extensions.digest(lower(coalesce(new.email,'')), 'sha256'), 'hex')
  limit 1;

  if bootstrap_role_key is not null then
    select r.id
      into bootstrap_role_id
    from public.admin_roles r
    where r.role_key = bootstrap_role_key
    limit 1;

    if bootstrap_role_id is not null then
      insert into public.admin_memberships(user_id, admin_role_id, status, mfa_required)
      values(new.id, bootstrap_role_id, 'ACTIVE', bootstrap_mfa_required)
      on conflict (user_id)
      do update set
        admin_role_id = excluded.admin_role_id,
        status = 'ACTIVE',
        mfa_required = excluded.mfa_required,
        updated_at = now();
    end if;
  end if;

  return new;
end
$function$;
