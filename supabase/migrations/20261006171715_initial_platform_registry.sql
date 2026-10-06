insert into public.admin_roles(role_key,name) values ('SUPER_ADMIN','Super Admin'),('RISK_ADMIN','Risk Administrator'),('SECURITY_ADMIN','Security Administrator'),('OPS_ADMIN','Operations Administrator') on conflict(role_key) do nothing;
insert into public.admin_permissions(permission_key,description) values
('system.kill_switch','Activate or release system kill switches'),('users.manage','Manage users and account trading suspension'),('platforms.manage','Manage platform capability policy'),('risk.manage','Manage system risk policy'),('strategies.manage','Manage strategy deployments'),('models.manage','Manage model deployments'),('providers.manage','Manage data/news/on-chain providers'),('audit.read','Read privileged audit logs') on conflict(permission_key) do nothing;

insert into public.trading_platforms(platform_key,name,family) values
('MT4','MetaTrader 4','FOREX_CFD'),('MT5','MetaTrader 5','MULTI_ASSET'),('CTRADER','cTrader','FOREX_CFD'),('BINANCE','Binance','CEX'),('BYBIT','Bybit','CEX'),('OKX','OKX','CEX'),('KRAKEN','Kraken','CEX'),('COINBASE','Coinbase','CEX'),('BITGET','Bitget','CEX'),('SOLANA','Solana','CHAIN'),('EVM','EVM Chains','CHAIN'),('TON','TON','CHAIN') on conflict(platform_key) do nothing;

insert into public.platform_capabilities(platform_id,version,execution_class,wallet_connection,withdrawal_required,policy_reviewed,known_limitations)
select id,1,'COPILOT',platform_key in ('SOLANA','EVM','TON'),false,false,'["Policy review required before automated execution"]'::jsonb from public.trading_platforms
on conflict(platform_id,version) do nothing;

insert into public.system_health(component,status,details) values
('database','HEALTHY','{"source":"initial migration"}'::jsonb),('risk-engine','UNKNOWN','{"reason":"persistent worker not deployed"}'::jsonb),('execution-engine','UNKNOWN','{"reason":"persistent worker not deployed"}'::jsonb),('market-data','UNKNOWN','{"reason":"provider not configured"}'::jsonb)
on conflict(component) do update set status=excluded.status,details=excluded.details,checked_at=now();

insert into public.kill_switches(scope_type,scope_ref,mode,active,reason) values('GLOBAL',null,'STOP_NEW',false,'Foundation default: inactive global kill switch') on conflict do nothing;
