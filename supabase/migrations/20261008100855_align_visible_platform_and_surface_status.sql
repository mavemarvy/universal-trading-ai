update public.trading_platforms
set active=false,
    updated_at=now()
where upper(platform_key)='BYBIT';

update public.feature_registry
set status='IN_PROGRESS',
    test_status='NOT_RUN',
    notes='Paper account creation, persisted paper orders/fills, separate paper-position ledger, live mark-to-market and risk-approved AI/quant paper execution are active. Market replay, historical backtesting and full digital-twin simulation remain pending.',
    updated_at=now()
where feature_id='F-30';

update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes='Separate Admin application now includes operational dashboards for users, connections, market data, providers, news, AI/risk decisions, paper execution, risk, incidents, audit and feature registry. Full admin requirements remain broader and continue in progress.',
    updated_at=now()
where feature_id='F-41';

update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes='User web app now has separated routed surfaces for dashboard, unified markets, live terminal, AI/ML analysis, connections, news, risk, portfolio, paper trading, research, profile and security. Full blueprint information architecture and all specialist tools remain in progress.',
    updated_at=now()
where feature_id='F-42';

update public.feature_registry
set notes='Secure user exchange connection center is active for Binance and OKX with encrypted Vault storage, permission verification, account refresh and Admin oversight. Additional official connectors remain pending.',
    updated_at=now()
where feature_id='F-05';

update public.feature_registry
set notes='Universal adapter contract remains broader than current live connectors. Binance and OKX credential verification/account refresh are active; Kraken, Coinbase, Bitget, MT5, cTrader and full normalized execution adapters remain pending.',
    updated_at=now()
where feature_id='F-06';
