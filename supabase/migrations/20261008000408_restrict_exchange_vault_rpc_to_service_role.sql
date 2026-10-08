revoke execute on function public.store_platform_connection_credentials(text,jsonb,text,jsonb,jsonb,text,text,text) from authenticated;
grant execute on function public.store_platform_connection_credentials(text,jsonb,text,jsonb,jsonb,text,text,text) to service_role;

revoke execute on function public.disconnect_platform_connection(uuid) from authenticated;
grant execute on function public.disconnect_platform_connection(uuid) to service_role;
