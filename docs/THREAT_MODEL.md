# Threat Model

Primary threats: credential theft, forged market signals, stale/poisoned market data, privilege escalation, unauthorized orders, replayed webhooks, wallet-draining permissions, malicious token metadata, model drift, exchange outage and risk-engine failure. Core mitigations: least privilege, RLS, explicit grants, provenance, deterministic gates, idempotency, capability policy, audit logs and kill switches.
