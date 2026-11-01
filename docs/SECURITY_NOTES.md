# Security notes

Threat model in brief, the access inventory, and what is known to be open. Architecture is in [ARCHITECTURE.md](ARCHITECTURE.md); operations in [RUNBOOK.md](RUNBOOK.md). The decisions labelled D1 to D10 are defined in [SPEC_DB_CHANGES.md](SPEC_DB_CHANGES.md) (section 4); D-01 to D-15 and O-01 to O-17 are items of [SPEC_LAUNCH_READINESS.md](SPEC_LAUNCH_READINESS.md).

## What we protect, and from whom

| Asset | Threat | Control |
|---|---|---|
| A player's identity (in-game username) | A stranger harvesting usernames | Discovery is anonymous (`match_ref`, no user id, no name); the username is released only to the two people of an accepted request (D1, D3) |
| A player's answers | Scraping by someone who is not playing | `find_squad_matches` requires a complete profile and an active search of that very tile; 20 calls per minute |
| A player's peace | Harassment, unwanted contact | Blocks (silent for the blocked side, D2, D7); caps on pending, daily and per-player requests (D9); 1-hour decline cooldown; reports and username bans (D-03, D-15) |
| Accounts and data | Another user reading or changing rows; a leaked key | Row-level security and definer functions; the service-role key exists only in server routes; secret scanning of files, history and the browser bundle |
| Availability | Request floods, runaway cron cost | Fixed-window rate limits in the database; cron routes fail closed; the AI job has per-run game and token caps and an off switch |
| Privacy over time | Data that outlives its purpose | Presence rows are deleted after a day, request events after 90 days; account deletion removes everything the person owns; export is self-service |

## Access inventory (final state, verified by tests)

Table privileges held by signed-in clients, pinned by a test in `supabase/tests/run.mjs`:

| Table | Client privileges | Why it is safe |
|---|---|---|
| `games`, `game_reference_data` | select | Public reference data |
| `users` | select own row; update `show_online_players` only (column grant) | RLS: `auth.uid() = id` |
| `game_profiles` | select, insert, update, delete | RLS: your own row; others' profiles are never selectable, discovery goes through the function |
| `allies` | select, update | RLS: your own rows; a trigger allows changing `rating` only |
| every other table (`squad_requests`, `squad_request_events`, `user_blocks`, `user_presence`, `lfg_presence`, `api_rate_limits`, `reports`, `banned_usernames`, `game_updates`) | none | Reachable only through the functions below; a test proves a client gets `permission denied` |

`anon` has no table privilege and cannot execute any function in `public`. Nobody can `TRUNCATE`. Every table in `public` has RLS enabled.

Functions executable by `authenticated` (an exact-list test fails if one is added by accident): `base_game_id`, `text_array_is_clean`, `is_ally_for_profile`, `normalize_username`, `heartbeat`, `start_searching`, `stop_searching`, `count_searching_by_game`, `find_squad_matches`, `send_squad_request`, `withdraw_squad_request`, `accept_squad_request`, `decline_squad_request`, `decline_and_block_squad_request`, `count_my_pending_requests`, `get_my_pending_request_cards`, `get_my_outbound_requests`, `get_my_allies`, `remove_ally`, `block_ally`, `unblock_user`, `get_my_blocks`, `report_ally`, `report_request`, `export_my_data`. Service role only: `run_housekeeping`, `revert_game_update`, `ban_username`, `unban_username`.

All definer functions set `search_path = ''`, qualify every object and derive the caller from `auth.uid()`; none takes a user id from the client except to name someone else's `match_ref` or ally id, which the function resolves on the server.

## No-signal rules

The other side must never be able to infer a block, ban or report:

- A block shows the sender "declined"; the blocked player never appears in discovery and cannot request the blocker (D2, D7).
- Replaying a `match_ref` after a block returns the same neutral "no longer available" as any other unavailable player.
- Banned usernames are dropped from discovery, incoming requests, outbound lists and ally lists without a marker; the owner just finds nobody.
- Reports are invisible to the reported player, and the reporter never receives a user id (`reports` has no client privileges; `open_reports` is for `postgres` and the service role).

Note on D8: it described chat behaviour for blocked allies. Chat was removed (D-05), so only the ally-list part of D8 remains.

## Authentication and sessions

- Sign-in is Google or email and password; minimum password length 8. The Supabase project is expected to have email confirmation on (runbook, step 2); reset links expire per Supabase settings.
- Password sign-in answers a wrong email and a wrong password identically, and password reset shows the same message whether or not the address has an account. **Sign-up does tell the visitor that an address already has an account** (a usability choice: otherwise a person who forgot they registered waits for an email that never comes). Supabase rate-limits these calls.
- Auth redirects are built from one helper (`lib/siteUrl.ts`) that uses the configured canonical origin; no user-controlled `next` or redirect parameter is honoured. The Supabase redirect allow-list must contain exactly the origins and paths listed in the runbook.
- Account deletion (`POST /api/account/delete`) requires a bearer token from a sign-in within the last 10 minutes (read from the token's `amr` claim), is rate limited in the database, and returns a neutral error body. It deletes the auth user; foreign keys cascade the rest, and a test asserts nothing references the deleted id afterwards.
- A dead session signs the client out locally and sends the person to the login page instead of showing an error.

## HTTP surface

- Headers on every route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (no camera, microphone, geolocation, payment or USB), `Strict-Transport-Security`, and a Content-Security-Policy. Private pages also send `X-Robots-Tag: noindex, nofollow`.
- The CSP ships as `Content-Security-Policy-Report-Only` and becomes enforcing with `CSP_MODE=enforce` once the console is clean on every page. `script-src` keeps `'unsafe-inline'` because Next 14's App Router emits inline hydration scripts and nonces would make every page dynamic; the app renders no user-controlled HTML, so there is no injection point for that allowance to open.
- No CORS headers are set; the API routes are same-origin only. Cron routes require a bearer secret compared in constant time and refuse everything when the secret is unset. `GET /api/health` returns only `{ok, db}`.
- Maintenance mode (`NEXT_PUBLIC_MAINTENANCE_MODE`) rewrites pages only; APIs keep authenticating for themselves.

## Secrets

- `npm run check:secrets` scans tracked files and every commit for key-shaped strings and prints file or commit names, never values. `npm run check:secrets -- --bundle .next/static` fails if the browser bundle contains a server-only variable name, a secret-shaped string, or a configured server secret's value; CI runs it after the build.
- The service-role key is read in `lib/server/admin.ts` (which imports `server-only`) and nowhere else. Logs carry counts and error classes, not user data or secret values.
- `.env.example` lists names only.

## The daily game update (AI)

`/api/cron/update-games` sends **only game titles** to the model, never user data. The model's answer is treated as untrusted data: it must parse as JSON of a known shape, names must be short plain text (URLs and markup are rejected), additions are capped per kind, nothing is ever deleted, and each change is logged and revertible. There is a per-run cap on games and tokens, a dry-run mode and an off switch.

## Dependencies

`npm audit --omit=dev` reports two groups of findings, both fixed only by moving `next` from 14.2.35 (the last 14.x) to a current major:

| Package | Advisory | Reachable here? |
|---|---|---|
| `next` 14.2.35 | Image Optimization API RCE when SVG files are used (GHSA-2464-fhr4-w9xw); Server Actions denial of service (GHSA-p3m5-59mp-jv5r) | **No.** The app has no Server Action (`'use server'`) and does not use `next/image` (logos are plain `<img>`; there is no image optimiser route to reach). |
| `next`'s bundled `postcss` | `sourceMappingURL` and stringify advisories | Build-time only, attacker-controlled CSS; no user CSS is processed. |

**Decision:** the Next 16 / React 19 upgrade is not part of the launch-readiness change. It is a major version jump with its own breaking changes and deserves its own review with the suites in CI as the safety net; since neither advisory is reachable, delaying it does not leave a known hole. CI reports `npm audit` without failing until then.

## Open items and known limits

- **Username bans are not account bans** (D-15): a banned player can choose another username.
- **No error monitoring** is wired in yet (no Sentry). The privacy policy therefore lists no error-monitoring sub-processor; add it to the policy at the same time as the integration.
- **Reports are reviewed by hand** through SQL and are kept indefinitely (the reporter column is nulled when a reporter deletes their account).
- **No multi-factor authentication** beyond what Google provides.
- **CSP is report-only** until switched on (runbook step 5).
- The Playwright suite and the accessibility/performance audits (axe, Lighthouse) are written or specified but need a browser install and, for the sign-in flows, a Supabase test project; they have not been run in this repository's CI yet.
