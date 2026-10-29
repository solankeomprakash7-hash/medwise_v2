#!/usr/bin/env bash
# Tests the database rules on an empty PostgreSQL database.
# Usage: DATABASE_URL=postgres://... scripts/test-db.sh   (the database is wiped and rebuilt)
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Set DATABASE_URL to an empty test database}"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c 'set client_min_messages = warning; drop schema if exists public cascade; drop schema if exists private cascade; drop schema if exists auth cascade; create schema public;'
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/supabase_stub.sql
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -t -A -f tests/db/rls.test.sql 2>&1 | grep -v "^$"
exit "${PIPESTATUS[0]}"
