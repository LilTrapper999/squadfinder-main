# SPEC — Database changes needed for the notifications + score-breakdown UI

**Status: implemented in `supabase/migrations/20261031000100` … `20261031000800` (layered on the original five), `scripts/generate-seed.mjs` (now emits `slug`) and `supabase/tests/`. Migration `20261031000900` (also part of this set) adds `block_id` to `get_my_allies()`. Not yet applied to the real Supabase project. UI wiring (step 5) is partly done: the bell, `/notifications` (accept / decline / decline & block), allies (remove / pin / block), the presence heartbeat, realtime refresh and profile save/load use the RPCs through `lib/db/` and `context/AppContext.tsx` when signed in. Still mock: discovery on `/squad-matches` (`find_squad_matches`, `start_searching`, `send_squad_request`), chat persistence, tile counts and the `ingame` status cleanup.** The SQL in the sections below is the design; the migration files are authoritative where they differ (differences are listed in §5). Run the checks with `npm run test:db`.

**Baseline compared against:** the five existing migrations in `supabase/migrations/` (`schema`, `functions_triggers`, `policies`, `convenience_views`, `game_updates`) and the UI as of commit `5d764f2` on `Open_Beta` (branch HEAD has since moved to `856930f`; nothing in that commit touches the DB surface, but re-check before implementing).

**Revision:** this version incorporates two reviews. First review: blocks move out of `squad_requests` into their own table (§3.3) so a blocked sender can never observe them; `squad_requests` is no longer readable by clients at all (§3.4); presence is split into a global "online" and a per-version "searching" (§3.8); live updates use minimal Realtime broadcasts instead of publishing table rows (§3.9); and a set of standing rules for every new object (§0). Second review: the block oracle through `send_squad_request` is closed with a silent shadow-decline (§3.4, D7); withdraw no longer deletes the row, and the rate limits count from a request log (§3.4); simultaneous opposite-direction requests are prevented by a pair index and lock (§3.4); pending requests expire (§3.4); a `remove_ally` RPC defines what removing an ally means (§3.10, D10); blocks cancel pending requests and use a directional helper for chat (§3.3, §3.10); score parity uses `float8` rather than `numeric` (§3.6); the heartbeat can no longer revive a stale search and discovery requires the caller to be searching (§3.7, §3.8); and the migration order is fixed (§5). Decisions D7–D10 need sign-off.

---

## 0. Standing rules (apply to every object in this spec)

1. **Ground rule (standing project rule):** every access/visibility rule is enforced in the database (RLS, constraints, security-definer functions), never only in a React component.
2. **Function privileges.** Postgres grants `EXECUTE` to `PUBLIC` by default, and a stock Supabase project also grants it to `anon`. Every new function — and the two existing ones, `is_blocked` and `accept_squad_request` — must `revoke all on function … from public, anon;` and then `grant execute … to authenticated` only where clients are meant to call it. Trigger-only functions get no client grant.
3. **Table and view privileges.** `20260731000300_policies.sql` grants all DML on all *existing* tables to `authenticated`, and a stock Supabase project's default privileges also grant new tables to `anon` and `authenticated`. Every new table or view needs explicit grants (and `revoke … from anon`), and RLS enabled on every table. **Existing tables too:** `users`, `games`, `game_reference_data`, `game_profiles`, `allies`, `ally_chats`, `chat_messages` and `game_updates` get `revoke all … from anon` (the catalogue policies `games_select_all` / `reference_data_select_all` have no `to` clause and would otherwise serve the catalogue to signed-out visitors), and the catalogue tables are narrowed to `select` only for `authenticated`.
4. **Policies call definer helpers, not locked tables.** Where a policy needs to look at a table clients cannot read (`squad_requests`, `user_blocks`), it calls a `security definer` helper (`stable`) instead of a subquery. This avoids depending on how Postgres checks privileges inside policy expressions. Every `security definer` function sets `search_path = ''` (schema-qualify everything) or `public, pg_temp` at the very least.
5. **No user ids pre-acceptance (D3).** No client-readable surface returns the other party's `user_id` before the request is accepted. After acceptance the ally relationship is public to both sides, as today.
6. **No block signal (D2).** Nothing a blocked user can reach — a table, view, RPC result, Realtime payload, ordering, or **error text** — may differ between "this player blocked me" and "this player is unavailable / declined / went offline".
7. **Server time only.** Timestamps that drive visibility (`last_seen_at`, `declined_at`, `last_sent_at`, `expires_at`) are set by the database, never accepted from the client.
8. **Atomic check-then-write.** Any rule of the form "check a condition, then insert/update" (eligibility, rate limits, one-search-at-a-time) is enforced either by a unique/partial-unique index or under a transaction-scoped lock (`pg_advisory_xact_lock` keyed on the sender, or on the unordered user pair), so two concurrent calls cannot both pass the check.

---

## 1. What the new UI does, and what it needs from the DB

| UI behaviour | Where | DB needs |
|---|---|---|
| Bell shows count of pending requests sent *to me* | `NotificationBell`, `AppContext.squadRequests` | Count of my inbound `pending` requests; live updates when a new one arrives |
| `/notifications`: 3 tabs (extraction / competitive / fps), each with a count; games with requests; one card per sender | `app/notifications/page.tsx` | Inbound pending requests joined to game (name, category, logo) |
| Card shows the sender's **username**, their status (searching / online), mic/text badges | `RequestCard` | Sender's `in_game_username` for that game, presence, `willing_to_*` |
| Click any % → popup listing picks you share, picks only one side made, slider gaps | `ScoreBreakdownModal`, `explainMatch()` | The sender's **full answers** for that game (weapons, maps, roles, skill, role style, rage, personality, languages) plus **mine** for the same game |
| Accept / Decline / Decline & Block | `RequestCard` → `AppContext` | State transitions enforced server-side (see §3.4) |
| `/squad-matches` cards: same clickable % + popup, but the other player stays **anonymous** ("Match 02") | `ScoreBars`, `MatchCard` | Anonymous candidate answers (no username, no user id) for a game; see §3.7 |
| Demo requests seeded on localhost | `AppContext` effect, `MOCK_SQUAD_REQUESTS` | **Nothing.** Dev-only, deleted at launch (flagged in `lib/launch.ts`) |

The breakdown itself needs **no new table**: it is computed in the browser by `explainMatch()` from the two players' answers. What the DB must supply is the *answers*, to exactly the people allowed to see them.

---

## 2. Summary of changes

| # | Change | Type | Why it is needed | Blocks |
|---|---|---|---|---|
| 3.1 | `games.slug` (catalogue key) | column | UI identifies games by string id (`'tarkov-eft-pvp'`, `'cs2'`); DB uses uuids | Everything |
| 3.2 | Key `game_profiles` by **base** game; add `no_maps`, `specific_answers`; tighten profile visibility; cancel requests on profile delete; text/array limits | column + policy + trigger | UI shares one answer set across versions of a game; DB would split them and policies would mismatch; today an inbound sender's whole profile row (incl. `user_id`) is readable | Notifications, accept |
| 3.3 | `user_blocks` table; `is_blocked` rewritten and locked down; directional `has_blocked`; block/unblock RPCs that also cancel pending requests | table + functions | Blocks currently live in `squad_requests.status` and `allies.rating`, both readable by the blocked party; `is_blocked()` is a public oracle | Decline & Block, D2 |
| 3.4 | Lock `squad_requests`; state machine through RPCs; request log + caps; pair index; expiry; sender/recipient read functions; `send_squad_request` | privileges + functions + index | Recipient can bypass the accept RPC; sender can never re-request; both sides can read each other's user id; withdraw-and-resend defeats any cap; opposite-direction requests can race | Accept / decline / block |
| 3.5 | Inbound-notification cards | function | One call for tabs, cards and breakdown without exposing the sender's user id | Notifications |
| 3.6 | Compute match score server-side | function | Accept currently stores a client-supplied score | Accept |
| 3.7 | Anonymous discovery RPC `find_squad_matches` | function | `/squad-matches` breakdown needs strangers' answers without their identity; current RLS forbids it | Squad-matches |
| 3.8 | Presence: `user_presence` (online) + `lfg_presence` (searching), RPC-only | tables + functions | Status dots, "searching" filter, notification card status, tile counts | Notifications, squad-matches |
| 3.9 | Live updates via private Realtime broadcast; indexes | trigger + policy + index | Bell/page update live **without** shipping raw `squad_requests` rows to clients | Notifications |
| 3.10 | Allies read function; `remove_ally`; post-block behaviour | function + policy | Existing ally card needs presence; blocking must cut access without telling the blocked user; removing an ally today leaves the other side with live access and blocks any re-request | Allies |
| 3.11 | Chat hardening | trigger/policy | Adjacent gaps found while reading | Chat |

---

## 3. Required changes

### 3.1 `games.slug`

**Why.** `SquadRequest.gameId` and every tile use catalogue ids; `games.id` is a uuid (the seed uses deterministic UUIDv5 of the catalogue key, but the client has no clean way to know it).

```sql
alter table public.games add column slug text;
-- backfill from the catalogue key in scripts/generate-seed.mjs, then:
alter table public.games alter column slug set not null;
create unique index games_slug_key on public.games (slug);
```
`scripts/generate-seed.mjs` must emit `slug` (it already knows the key it hashes). Synthetic family/anchor rows (`is_selectable = false`) have no catalogue id — the generator hashes `game-family:<baseId>` for them — so their slug is defined as the `baseId` itself (e.g. `tarkov-eft`), which cannot collide with a version slug such as `tarkov-eft-pvp`. If the migrations have never been applied anywhere, put `slug text not null unique` straight into the `games` table definition instead of adding it afterwards.

### 3.2 Profiles keyed by base game

**The mismatch.** In the UI, answers are stored under `gameKey(game) = game.baseId ?? game.id` — "Tarkov PvP" and "Tarkov PvE" share **one** profile and one in-game username. In the DB, `game_profiles.unique (user_id, game_id)` points at `games.id`, which is the per-version row, so PvP and PvE would get separate profiles. Worse, `game_profiles_select` and `accept_squad_request` compare `squad_requests.game_id` / `allies.game_id` to `game_profiles.game_id`; if profiles live on the base/anchor row but requests and allies on the version row, **no inbound sender profile is ever visible** and acceptance records a null username.

**Recommendation.** `game_profiles.game_id` always references the *base* game (`coalesce(base_game_id, id)`), matching the UI. Requests, allies and **presence** keep the **version** row (see §3.8 — PvP and PvE searchers must not be merged). Add a helper and use it wherever a version row is matched to a profile:

```sql
create function public.base_game_id(p_game_id uuid) returns uuid
language sql stable set search_path = public as $$
  select coalesce(g.base_game_id, g.id) from public.games g where g.id = p_game_id
$$;
```
Add a trigger (like `enforce_reference_data_on_base_game`) rejecting a `game_profiles` row whose game is not a base game.

**Profile visibility (tightened).** Today `game_profiles_select` also exposes a profile to (a) anyone who sent you a request, in *any* status, and (b) anyone you sent a request to once accepted. Clause (a) hands the recipient the sender's whole row — including `user_id` — which D3 forbids, and it keeps working after a decline or block. Replace the policy with:

```sql
-- own row, or an ally's row for that base game, unless either side has blocked the other
using (
  user_id = auth.uid()
  or public.is_ally_for_profile(user_id, game_id)   -- security definer: exists allies row, base_game_id(a.game_id) = game_id, and not is_blocked
)
```
Pre-acceptance, the recipient sees the sender's answers **only** through the card function in §3.5, which never returns `user_id`. Post-acceptance the ally clause covers both directions (accept creates both ally rows), so the "accepted outbound" clause is redundant and is dropped.

**Profile deletion.** `game_profiles_delete_own` lets a sender delete their profile while a request is pending, leaving a ghost request that cannot be shown or accepted. Add an `after delete` trigger that sets that user's `pending` outbound requests to `withdrawn` (never deletes them, §3.4) where `base_game_id(game_id)` equals the deleted profile's `game_id`.

**New columns the UI already collects but `game_profiles` cannot store:**

```sql
alter table public.game_profiles
  add column no_maps boolean not null default false,        -- "None — I don't know any maps yet" (gamesmanship.noMaps)
  add column specific_answers jsonb not null default '{}';  -- game-specific extras, keyed by question id (faction, raidBudget, riskTolerance, lootPriority, …)
```
Neither is used in scoring or the breakdown today, but a profile saved without them loses data the form shows. `specific_answers` is intentionally jsonb: the question set differs per game and per category (`GAME_SPECIFIC_QUESTIONS`).

**Array hygiene.** `weapons`, `maps`, `roles`, `personality`, `languages` are free `text[]`. Add a check (or trigger) that each has unique elements and a bounded `cardinality` (e.g. ≤ 100). This keeps the server-side scorer (§3.6) in parity with the browser one and stops oversized payloads from being returned by discovery. Validating against `game_reference_data` is optional. A `check` cannot contain a subquery, so put the unique-elements test in an `immutable` helper function (`cardinality(a) = (select count(distinct x) from unnest(a) x)`) and call that from the check.

**Free-text limits.** `in_game_username` is shown to strangers and `chat_messages.content` is delivered to them; both are unbounded `text` today. Add `check (char_length(in_game_username) between 1 and 40)` (and no control characters) and `check (char_length(content) between 1 and 2000)`.

Column ↔ UI mapping (all other columns already exist and fit): `skill`, `rage` stored 0–10 (UI keeps 0–100 internally and divides by 10); `role_match_preference` ↔ `roleMatchPreference`; `willing_to_chat/speak` ↔ the comms slider; `languages`, `personality`, `weapons`, `maps`, `roles`, `platform`, `in_game_username` unchanged.

### 3.3 Blocks: `user_blocks`

**Why.** Blocks are currently stored in two places the blocked party can read: `squad_requests.status = 'blocked'` (sender has select access) and `allies.rating = 'blocked'`. Combined with Realtime and error messages that makes D2 ("a blocked sender must not learn they were blocked") unenforceable. `is_blocked(uuid, uuid)` is also `security definer`, takes arbitrary ids and is executable by any role, so anyone can ask whether any two users have a block between them.

```sql
create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  label text,                       -- snapshot of the blocked player's in-game name, for the blocker's own "blocked list"
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;   -- no direct access; definer RPCs only
```
- **Account-wide**, as today. A block is a row here and nowhere else.
- `is_blocked(a, b)` is rewritten to read `user_blocks` in either direction and **loses its client grant** (`revoke … from public, anon, authenticated`). Triggers and definer functions call it; clients never do.
- **Request status.** The `blocked` value of `request_status` is no longer used. Decline & Block sets the request to `declined` **and** inserts a `user_blocks` row in one transaction (`on conflict (blocker_id, blocked_id) do nothing`, so repeating it is harmless). (If the migrations have never been applied, remove `blocked` from the enum; otherwise leave it unused.)
- **Allies.** `ally_rating` loses `blocked` the same way (see §3.10).
- **Directional helper.** `is_blocked(a, b)` is symmetric and is for *eligibility* checks (who may contact whom). Anything that decides what one specific reader may *see* uses a directional `has_blocked(blocker, blocked)` helper (definer, no client grant) so that a block removes only the blocker's view of the blocked player, never the reverse (§3.10 chat).
- **Block cancels pending requests.** Every block (all three entry points) also resolves the pair's `pending` requests in the same transaction: those where the blocker is the **recipient** become `declined` (exactly what a plain decline produces); those where the blocker is the **sender** become `withdrawn`. Without this the blocker's outbound requests sit `pending` forever and count against the pending cap (§3.4).
- RPCs (all recipient/owner-scoped, definer, no anon): `decline_and_block_squad_request(p_request_id)`, `block_ally(p_ally_id)` (by `allies.id`, since user ids are not available pre-acceptance), `get_my_blocks()` (returns `block_id`, `label`, `created_at` — never the user id), `unblock_user(p_block_id)`.
- **Unblock exists** (the first draft made Decline & Block permanent with no undo). Unblocking restores normal visibility; it does not resurrect declined requests, which follow the usual cooldown.

### 3.4 Request state machine and surfaces

Found while reading the policies against the new Accept / Decline / Decline & Block buttons:

1. **Accept can be bypassed.** `squad_requests_update_recipient` lets the recipient `UPDATE` *any* column value, and `guard_squad_request_immutable` only protects the three id columns. A recipient can set `status = 'accepted'` directly, skipping `accept_squad_request` — no ally rows, no chat — or flip `declined → pending`. The rule "accepting happens only via the RPC" exists in comments but is not enforced.
2. **No re-request path.** `unique (sender_id, recipient_id, game_id)` plus no update path for the sender means a declined request can never be sent again, but the UI promises "Declined requests are hidden for 1 hour."
3. **Both sides can read each other's user id** from `squad_requests` (and the `select *` views over it), contradicting D3.

**Changes.**
- **Lock the table.** `revoke all on public.squad_requests from anon, authenticated;` RLS stays enabled as defence in depth, but clients no longer touch the table: every read and write goes through definer functions. This also removes the first draft's reliance on column-level grants, which would have broken the `select *` views and may not be honoured by Realtime. Drop the `my_inbound_squad_requests` / `my_outbound_squad_requests` views (they are `select *`); `squad_requests_insert`, `_update_recipient` and `_delete_sender` policies are dropped with them.
- **Status values.** `request_status` becomes `pending | accepted | declined | withdrawn | ended` (`blocked` removed, §3.3). `withdrawn` = the sender took it back (or blocked the recipient); `ended` = the ally relationship was removed (§3.10).
- **Transition guard.** Keep a trigger as a second layer. Allowed: `pending → accepted | declined | withdrawn`; `accepted → ended`; and re-open `declined | withdrawn | ended → pending` (only from `send_squad_request`, below). Everything else raises. With direct DML revoked, the first draft's `set_config` "called-from-RPC" flag is unnecessary and is dropped.
- **Pair uniqueness (race fix).** `unique (sender_id, recipient_id, game_id)` is directional, so A→B and B→A can both be `pending` after two simultaneous sends, and accepting both creates two chats. Add a partial unique index on the **unordered** pair:
  ```sql
  create unique index squad_requests_active_pair_idx
    on public.squad_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id), game_id)
    where status in ('pending', 'accepted');
  ```
  `send_squad_request` also takes `pg_advisory_xact_lock` on the sender (§0 rule 8) before evaluating the caps, and translates a unique violation into the same generic "no longer available" error.
- **Pending requests expire.** A `pending` request whose `last_sent_at` is older than **14 days** is treated as expired by every read function, by the pending cap and by the eligibility check; `send_squad_request` may re-send over it (it counts as a re-send). Correctness never depends on a purge job. Without this, requests to people who never return accumulate and eat the sender's pending cap forever.
- **RPCs** (definer, recipient-only, pending-only, no anon): `accept_squad_request(p_request_id)` (§3.6), `decline_squad_request(p_request_id)`, `decline_and_block_squad_request(p_request_id)` (§3.3). The UI's three buttons map 1:1 to the three RPCs. `accept_squad_request` additionally **requires the recipient to have a complete profile** for the game's base game, and raises a clear error if not (today a missing recipient profile surfaces as a not-null violation on `ally_gaming_user_id`). It also re-checks `is_blocked(sender, recipient)` and raises the same generic "no longer available" error, since the recipient may have blocked the sender through another request after this one was sent.
- **`withdraw_squad_request(p_request_id)`** replaces the sender-delete policy (sender-only, pending-only). It sets `status = 'withdrawn'`; it **never deletes the row**. Deleting would reset the per-pair counters and let a sender loop send → withdraw → send, re-notifying the recipient each time.
- **Request log.** `public.squad_request_events (id, request_id, sender_id, recipient_id, game_id, sent_at default now())`, no client privileges, one row inserted by `send_squad_request` for every send **and every re-open**. The caps below count from this table (and `squad_requests.last_sent_at` is set from the same `now()`); the columns on `squad_requests` alone cannot support a rolling 24-hour count, because a re-opened row keeps its `created_at`.
- **Read functions.**
  - Recipient: `get_my_pending_request_cards()` (§3.5).
  - Sender: `get_my_outbound_requests()` returns `request_id`, `game_id`, `game_slug`, `status` (`pending | accepted | declined | expired` — never anything else; `withdrawn` and `ended` rows are omitted), `created_at`, `match_ref` (the recipient's per-game profile reference, §3.7). **No `recipient_id`.** A declined-and-blocked request is indistinguishable from a plain decline.
- **`send_squad_request(p_game_id uuid, p_match_ref uuid)`** is the **only** way to create a request. `p_game_id` is the **version** the sender was browsing; the function checks that `base_game_id(p_game_id)` equals the candidate profile's game (otherwise `squad_requests.game_id` would end up on a non-selectable anchor row). It must:
  - reject self; require the caller to have a complete profile for the base game;
  - apply the same eligibility rules as discovery (§3.7) — already allies, unexpired pending/accepted either way, candidate offline or `match_ref` unknown — and return **one generic error** ("This player is no longer available") for any of them. This also fixes the existing trigger text "…have a block between them", which leaks;
  - **blocked pairs are shadow-declined, not rejected (D7).** If either side has blocked the other, the function does **not** raise. It behaves exactly as the normal path would for a request the recipient then declines: it applies the same cooldown and cap checks, writes the same `squad_request_events` row, and creates or re-opens the `squad_requests` row but leaves it `declined`, sends **no** broadcast and appears in **no** card list for the recipient. Its `declined_at` is set to a random time 1–30 minutes in the **future**, and `get_my_outbound_requests` reports a `declined` row as `pending` until `declined_at` passes — so, like a normal send, it reads `pending` at first and flips to `declined` when a (plausible) human-length delay has elapsed. (Reading `declined` instantly would itself be a block signal.) The cooldown check uses `declined_at`, so the future value also covers the cooldown. Without this, replaying a `match_ref` taken from `get_my_outbound_requests` after the cooldown would return success for a plain decline and an error for a block — a deterministic block oracle, independent of discovery;
  - handle the cooldown: re-open a `declined` row to `pending` only if `declined_at < now() - interval '1 hour'`. Inside the cooldown the function raises the **same generic error** as above, **not** a distinct "declined recently" message — otherwise a block (which would otherwise short-circuit earlier) and a plain decline would differ by error text. The UI already knows the request is declined from `get_my_outbound_requests` and can show its own friendly text;
  - **abuse limits (D9)**, all counted from `squad_request_events` / current rows, never from client input: at most 20 unexpired `pending` outbound requests per sender; at most 50 sends-plus-re-opens per sender per rolling 24 h; at most 3 re-opens per `(sender, recipient, game)` per rolling 30 days. Hitting a limit raises a friendly, distinct error — it depends only on the caller's own activity, so it reveals nothing about the recipient. Shadow-declined sends count toward every limit like any other.
- **`declined_at timestamptz`** on `squad_requests` (set by the decline RPCs and by the shadow-decline path) instead of reusing `updated_at`, so an unrelated later update cannot reset the 1-hour clock. It is no longer optional. **`last_sent_at timestamptz not null default now()`** is set on insert and on every re-open (drives expiry).

*UI note (not DB):* `AppContext.declineAndBlockSquadRequest` currently calls `blockUser(id)` with the **request** id, not a user id. When wired to the RPC this disappears.

### 3.5 Inbound-notification cards

The first draft used a `security_invoker` view over `squad_requests` and `game_profiles`. That cannot work now that clients cannot read `squad_requests` and profile rows are not visible pre-acceptance. Use a definer function instead, which also lets the sender's `user_id` stay out of the result:

```sql
create function public.get_my_pending_request_cards()
returns table (
  request_id uuid, created_at timestamptz,
  game_id uuid, game_slug text, game_name text, category game_category,
  sender_username text,
  weapons text[], maps text[], roles text[], skill numeric, role_match_preference numeric,
  rage numeric, personality text[], willing_to_chat boolean, willing_to_speak boolean, languages text[],
  sender_status text                         -- 'searching' | 'online' | 'offline' (§3.8)
)
language sql stable security definer set search_path = public as $$
  select …
  from squad_requests sr
  join games g          on g.id = sr.game_id
  join game_profiles gp on gp.user_id = sr.sender_id and gp.game_id = base_game_id(sr.game_id)
  where sr.recipient_id = auth.uid()
    and sr.status = 'pending'
    and sr.last_sent_at > now() - interval '14 days'      -- expiry (§3.4)
    and not is_blocked(sr.sender_id, sr.recipient_id)
$$;
revoke all on function public.get_my_pending_request_cards() from public, anon;
grant execute on function public.get_my_pending_request_cards() to authenticated;
```
The inner join is safe because profile deletion cancels pending requests (§3.2), so the bell count (also taken from this function, or `count_my_pending_requests()`) and the cards cannot drift apart. The per-tab and per-game counts are derived client-side from this list (volumes are small).

The **recipient's own** profile for the same base game (needed for scoring in the browser) is a plain `select` on `game_profiles` (own row — allowed).

### 3.6 Server-side match score

**Why.** Both Accept paths pass `calculateMatch(...)` from the browser into `accept_squad_request(p_match_score)`. The value is stored on **both** ally rows and shown to the *other* player as their match %; a recipient could pass `100`. The function also has no range check.

**Recommended.** Port `lib/matching.ts` to a SQL function and make it the source of truth for anything stored or ranked:

```sql
create function public.calculate_match(a public.game_profiles, b public.game_profiles)
returns table (overall int, gamesmanship int, vibe_check int, comms int)
language sql immutable ...;
revoke all on function public.calculate_match(public.game_profiles, public.game_profiles) from public, anon;
```
- `accept_squad_request(p_request_id)` drops the `p_match_score` parameter and computes the score from the two profiles. The score is symmetric (every component is), so one stored value on both ally rows is correct.
- Keep `lib/matching.ts` for the on-screen breakdown. Add **parity test vectors** (a shared JSON of profile pairs → expected scores) run against both implementations. Known traps:
  - `overall` is computed from the **unrounded** sub-scores, not from the displayed rounded ones.
  - Use `float8` with the **same operation order** as `lib/matching.ts`, and emulate `Math.round` as `floor(x + 0.5)`. Do **not** use `round()` on `float8` (it rounds half to even, JS rounds half up) and do **not** use `numeric` either: `numeric` is exact decimal arithmetic while JS is binary floating point, so the two can land on opposite sides of a `.5` tie (e.g. `(g + v + c) / 3`). Same IEEE arithmetic on both sides is what gives identical results. Cast `skill`, `rage` and `role_match_preference` (`numeric(3,1)`) to `float8` on entry.
  - `roleMatchPreference ?? 5` ↔ `coalesce(role_match_preference, 5)`; empty-union roles → 50; empty-union Jaccard → 0.
  - JS `intersection` does not de-duplicate (`['x','x']` vs `['x']` scores 200 %); the unique-elements check in §3.2 removes the case, and the parity vectors should include it.
- *Minimum fallback if porting is deferred:* keep the parameter but `check (match_score between 0 and 100)` and document that the stored score is client-asserted.

### 3.7 Anonymous discovery for `/squad-matches`

**Problem.** The squad-matches popup shows a stranger's answers. Current RLS makes that impossible, correctly: `game_profiles_select` only exposes your own, your allies' (and, in the old policy, inbound senders' and accepted recipients') rows. And widening that policy is **not** an option — it returns whole rows, including `in_game_username` and `user_id`, which must stay hidden until acceptance.

**Change.** A security-definer function returns candidates with **answers but no identity**, and the client can only act on a candidate through an opaque per-game reference:

```sql
create function public.find_squad_matches(
  p_game_id uuid,                 -- the VERSION tile being browsed
  p_include_online boolean default false,
  p_limit int default 50)         -- clamped server-side to 1..50
returns table (
  match_ref uuid,                 -- candidate's game_profiles.id: random, per base game, NOT the user id
  weapons text[], maps text[], roles text[], skill numeric, role_match_preference numeric,
  rage numeric, personality text[], willing_to_chat boolean, willing_to_speak boolean,
  languages text[], platform text,
  status text,                    -- 'searching' | 'online' (§3.8)
  score int)                      -- calculate_match(me, candidate), for ordering
language sql stable security definer set search_path = public ...;
```
It must **never** return `user_id` or `in_game_username`, and:
- **requires the caller to have a complete profile** for `base_game_id(p_game_id)` (without it the function would hand every searching player's answers to any signed-in account, and could not score);
- **requires the caller to be searching this version** (a fresh `lfg_presence` row for `p_game_id`, §3.8). This matches the shipped behaviour — `useAnnounceLooking` tracks presence for as long as `/squad-matches` is mounted, which becomes `start_searching` on mount and `stop_searching` on unmount — and it stops a non-participant from scraping answers by calling the function in a loop;
- clamps `p_limit` (hard cap 50) so it cannot be used to dump the player base, and is **rate-limited per caller** (suggest 20 calls/minute, counted in a small definer-only `api_rate_limits` table). The clamp alone does not stop a caller from editing their own answers between calls to reshuffle the top-50;
- excludes: yourself; anyone for whom `is_blocked(me, them)` in **either** direction; people you are already allies with for the game; pairs with an unexpired `pending` or an `accepted` request either way; people who declined you within the cooldown; offline players always; and players who are `online` but not `searching` unless `p_include_online` is true (the renamed "also show players who are online" toggle, D6);
- considers a player `searching` only if they have a fresh `lfg_presence` row for **this version** `p_game_id`; "online but not searching" means a fresh `user_presence` row **and** a profile for the base game.

**Block exclusion is symmetric and permanent (D2):** if either side blocked the other, neither ever appears in the other's results. **Residual leak (D7, discovery only):** decliners reappear in discovery after the cooldown while blockers never do, and `match_ref` is stable, so a sender who remembers "Match 02" could infer a block from the *list*. The deterministic version of this leak — replaying a `match_ref` against `send_squad_request` — is closed by the shadow-decline in §3.4. Options for the remaining list-based inference are in D7.

`send_squad_request(p_game_id, p_match_ref)` (§3.4) resolves `match_ref → user_id` internally.

**Why `match_ref` and not the user id.** It lets the sender act on a candidate without ever holding an account identifier (D3). It is **not** full anonymity against a determined observer: the answers themselves (languages, personality, platform) can fingerprint a player across games, especially in a small pool. This is accepted under D1; the profile-visibility opt-out noted there is the lever if it becomes a problem.

### 3.8 Presence

Today presence is **only** Supabase Realtime (`lib/useLookingPresence.ts`): ephemeral, per tab, readable by anyone on the channel, and invisible to SQL. That cannot drive server-side filtering (§3.7), the sender status on notification cards, or ally status dots.

**SF cannot know whether someone is in a game (D6).** The only things it can observe are whether the player is in SF and whether they are actively looking for a squad. So there are exactly three statuses: `searching` (actively looking for a squad in this game), `online` (in SF, not searching), and `offline` (no fresh heartbeat; no row needed). The old `ingame` status and `statusGame` field go away.

Two tables, because "online" is global and "searching" is per game:

```sql
create table public.user_presence (          -- global: "this account has SF open"
  user_id uuid primary key references public.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
create table public.lfg_presence (           -- per VERSION tile: "actively searching"
  user_id uuid primary key references public.users (id) on delete cascade,   -- one search at a time (D9)
  game_id uuid not null references public.games (id) on delete cascade,      -- the version tile, NOT the base game
  last_seen_at timestamptz not null default now()
);
alter table public.user_presence enable row level security;
alter table public.lfg_presence  enable row level security;
revoke all on public.user_presence, public.lfg_presence from anon, authenticated;   -- RPC-only
```
- **No client write path.** The first draft's `for all using (user_id = auth.uid())` policy would let a client write `last_seen_at = '2099-…'` and stay "searching" forever, or hold searches in many games. Instead: `heartbeat()` (upserts `user_presence` and bumps the caller's `lfg_presence` row **only if that row is still fresh**), `start_searching(p_game_id)` (selectable version rows only; caller must have a profile for its base game; replaces any previous row), `stop_searching()`. All use `now()`. The "only if still fresh" condition matters: a user who closes the tab and reopens it hours later would otherwise have a stale search silently revived by the first heartbeat and appear as "searching" without choosing to. A reopened `/squad-matches` page calls `start_searching` again, as on first mount.
- **Freshness.** A row counts if `last_seen_at > now() - interval '3 minutes'`; heartbeat every ~45 s while the tab is visible. (Background tabs throttle timers, so a 2-minute window with a 60-second heartbeat is too tight.) **Correctness never depends on a purge job** — all reads filter on freshness; a scheduled delete is housekeeping only.
- **Indexes.** `create index lfg_presence_game_fresh_idx on public.lfg_presence (game_id, last_seen_at)` (serves `count_searching_by_game()` and discovery) and `create index user_presence_last_seen_idx on public.user_presence (last_seen_at)`. Heartbeats are frequent single-row updates; give both tables a lowered `fillfactor` (e.g. 70) so they stay HOT updates.
- **Per version, not per base.** PvP and PvE are different modes with different squads, so `lfg_presence.game_id` is the version row; profile lookups still go through `base_game_id`. Tile counts, discovery and card status therefore agree on what "this game" means.
- **Other people's presence is never read from the tables directly.** It is exposed only through definer functions that apply the same visibility rules as profiles (inbound senders, allies, discovery candidates), returning status — not identity.
- **Tile counts (D4):** `count_searching_by_game()` returns `(game_id, n)` for every version in **one** call (not one call per tile), counting players with a fresh `lfg_presence` row. The tile count is "players searching", **not** "players you could match": it includes you and excludes none of the people discovery hides for you (blocked, allies, pending, cooldown), so the number can be higher than the list. The UI should label it accordingly rather than promise they match. Realtime presence is retired for counting; if the count feels laggy a broadcast can be layered on later.
- **Ally status dots** come from `get_my_allies()` (§3.10).

### 3.9 Live updates and indexes

- **Do not add `squad_requests` to the `supabase_realtime` publication.** Row-based Realtime would deliver the whole row, including both user ids, to whoever passes RLS, and it cannot be filtered to a function result. Instead, a trigger on `squad_requests` (and later `allies`, `chat_messages`) publishes a **minimal broadcast** — `{ kind: 'request_received' | 'request_updated', request_id }` — to a **private per-user topic** (`user:<uid>`), using Supabase's database-to-Realtime broadcast (`realtime.send`) with an RLS policy on `realtime.messages` restricting each user to their own topic (verify against current Supabase docs when implementing). The policy is **`select`-only** for `authenticated` (`realtime.topic() = 'user:' || auth.uid()::text`) with **no insert policy**, so a client can receive on its own topic but cannot broadcast to anyone else's. The trigger function is `security definer`, has no client grant, and wraps `realtime.send` in an exception handler so a Realtime failure can never roll back the request transaction. On receipt the client re-calls the read function from §3.4/§3.5. Nothing identifying travels over the socket, a decline-and-block produces the same event the sender sees for any decline, and a shadow-declined send (§3.4) emits **no** event to the recipient.
- The badge query is "my pending inbound count"; add a partial composite index to serve it (replacing the role of the two single-column indexes for that query):
  ```sql
  create index squad_requests_inbound_pending_idx
    on public.squad_requests (recipient_id, game_id) where status = 'pending';
  ```

### 3.10 Allies and post-block behaviour

The ally card shows pin and block toggles and presence. The first draft proposed a `blocked_you` view; that is **dropped** — D2(c) says allies follow the same no-reveal principle, and nothing in the product needs the blocked party to learn this. `Ally.blockedYou` is removed from the UI.

- `get_my_allies()` (definer, no anon) returns the caller's ally rows with presence from §3.8. Presence is reported as `offline` for any ally who has blocked the caller.
- **Rating enum.** UI `pinned` ↔ `rating = 'favorite'`. UI `blocked` is no longer a rating: the card's block action calls `block_ally(p_ally_id)` (§3.3). `blocked` leaves `ally_rating`; with it gone, the "pinned and blocked at once" mismatch from the first draft disappears. The `'meh'` value is unused in the UI. `allies_delete_own` is dropped (and `delete` revoked on `allies`): it deleted only the caller's own row, leaving the other side with a live ally row (and therefore live profile access and chat) and the request stuck at `accepted`. Removing an ally goes through `remove_ally` below.
- **`remove_ally(p_ally_id)`** (definer, owner-only, no anon; D10). Removing an ally ends the relationship **for both sides**: it deletes both `allies` rows for that request and the `ally_chats` row (cascading its messages), and sets the `squad_requests` row to `ended`. Because `ended` is neither `pending` nor `accepted`, the pair becomes eligible again, but only by a fresh `send_squad_request` (re-open `ended → pending`, subject to the §3.4 caps and the 1-hour cooldown measured from the removal). Nothing is sent to the other party; their ally simply disappears from `get_my_allies()` and the same broadcast as any `request_updated` fires.
- **What a block cuts, silently (D8 — proposed default):**
  - the blocker no longer sees the blocked player in discovery or in new-request flows (§3.7), and the blocked player no longer sees the blocker;
  - neither side's live profile is readable through the ally clause (`is_ally_for_profile` includes `not is_blocked`). The **blocked** party's ally card degrades to the snapshot stored on the `allies` row (`ally_gaming_user_id`, `match_score_at_acceptance`) with status `offline` — identical to an ally who simply went offline;
  - chat, using the **directional** `has_blocked` helper (§3.3): the blocked player's messages are accepted but **not delivered** to the blocker — `chat_messages_select` hides a message from reader R when R has blocked the message's sender — instead of erroring, so the block is not revealed by a send failure. The blocker therefore also stops seeing the blocked player's earlier messages. The **blocked** player's view of the thread does **not** change: they still see the whole thread, including the blocker's earlier messages. Using the symmetric `is_blocked` here would make the blocker's messages vanish from the blocked player's screen, which is itself a block signal;
  - allies rows and chat threads are **not deleted**, so unblocking restores everything;
  - any `pending` requests between the pair are resolved at block time (§3.3).
- The existing `guard_chat_message_insert` trigger raises "cannot send message: … have a block between them"; it is replaced by the shadow-delivery rule above.

### 3.11 Chat hardening (adjacent, found while reading)

- `ally_chats_update` has no column restriction: any participant can change `squad_request_id`, not just `disappearing_messages`. Add a trigger allowing only that column to change.
- `chat_messages.expires_at` is supplied by the client (the UI sets `sentAt + 24 h` when disappearing is on). Set it in a `before insert` trigger from the chat's current `disappearing_messages`, and ignore the client value.
- Expired messages are not hidden or deleted. Add `expires_at is null or expires_at > now()` to `chat_messages_select` and a scheduled purge (`pg_cron` or the existing cron route; note Vercel Hobby cron frequency is limited, so correctness rests on the select filter, not the purge).
- `chat_messages.content` gets the length check from §3.2, and message inserts are rate-limited per sender (suggest 30/minute, same `api_rate_limits` mechanism as §3.7).
- Chat access currently derives from `squad_requests` participants via subqueries in `ally_chats_*` / `chat_messages_*` policies. With `squad_requests` locked (§3.4) these become `is_chat_participant(chat_id)` definer helpers (§0 rule 4): the caller is a party to the underlying request **and** its status is `accepted`. Together with `remove_ally` (§3.10, D10), which deletes the chat and sets the request to `ended`, chat access can no longer outlive the ally relationship.

---

## 4. Decisions

| # | Question | Decision | What it means for the DB |
|---|---|---|---|
| D1 | Are a player's answers visible, anonymously, to everyone searching the same game (as the squad-matches popup does)? | **Yes, as built.** | `find_squad_matches` returns answers but never user id or username. Add a profile-visibility opt-out column later if wanted. The privacy policy (`app/privacy`) must say that answers are shown anonymously to other players searching the same game. |
| D2 | Does a blocked sender learn they were blocked? | **No. The sender sees the request as "declined". The blocked user must also never be able to send a request to that player, because that player will not appear on their screen.** | (a) Blocks live in `user_blocks` (§3.3), which the blocked party cannot reach; the request itself is simply `declined`. (b) `find_squad_matches` never returns a pair where either side blocked the other, in both directions, permanently; `send_squad_request` shadow-declines such a pair (looks like a quick decline, notifies no one, §3.4) rather than rejecting it, so replaying a `match_ref` is not an oracle. (c) `is_blocked` has no client grant. (d) No Realtime payload, view, ordering or error text distinguishes a block (§0 rule 6). (e) Allies follow the same principle (§3.10, D8). |
| D3 | Can the sender read the recipient's user id on outbound requests? | **Hide it** (both directions, pre-acceptance). | Clients have no privileges on `squad_requests`; reads go through functions that omit ids (§3.4, §3.5); inbound sender profiles are visible only via the card function (§3.2). The first draft's column-level-grant approach is replaced: it would have broken the `select *` views and may not be honoured by Realtime. |
| D4 | Presence storage: table only, or table plus Realtime? | **Table only.** The player count is the number of players actively searching. | `lfg_presence` (per version) and `user_presence` (global) are the single source of truth for counts, discovery and card status (§3.8). Count = fresh `lfg_presence` rows. |
| D5 | Live sender profile or a snapshot at send time? | **Live.** | No `profile_snapshot` column. Revisit if score-gaming appears. |
| D6 | `notifications_enabled` default vs the UI toggle; what does "in-game" mean? | **SF cannot detect in-game.** Statuses are `searching`, `online` and `offline`. The toggle becomes "also show players who are online but not searching", default off. | `users.notifications_enabled` is replaced in meaning by a persisted `show_online_players boolean not null default false` (rename in place while the migrations are unapplied; otherwise add the new column and drop the old one). Drop `ingame` and `status_game` everywhere. |

### New decisions proposed by the reviews (need sign-off)

| # | Question | Proposed default | Alternatives |
|---|---|---|---|
| D7 | A block must not be inferable by the sender. Two channels: (1) **replaying a `match_ref` against `send_squad_request`** after the cooldown — a plain decline re-opens, a block would error; (2) **the discovery list** — decliners reappear after the cooldown, blockers never do, so a sender who remembers "Match 02" can infer a block. | (1) **Close it:** blocked pairs are shadow-declined inside `send_squad_request` (§3.4). This does not contradict D2's "will not appear on their screen": discovery still hides the blocker. (2) **Accept for beta** and document as a known residual; it needs the sender to remember a player across sessions. | For (2): (a) hide decliners from that sender permanently too (changes the "hidden for 1 hour" promise); (b) rotate `match_ref` per request or per day; (c) let blockers reappear in discovery and shadow-decline on send (changes D2's screen promise). |
| D8 | After a block between existing allies, what does the blocked party experience? | **Silent degradation** (§3.10): snapshot ally card, status `offline`, messages accepted but not delivered to the blocker; the blocked player's own view of the thread does not change. | Visible "unavailable" state, or hard-delete the ally relationship (loses the unblock-restores-everything behaviour). |
| D9 | Searching scope and abuse limits. | A player **searches one game at a time**; max 20 unexpired pending outbound requests; max 50 sends-plus-re-opens per rolling 24 h; max 3 re-opens per `(sender, recipient, game)` per rolling 30 days; pending requests expire after 14 days; `find_squad_matches` 20 calls/minute; chat 30 messages/minute. | Searching in several games at once (change `lfg_presence` PK to `(user_id, game_id)`); different numbers. |
| D10 | What does "remove ally" do? | **Ends the relationship for both sides** (§3.10): both ally rows and the chat are deleted, the request becomes `ended`, and re-contact needs a fresh request under the normal caps and cooldown. | Keep chat history readable to both after removal; or make removal one-sided (the other side keeps their ally row, which also keeps live profile access — not recommended). |

### UI follow-ups implied by these decisions (not DB work, listed so they are not missed)

- Remove the `ingame` status and `statusGame` from `MatchStatus`, `MatchPlayer`, `Ally`, `SquadRequest` and `IncomingRequest` (`lib/types.ts`), and from the mock data (`lib/mockData.ts`) and the ally, chat, incoming-request, notification and match components that render them.
- Remove `Ally.blockedYou` and any "they blocked you" UI. Remove any `blocked` request status from the UI types; a blocked request reads as `declined`.
- `MatchCard` / `AlliesPanel`: the green "Live — {game}" label becomes "Online"; "Searching" stays.
- `/squad-matches`: change the toggle text "Show players currently in-game (notifications on)" to match the new meaning, and update all 10 translations.
- The tile "N looking" count must count only `searching` players, per version tile, and its wording should not imply the list will contain that many people (§3.8). Confirm `useLookingPresence` semantics when it is moved to the tables.
- `declineAndBlockSquadRequest` should pass the sender, not the request id, until it is wired to the RPC; the card's block action on allies calls `block_ally`; add a "blocked players" list backed by `get_my_blocks()` / `unblock_user`.
- Handle a missing `match_ref` / generic "no longer available" error from `send_squad_request` as a normal state, not a crash.
- Heartbeat interval ~45 s and `start_searching` / `stop_searching` replace the Realtime presence track/untrack calls (`useAnnounceLooking` → `start_searching` on mount, `stop_searching` on unmount).
- Accept must handle "you need a profile for this game first" by routing the recipient to the questionnaire; `accept_squad_request` now refuses without one.
- Outbound request UI: handle the `expired` status (offer "send again"), and show the 20-pending / daily / per-pair limit errors as friendly messages. The "declined recently" text is now UI-owned (the RPC returns the generic error inside the cooldown).
- Ally card: wire "Remove ally" to `remove_ally`; it deletes the chat for both sides (D10), so confirm before calling.
- Not in scope here but worth a ticket: there is no abuse-report path (free-text usernames and chat are shown to strangers; only block exists).

---

## 5. Suggested migration order

**What was built.** The original five migrations are untouched; the changes are eight new migrations layered on top. This was chosen over folding the spec into the old files because the repo's `.env.local` points at a real Supabase project and the daily cron already writes to it, so the old files may already be applied; layering works whether or not they were. `supabase/tests/upgrade.mjs` proves the new migrations also upgrade a database holding legacy-shaped data (version-row and duplicate profiles, `blocked` statuses and ratings, opposite pending requests, dirty values). Each step only references objects from earlier steps.

1. `20261031000100_slug_and_profile_base_game.sql` — §3.1, §3.2 (base-game profiles, visibility policy, array/text checks, new columns), §0 rule 3 revokes on existing tables. Existing games get a placeholder `legacy-<uuid>` slug; **re-run the regenerated `supabase/seed.sql`** to overwrite it with the catalogue key.
2. `20261031000200_match_scoring.sql` — §3.6 `calculate_match` (float8, `floor(x + 0.5)`), with parity tests against `lib/matching.ts`.
3. `20261031000300_presence.sql` — §3.8, plus D6: `users.notifications_enabled` renamed to `show_online_players`, default false (existing values reset). Moved before the state machine because the card function reports a sender's status.
4. `20261031000400_blocks.sql` — §3.3 table, `is_blocked` rewrite, `has_blocked`, `get_my_blocks`, `unblock_user`; carries old `blocked` statuses/ratings into `user_blocks`; `ally_rating` loses `blocked`; §0 rule 2 revokes on the pre-existing functions.
5. `20261031000500_request_state_machine.sql` — §3.4 and §3.5 in full, including `send_squad_request`, the block *actions* (`decline_and_block_squad_request`, `block_ally`, `apply_block`), the profile-delete trigger, and — moved up from §3.11 — `is_chat_participant` with the rewritten chat policies. Those policies subquery `squad_requests`, so they had to change in the same migration that locks it.
6. `20261031000600_discovery.sql` — §3.7 `find_squad_matches`, `api_rate_limits`.
7. `20261031000700_live_updates_and_indexes.sql` — §3.9.
8. `20261031000800_allies_and_chat.sql` — §3.10 (`get_my_allies`, `remove_ally`, `allies_delete_own` dropped), §3.11 (column lock, server-set `expires_at`/`sent_at`, rate limit, length check, directional shadow delivery via `chat_message_visible`, `purge_expired_chat_messages`).

**UI wiring must ship with step 5.** Direct inserts/updates/selects on `squad_requests` and the `my_*_squad_requests` views stop working there, and `accept_squad_request` changes signature. (Today the app's request flow is mock-data only, so nothing in the running UI breaks, but the wiring has to be written against these RPCs.)

**Differences from the design above**
- `has_blocked`, `is_blocked` and `can_contact` have no client grant, so policies cannot call them. Policies call wrappers that use `auth.uid()` as the reader (`is_chat_participant`, `chat_message_visible`, `is_ally_for_profile`), which cannot be used to probe other people's blocks.
- `ended` requests also set `declined_at` so `remove_ally` starts the same one-hour cooldown.
- Shadow-declines are future-dated (see §3.4) rather than instantly `declined`.
- Pre-existing trigger functions and every new internal function have `EXECUTE` revoked from `public`, `anon` and `authenticated`; `supabase/tests/run.mjs` asserts the exact list of client-callable functions.
- `pgcrypto` is created by the original schema migration in `public`; nothing here uses it (`gen_random_uuid()` is core Postgres), so it could be dropped from that migration.

**Not verified against a real Supabase project:** the tests run on PGlite with stubbed `auth.uid()`, roles and `realtime.send`. Before relying on this, apply the migrations to a scratch project and confirm `realtime.send` / the `realtime.messages` policy against the current Supabase docs.

**Tests to write alongside (not just happy-path):**
- Privileges: for **every** RPC, view and table, call as `anon` and as an unrelated `authenticated` user; `is_blocked` is not callable by clients at all.
- RLS: user B can never read user A's `in_game_username` or `user_id` before acceptance; `find_squad_matches` output contains neither; a blocked pair appears in neither direction of discovery; a caller without a profile gets nothing from discovery; `p_limit` is clamped.
- D2 no-leak: a sender cannot distinguish block from decline via the outbound function, `send_squad_request` (**replaying a stored `match_ref` both inside and after the cooldown must give identical results for a plain decline and a block**, including error text and the `squad_request_events` count), the Realtime broadcast payload (a shadow-decline emits none to the recipient), or chat send results. The blocked player's view of an existing thread is unchanged by a block.
- A recipient cannot reach `accepted` except through the RPC; a declined request re-opens only after the cooldown (test 59 min vs 61 min) and within the per-pair cap; a sender hitting the rate limits gets the friendly error.
- Withdraw cannot be used to dodge caps: send → withdraw → send repeatedly still hits the 24 h and per-pair limits, and each send is logged.
- Concurrency: two simultaneous `send_squad_request` calls in opposite directions for the same pair and game produce one `pending` row and one generic error; concurrent calls from one sender cannot exceed the pending cap.
- Expiry: a `pending` request older than 14 days is absent from `get_my_pending_request_cards()` and the bell count, does not count toward the sender's pending cap, and can be re-sent.
- Blocking cancels pending: after a block, the pair's pending requests are `declined` (blocker was recipient) or `withdrawn` (blocker was sender) and neither appears in any card list.
- `remove_ally`: both ally rows and the chat are gone, the request is `ended`, the other side loses profile and chat access, and a new request is possible only under the normal caps.
- Deleting a profile cancels that user's pending outbound requests; the bell count equals the number of cards.
- Presence: a client cannot write either presence table directly; a user is `searching` in at most one game; stale rows are ignored even if never purged, **and a heartbeat does not revive a stale `lfg_presence` row**; PvP and PvE counts are independent.
- Discovery access: a caller who is not currently searching the requested version gets nothing; the per-minute rate limit trips.
- Realtime: a user can receive on `user:<own uid>` only, cannot subscribe to another user's topic, and cannot broadcast to any topic.
- Privileges on existing tables: `anon` cannot select from `games`, `game_reference_data` or any other table.
- Score parity: the same fixture pairs (including duplicate array elements, empty arrays, null role preference, and exact `.5` rounding cases such as an `overall` of `x.5`) give identical results in SQL and `lib/matching.ts`.
- Stored match score cannot be set by the client.
- Blocking: the blocker stops seeing the blocked player's live profile and messages, and the blocked player's ally card degrades to the snapshot, as specified in §3.10; unblock restores both.

## 6. Explicitly *not* changing

- No new `notifications` table: a notification **is** an inbound pending `squad_requests` row.
- No table for score breakdowns: derived on demand from the two profiles.
- No DB support for the localhost demo seed (`MOCK_SQUAD_REQUESTS`); it is client-only and removed at launch.
