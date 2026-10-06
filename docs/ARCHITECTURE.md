# Architecture

The authoritative pipeline is: Data -> Provenance -> specialist intelligence -> regime/strategy ensemble -> confidence/uncertainty -> TradeIntent -> portfolio -> deterministic risk -> capability check -> execution policy -> adapter -> venue -> monitoring/profit protection -> forensics.

Supabase is the identity/control plane. Long-running ingestion, AI, risk monitoring and execution run on persistent compute. Vercel hosts only the web surfaces.
