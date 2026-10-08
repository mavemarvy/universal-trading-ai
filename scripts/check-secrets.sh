#!/usr/bin/env bash
set -euo pipefail

# Look for secret VALUES, not harmless identifier names such as PostgreSQL's
# built-in service_role role or Deno.env.get("SUPABASE_SERVICE_ROLE_KEY").
patterns='(sb_secret_[A-Za-z0-9_-]{12,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|seed phrase|mnemonic phrase|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*["'\''"]?[A-Za-z0-9._-]{20,}|service_role[[:space:]]*[:=][[:space:]]*["'\''"]?eyJ[A-Za-z0-9._-]{20,})'

if grep -RInE "$patterns"   --exclude-dir=.git   --exclude='.env.example'   --exclude='check-secrets.sh'   .; then
  echo 'Potential secret material detected'
  exit 1
fi

echo 'No obvious secret values found.'
