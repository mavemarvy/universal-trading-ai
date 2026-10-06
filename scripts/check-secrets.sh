#!/usr/bin/env bash
set -euo pipefail
if grep -RInE '(service_role|sb_secret_[A-Za-z0-9_-]+|BEGIN (RSA |EC )?PRIVATE KEY|seed phrase)' --exclude-dir=.git --exclude='.env.example' --exclude='check-secrets.sh' .; then echo 'Potential secret material detected'; exit 1; fi
echo 'No obvious secret patterns found.'
