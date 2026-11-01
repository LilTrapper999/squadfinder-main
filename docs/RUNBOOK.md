# Runbook

Day-to-day operation. SQL below is run in the Supabase SQL editor (it runs as `postgres`, which can call the service-role-only functions). Nothing here needs secrets pasted anywhere; use your own session or the Vercel dashboard.

## First-time setup (new project)

1. **Supabase project.** Create it, then open the SQL editor and run the whole of `supabase/bundle/all_migrations.sql` (all migrations plus the seed). Running it a second time is harmless. If you change a migration, `npm run bundle:sql` rebuilds it.
2. **Authentication.**
   - Providers: enable Email (confirm email on) and Google.
   - URL configuration: set the Site URL to the production origin and add to the redirect allow-list the origin itself, `<origin>/reset-password` and `<origin>/settings` (account deletion returns to `/settings?delete=1`). Add `http://localhost:3000` equivalents for development.
3. **Vercel.** Set the environment variables listed in the README (the public ones for Production and Preview; `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and `ANTHROPIC_API_KEY` for Production only). Deploy.
4. **Check.** `GET /api/health` returns `{"ok":true,"db":true}`. Sign in, build a profile, confirm `/privacy`, `/terms` and the contact link load.
5. **Content-Security-Policy.** It ships report-only. Browse every page with the console open; when no violation is reported, set `CSP_MODE=enforce` and redeploy.

Cron jobs only run on production deployments, and Vercel's Hobby plan allows daily schedules only.

## Scheduled jobs

| Route | When (UTC) | Does | Stop it |
|---|---|---|---|
| `/api/cron/housekeeping` | 05:30 daily | Deletes presence rows older than a day, request events older than 90 days, rate-limit rows older than 2 days. Reads already ignore stale rows, so a missed run costs disk, not correctness. | Remove its entry from `vercel.json` and redeploy |
| `/api/cron/update-games` | 06:00 daily | Asks Claude for each game's current season label and new weapons, maps or roles; applies labels and additions only; logs each change in `game_updates` | Set `GAME_UPDATES_ENABLED=false` and redeploy |

Both refuse every request unless `Authorization: Bearer $CRON_SECRET` matches, and refuse everything if `CRON_SECRET` is unset. Removing it (and redeploying) stops both. Trigger one by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/cron/housekeeping"
curl -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/cron/update-games?dry=1"   # dry: reports, writes nothing
```

Caps for the game update: `GAME_UPDATES_MAX_GAMES` (games per run) and `GAME_UPDATES_MAX_TOKENS` (model tokens per run); the response reports anything skipped, and the starting point rotates daily. Run the dry mode before enabling it on a new project.

## Reverting a game update

Every catalogue change is a row in `game_updates` (service role only).

```sql
select id, created_at, kind, old_value, new_value, status
  from public.game_updates order by created_at desc limit 50;

select public.revert_game_update('<id>');   -- true = reverted, false = already reverted
```

Reverting a `version` puts the old label back; reverting a weapon, map or role removes exactly that addition. Re-seeding (`supabase/seed.sql`) resets the reference lists to the code's snapshot and so drops cron-added entries; the next daily run adds them back.

## Reports and bans

Reports reach you only through SQL; the reported player is never told, and the reporter never learns a user id.

```sql
select * from public.open_reports order by reporters desc, latest desc;   -- who, which game, how many distinct reporters, reasons, recent details
```

To act, ban the **username** (it disappears from discovery, incoming requests and ally lists for that game, its owner can no longer use discovery for that game, and nobody can save a profile with it; the account itself is untouched):

```sql
select public.ban_username('<in-game username>', '<games.id uuid or null for all games>', '<short reason>');
select public.unban_username('<id returned above>');

update public.reports set status = 'actioned'      -- or 'reviewed' / 'dismissed'
 where status = 'open' and reported_username = '<in-game username>';
```

A banned player can pick a different username; that is a known limit of username-level bans. Banned usernames are kept (as a bare string with no link to any account) even after the account is deleted.

## Account deletion and data requests

Players delete their account and download their data from **Settings**. Deletion needs a sign-in within the last 10 minutes and removes everything the person owns; counterparties simply lose the entry. If someone cannot use the app, delete the user in Supabase (Authentication, Users): the database cascade does the rest. The export function only ever returns the caller's own rows, so a data request is answered by the person using **Download my data** while signed in.

## Rolling back a bad deploy

1. **Fastest:** set `NEXT_PUBLIC_MAINTENANCE_MODE=true` and redeploy. Every page except `/privacy` and `/terms` shows a back-soon page (HTTP 503); APIs and crons keep working.
2. **Code:** in Vercel, open Deployments, pick the last good one, Promote to Production.
3. **Database:** migrations only move forward. Fix a bad one with a new migration; never edit an applied file. If a deploy needs a migration that is not applied yet, apply it **before** promoting the code that uses it.

## Watching it

- `GET /api/health` for uptime monitors (503 when the auth service is unreachable).
- Vercel function logs: the cron routes log a one-line summary per run and never log user data or secret values.
- `select * from public.game_updates order by created_at desc limit 20;` after the daily run.
- `npm run check:images` (needs network) lists game logos whose URL has gone dead; tiles fall back to a labelled placeholder meanwhile.

## Known operational limits

- Reports are reviewed by hand through SQL; there is no admin UI.
- Error monitoring is not wired in. Use the Vercel logs until it is (see SECURITY_NOTES, open items).
