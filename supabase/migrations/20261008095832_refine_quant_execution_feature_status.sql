update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes=case feature_id
      when 'F-11' then 'Authenticated UTAI Quant Core is active: recent live candles are transformed into return, trend, volatility, volume and range features; a local logistic classifier is trained per analysis request and reports probability, validation accuracy, confidence and expected edge. The broader specialist-AI ensemble remains pending.'
      when 'F-13' then 'The active quant strategy can now create TradeIntent + deterministic TradeDecision and route APPROVE results into Paper execution. Multi-strategy ensemble selection, strategy ranking and full strategy lifecycle remain pending.'
      when 'F-28' then 'Realtime user market experience includes multi-venue centralized-market discovery with failover, DEX/meme search, device watchlist, symbol deep-links, live chart/order-book/trade tape, AI/quant analysis and risk-gated Paper execution. Live real-money order submission remains disabled.'
      else notes
    end,
    updated_at=now()
where feature_id in ('F-11','F-13','F-28');
