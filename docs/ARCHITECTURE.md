# Architecture

How the pieces fit and why. The README has the quick start; [SECURITY_NOTES.md](SECURITY_NOTES.md) has the threat model; [RUNBOOK.md](RUNBOOK.md) has operations.

## Principles

1. **The database enforces every rule.** Who can see whom, who can contact whom, caps and bans live in row-level security and `security definer` functions. A client that skips the UI gets the same answer as one that uses it. (Nothing about access or visibility is ever a UI-only fix.)
2. **Anonymous until accepted.** Discovery returns answers and a score keyed by a random `match_ref`, never a user id or name. The in-game username is released only to the two people in an accepted request.
3. **No signal.** Blocks, bans and reports never tell the other party. A blocked or banned player simply is not found; a request to someone who blocked you looks like a request that was never answered.
4. **Reads tolerate staleness; writes are small.** Presence and request expiry are evaluated at read time (`last_seen_at > now() - 3 minutes`, `last_sent_at > now() - 14 days`), so the housekeeping job only keeps tables small and correctness never depends on it.
5. **Launch means delete.** Dev-only code was removed, not hidden behind a flag.

## Data model (schema `public`)

| Table | Holds |
|---|---|
| `users` | One row per auth user (mirrors `auth.users`); `show_online_players` preference |
| `games` | Catalogue of tiles: slug, name, category, `base_game_id` (versions of a game share one profile) |
| `game_reference_data` | Weapons, maps, roles per base game; extended by the daily update |
| `game_updates` | Audit log of every catalogue change the cron made (can be reverted) |
| `game_profiles` | A player's answers for a base game; `id` is the anonymous `match_ref` |
| `user_presence`, `lfg_presence` | "App is open" and "searching this game" heartbeats |
| `squad_requests` | Request lifecycle: `pending → accepted / declined / withdrawn / ended`, plus expiry |
| `squad_request_events` | Append-only send log that the abuse caps count over |
| `allies` | One row per side of an accepted request; holds the revealed in-game username |
| `user_blocks` | Blocks, both directions hidden from the blocked side |
| `reports` | Abuse reports; no client privileges at all |
| `banned_usernames` | Username strings (not accounts) removed from discovery; survives account deletion |
| `api_rate_limits` | Fixed-window counters used by `consume_rate_limit` |

Schema changes are layered migrations in `supabase/migrations/`; see the README.

## The API is a set of RPCs

Anything that involves another player or a rule goes through functions that check `auth.uid()` and apply it. The client writes tables directly in exactly three places, each limited by row-level security to the caller's own row: saving their own `game_profiles` row, their own `users.show_online_players` preference, and the favourite flag on their own `allies` rows (the policy lets owners change `rating` only). The functions are: `heartbeat`, `start_searching`, `stop_searching`, `find_squad_matches`, `send_squad_request`, `withdraw_squad_request`, `accept_squad_request`, `decline_squad_request`, `decline_and_block_squad_request`, `get_my_pending_request_cards`, `get_my_outbound_requests`, `get_my_allies`, `remove_ally`, `block_ally`, `unblock_user`, `get_my_blocks`, `count_searching_by_game`, `report_ally`, `report_request`, `export_my_data`. `run_housekeeping` and `revert_game_update` are granted to the service role only. A test asserts the exact list of functions callable by `authenticated`.

`lib/db/*` wraps each RPC with types and maps database errors to a small set of codes (`lib/db/rpc.ts`: `ERROR_MESSAGES`), which the UI shows translated. The contract tests in `tests/contract` run those wrappers against PGlite, so a changed RPC signature fails CI.

## Request lifecycle

```
searching ──find_squad_matches──▶ anonymous cards (match_ref, answers, score)
                                      │ send_squad_request(match_ref)
                                      ▼
                                   pending ──14 days──▶ expired (read-time)
                       withdraw ◀──┤    ├──▶ decline (1 h cooldown) / decline & block
                                   ▼
                               accepted ──▶ both get an allies row with the other's in-game username
                                      │ remove_ally / block_ally
                                      ▼
                                    ended
```

Limits per sender, enforced inside `send_squad_request`: 20 pending, 50 sends per 24 hours, 4 sends to the same player for the same game per 30 days. `find_squad_matches` is limited to 20 calls per minute, reports to 10 per day.

## Discovery

`find_squad_matches(game, include_online, limit)` requires the caller to have a complete profile and to be searching that tile. It starts from fresh `lfg_presence` rows (and `user_presence` when the caller opted in to seeing online players), takes at most the 1,500 freshest candidates, joins their profile by `(user_id, base game)`, scores each with `calculate_match` (a SQL port of `lib/matching.ts`, kept equal by shared test vectors), removes blocked, un-contactable and banned candidates, and returns the top 50. See the D-08 entry in the launch spec's changelog for the numbers.

Live updates: a database trigger broadcasts `{kind, request_id}` on the private Realtime topic `user:<uid>`; the client only re-reads on any event. A 60-second poll is the safety net when the socket is down, and the presence heartbeat runs every 45 seconds while the tab is visible.

## Client

- `context/AppContext` owns the session, requests, allies and the heartbeat; `requestError` feeds the error banner on `/notifications` and `/squad-matches`.
- `context/CatalogueContext` merges the static snapshot in `lib/mockData.ts` with additions and relabels read from the database, so a cron-added weapon reaches players without a deploy.
- `context/I18nContext` and `lib/i18n/dict/*`: ten languages, strings keyed by English source text, RTL for Arabic.
- Pages that need an account sit behind `components/auth/RequireAuth`; that is a convenience, the database is the control.
- `middleware.ts` only implements the maintenance switch. Security headers and the CSP come from `next.config.mjs`.

## Server code

Everything under `app/api` and `lib/server` runs with the service-role key and imports `server-only`.

| Route | Purpose | Auth |
|---|---|---|
| `POST /api/account/delete` | Deletes the caller's auth user; the database cascade removes everything else | The caller's JWT, which must come from a sign-in within the last 10 minutes; rate limited |
| `GET /api/cron/housekeeping` | `run_housekeeping()`: stale presence, old request events, old rate-limit rows | `Authorization: Bearer $CRON_SECRET` (timing-safe; fails closed) |
| `GET /api/cron/update-games` | Daily catalogue update (labels and additions only, nothing deleted), logged in `game_updates` | Same |
| `GET /api/health` | Liveness plus a reachability check of the auth service; no secrets or versions | None |

## Scheduled work

`vercel.json` runs housekeeping at 05:30 UTC and the game update at 06:00 UTC daily (Vercel Hobby allows daily crons only).
