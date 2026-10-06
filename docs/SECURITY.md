# Security

Secrets never enter browser tables or Git. Platform connections store only opaque credential references. The design assumes external KMS/Vault-backed encryption for live credentials. Admin authorization is enforced in Postgres RLS and server code, not by hidden UI. No self-service admin-role grant exists. New trading connections default to Analysis mode and withdrawal permission is prohibited by schema constraint.
