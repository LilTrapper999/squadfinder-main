# Daily game catalogue updates

`/api/cron/update-games` runs once a day (06:00 UTC, see `vercel.json`). For each base game it asks Claude (`claude-sonnet-5-5`, web search tool) for the live season/patch label and any new weapons, maps or roles, validates the answer, and applies only label changes and additions to Supabase. Nothing is ever deleted. Every change is logged in `public.game_updates`.

## Setup
1. Run `supabase/migrations/20260801000100_game_updates.sql` (after the schema migrations and seed).
2. In Vercel project env vars set: `ANTHROPIC_API_KEY`, `CRON_SECRET` (Vercel sends it as `Authorization: Bearer ...` to cron routes), `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.
3. Deploy. Cron jobs only run on production deployments. Test manually with `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/update-games`.

Game ids are derived exactly as in `scripts/generate-seed.mjs` (UUIDv5), so the DB must have been seeded with that script. Games missing from the DB are skipped and reported.

## Safety
Web content is treated as data: only plain short names pass validation, URLs/markup are rejected, additions per kind are capped per run, and re-runs are idempotent (existing items are skipped; a unique index blocks duplicate audit rows).

## Limitations
- The UI still reads `lib/mockData.ts`. DB updates only reach players once the app reads the catalogue from Supabase.
- Model output can be wrong or stale; review `game_updates` periodically. Changes are applied automatically (`applied = true`), not queued for approval.
- Very large catalogues may not finish in the 300s limit; the response reports `skippedForTime`.
