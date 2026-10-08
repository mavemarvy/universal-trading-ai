update public.feature_registry
set status='IN_PROGRESS',
    test_status='PARTIAL',
    notes='No-trade behavior is active inside the ML/quant + deterministic-risk path: weak model edge, failed validation, minimum-confidence/edge rules, kill switches, position limits and unconfigured risk can reject a proposal. A broader dedicated multi-signal no-trade engine remains pending.',
    updated_at=now()
where feature_id='F-15';

update public.feature_registry
set status='SCAFFOLDED',
    test_status='NOT_RUN',
    notes='Claim verification / social-media strategy checking remains scaffolded and was not implemented by the market, ML, connection or paper-execution milestone.',
    updated_at=now()
where feature_id='F-32';
