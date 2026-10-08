update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes=case feature_id
      when 'F-11' then 'Authenticated UTAI Quant Core is active: live 15m candles, EMA/RSI/ATR/volume/momentum analysis, confidence/regime output, and backend-owned TradeIntent creation. Generative/model inference specialists and ensemble calibration remain pending.'
      when 'F-18' then 'Live DEX/meme discovery is active through DEX pair data with price, 24h change, volume, liquidity, market cap, token images, search and watchlist. Token-security scoring, creator-risk analysis and sniper execution remain pending.'
      when 'F-28' then 'Realtime market experience now includes multi-venue market discovery, DEX/meme search, watchlist, deep-linking into symbol-specific terminal, live candles, order book, recent trades and ticker stats. Live order submission remains risk-gated and disabled.'
      when 'F-44' then 'User market aggregation and Admin market-data operations now use multiple public sources with failover semantics; live news and provider probes are exposed. Persistent ingestion/failover workers and on-chain provider orchestration remain partial.'
      else notes
    end,
    updated_at=now()
where feature_id in ('F-11','F-18','F-28','F-44');
