# Daily game catalogue updates

`/api/cron/update-games` runs once a day (06:00 UTC, see `vercel.json`). For each base game it asks Claude (`claude-sonnet-5-5`, web search tool) for the live season/patch label and any new weapons, maps or roles, validates the answer, and applies only label changes and additions to Supabase. Nothing is ever deleted. Every change is logged in `public.game_updates`.

## Setup
1. The `game_updates` table comes with the migrations (`supabase/bundle/all_migrations.sql` on a new project).
2. In Vercel project env vars set: `ANTHROPIC_API_KEY`, `CRON_SECRET` (Vercel sends it as `Authorization: Bearer ...` to cron routes), `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.
3. Deploy. Cron jobs only run on production deployments. Test manually with `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/update-games`.

Game ids are derived exactly as in `scripts/generate-seed.mjs` (UUIDv5), so the DB must have been seeded with that script. Games missing from the DB are skipped and reported.

## Safety
Web content is treated as data: only plain short names pass validation, URLs/markup are rejected, additions per kind are capped per run, and re-runs are idempotent (existing items are skipped; a unique index blocks duplicate audit rows).

## Limitations
- The app reads the static list in `lib/mockData.ts` and overlays what this job adds (new weapons, maps, roles and relabelled seasons) at runtime through `CatalogueContext`. The overlay only adds and relabels; it never removes, so it cannot hide something the static list has. Re-seeding the database resets the lists to the code's snapshot until the next run adds the entries again.
- Model output can be wrong or stale; review `game_updates` periodically. Changes are applied automatically, not queued for approval, and each one can be undone with `select public.revert_game_update(<id>)` (see RUNBOOK).
- A run is capped by games (`GAME_UPDATES_MAX_GAMES`), tokens (`GAME_UPDATES_MAX_TOKENS`) and the route's 300-second `maxDuration`; the response reports what was skipped, and the starting point rotates daily so different games are skipped each time. Vercel Hobby caps function duration lower than that, so check your plan.
- `GAME_UPDATES_ENABLED=false` stops it; `?dry=1` runs the lookups without writing anything.
