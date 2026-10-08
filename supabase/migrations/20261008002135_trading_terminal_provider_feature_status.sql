update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes=case feature_id
      when 'F-05' then 'Secure user exchange connection center implemented for Bybit, Binance and OKX; encrypted Vault storage and admin oversight added. Real account credential acceptance test still required.'
      when 'F-06' then 'Universal adapter contract remains broader than current live connectors. Bybit/Binance/OKX credential verification lifecycle is active; Kraken/Coinbase/Bitget/MT5/cTrader remain pending.'
      when 'F-16' then 'Live GDELT market-news surface and admin news operations page added; persistent AI scoring/ingestion workers remain pending.'
      when 'F-28' then 'Realtime public spot terminal now includes symbol switching, 1m candles, order book, recent trades and ticker stats. Live order submission remains risk-gated and not yet enabled.'
      when 'F-44' then 'Public provider probes and live news/market data sources are exposed in admin. Persistent provider failover/ingestion strategy remains partial.'
      else notes
    end,
    updated_at=now()
where feature_id in ('F-05','F-06','F-16','F-28','F-44');
