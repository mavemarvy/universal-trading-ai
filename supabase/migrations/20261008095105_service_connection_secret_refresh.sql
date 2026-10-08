create or replace function public.service_get_platform_connection_secret(
  p_user_id uuid,
  p_connection_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'connection_id', pc.id,
    'platform_key', tp.platform_key,
    'environment', pc.environment,
    'endpoint_region', pc.endpoint_region,
    'connection_label', pc.connection_label,
    'secret_payload', ds.decrypted_secret
  )
  from public.platform_connections pc
  join public.trading_platforms tp on tp.id = pc.platform_id
  join vault.decrypted_secrets ds on ds.id = nullif(pc.credential_reference,'')::uuid
  where pc.id = p_connection_id
    and pc.user_id = p_user_id
  limit 1
$function$;

revoke all on function public.service_get_platform_connection_secret(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.service_get_platform_connection_secret(uuid,uuid)
  to service_role;
