create extension if not exists pg_cron;

create or replace function app_private.refresh_database_heartbeat()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.system_health
  set status = 'HEALTHY',
      details = jsonb_build_object(
        'source','pg_cron',
        'kind','database_heartbeat',
        'database_time', now()
      ),
      checked_at = now()
  where component = 'database';
end
$function$;

revoke all on function app_private.refresh_database_heartbeat() from public, anon, authenticated;

select cron.schedule(
  'utai-database-heartbeat',
  '* * * * *',
  'select app_private.refresh_database_heartbeat();'
);
